import { google } from "googleapis";
import { getOAuth2Client } from "./gmail-oauth";
import { supabase } from "./supabase";

const LOOKBACK_DAYS = 30;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface ThreadStats {
  receivedAt: Date;
  repliedAt: Date | null;
}

/**
 * Scan the last 30 days of Gmail history and calculate baseline response stats.
 * Called once during onboarding after a Gmail account is connected.
 */
export async function calculateBaseline(
  accessToken: string,
  userId: string,
  emailAddress: string,
): Promise<void> {
  const auth = getOAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - LOOKBACK_DAYS * 24 * 3_600_000);
  const afterEpoch = Math.floor(periodStart.getTime() / 1000);

  // Fetch inbox threads from the lookback window (up to 200)
  const threads: ThreadStats[] = [];
  let pageToken: string | undefined;
  let totalReceived = 0;

  try {
    do {
      const res = await gmail.users.messages.list({
        userId: "me",
        q: `in:inbox after:${afterEpoch} -from:me`,
        maxResults: 100,
        pageToken,
      });

      const messages = res.data.messages ?? [];
      totalReceived += messages.length;

      for (const msg of messages) {
        if (!msg.id || !msg.threadId) continue;

        // Get message date
        const meta = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "metadata",
          metadataHeaders: ["Date", "From"],
        });

        const headers = meta.data.payload?.headers ?? [];
        const dateStr = headers.find((h) => h.name?.toLowerCase() === "date")?.value;
        const receivedAt = dateStr ? new Date(dateStr) : new Date();

        // Check if we replied in this thread by looking for messages from "me"
        let repliedAt: Date | null = null;
        try {
          const thread = await gmail.users.threads.get({
            userId: "me",
            id: msg.threadId,
            format: "metadata",
            metadataHeaders: ["Date", "From"],
          });

          const threadMessages = thread.data.messages ?? [];
          for (const tm of threadMessages) {
            const tmHeaders = tm.payload?.headers ?? [];
            const tmFrom = tmHeaders.find((h) => h.name?.toLowerCase() === "from")?.value ?? "";
            const tmDate = tmHeaders.find((h) => h.name?.toLowerCase() === "date")?.value;

            // Check if this message is from us and came after the original
            if (tmFrom.toLowerCase().includes(emailAddress.toLowerCase()) && tmDate) {
              const tmReceivedAt = new Date(tmDate);
              if (tmReceivedAt > receivedAt) {
                repliedAt = tmReceivedAt;
                break; // Take the first reply
              }
            }
          }
        } catch {
          // Thread fetch failed, treat as not replied
        }

        threads.push({ receivedAt, repliedAt });
      }

      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken && totalReceived < 200);
  } catch (e: any) {
    console.error(`[baseline] Failed to scan Gmail for ${emailAddress}:`, e.message);
    return;
  }

  if (threads.length === 0) {
    console.log(`[baseline] No emails found for ${emailAddress} in last ${LOOKBACK_DAYS} days`);
    return;
  }

  // Calculate stats
  const replied = threads.filter((t) => t.repliedAt !== null);
  const missed = threads.filter((t) => t.repliedAt === null);

  // Response times in hours
  const responseTimes = replied
    .map((t) => (t.repliedAt!.getTime() - t.receivedAt.getTime()) / 3_600_000)
    .filter((h) => h > 0 && h < 720); // Ignore outliers > 30 days

  const avgResponseTimeHours =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null;

  const responseRatePct = (replied.length / threads.length) * 100;

  // Busiest day of week
  const dayBuckets = new Array(7).fill(0);
  for (const t of threads) {
    dayBuckets[t.receivedAt.getDay()]++;
  }
  const busiestDayIndex = dayBuckets.indexOf(Math.max(...dayBuckets));

  // Busiest hour of day
  const hourBuckets = new Array(24).fill(0);
  for (const t of threads) {
    hourBuckets[t.receivedAt.getHours()]++;
  }
  const busiestHour = hourBuckets.indexOf(Math.max(...hourBuckets));

  // Upsert baseline stats
  const { error: dbError } = await supabase.from("baseline_stats").upsert(
    {
      user_id: userId,
      account_label: emailAddress,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      emails_received: threads.length,
      emails_replied: replied.length,
      emails_missed: missed.length,
      avg_response_time_hours: avgResponseTimeHours
        ? Math.round(avgResponseTimeHours * 100) / 100
        : null,
      response_rate_pct: Math.round(responseRatePct * 100) / 100,
      busiest_day: DAY_NAMES[busiestDayIndex],
      busiest_hour: busiestHour,
    },
    { onConflict: "user_id,account_label" }
  );

  if (dbError) {
    console.error(`[baseline] DB insert failed for ${emailAddress}:`, dbError.message);
    return;
  }

  console.log(
    `[baseline] ${emailAddress}: ${threads.length} received, ` +
    `${replied.length} replied (${responseRatePct.toFixed(1)}%), ` +
    `avg ${avgResponseTimeHours?.toFixed(1) ?? "N/A"}h, ` +
    `busiest: ${DAY_NAMES[busiestDayIndex]} at ${busiestHour}:00`
  );
}
