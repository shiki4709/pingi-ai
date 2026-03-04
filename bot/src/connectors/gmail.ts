import { google } from "googleapis";
import { supabase } from "../supabase.js";
import { shouldReply, type EmailHeaders } from "./email-filter.js";

// Urgency thresholds (same as src/urgency.ts)
function calculateUrgency(detectedAt: Date): "red" | "amber" | "green" {
  const hoursAgo = (Date.now() - detectedAt.getTime()) / 3_600_000;
  if (hoursAgo >= 12) return "red";
  if (hoursAgo >= 4) return "amber";
  return "green";
}

// Gmail follow-ups get a one-level boost
function boostForGmail(base: "red" | "amber" | "green"): "red" | "amber" | "green" {
  if (base === "green") return "amber";
  return base;
}

function extractName(from: string): { name: string; handle: string } {
  const nameMatch = from.match(/^"?([^"<]+)"?\s*</);
  const name = nameMatch ? nameMatch[1].trim() : from.split("@")[0];
  return { name, handle: from };
}

function getHeader(
  headers: { name?: string | null; value?: string | null }[],
  name: string
): string | undefined {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? undefined;
}

export interface ConnectedAccount {
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  platform_username: string;
}

export interface GmailConnectorResult {
  userId: string;
  inserted: number;
  insertedIds: string[];
  filtered: number;
  errors: string[];
}

/**
 * Fetch unreplied emails for a single connected account
 * and insert new reply_items into Supabase.
 */
export async function fetchGmailForUser(
  account: ConnectedAccount,
  lookbackHours: number = 24
): Promise<GmailConnectorResult> {
  const result: GmailConnectorResult = {
    userId: account.user_id,
    inserted: 0,
    insertedIds: [],
    filtered: 0,
    errors: [],
  };

  if (!account.refresh_token) {
    result.errors.push("No refresh token");
    return result;
  }

  const clientId = process.env.GMAIL_CLIENT_ID ?? "";
  const clientSecret = process.env.GMAIL_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) {
    result.errors.push("Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET");
    return result;
  }

  // Build OAuth2 client with this user's tokens
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({
    refresh_token: account.refresh_token,
    access_token: account.access_token ?? undefined,
  });

  // Refresh the access token and persist it
  try {
    const { credentials } = await auth.refreshAccessToken();
    if (credentials.access_token && credentials.access_token !== account.access_token) {
      await supabase
        .from("connected_accounts")
        .update({
          access_token: credentials.access_token,
          token_expires_at: credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : null,
        })
        .eq("user_id", account.user_id)
        .eq("platform", "gmail")
        .eq("platform_username", account.platform_username);
    }
  } catch (e: any) {
    result.errors.push(`Token refresh failed: ${e.message}`);
    return result;
  }

  const gmail = google.gmail({ version: "v1", auth });

  // Fetch inbox messages not from the user within the lookback window
  const afterEpoch = Math.floor(
    (Date.now() - lookbackHours * 3_600_000) / 1000
  );

  let messageIds: string[];
  try {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: `is:inbox -from:me after:${afterEpoch}`,
      maxResults: 50,
    });
    messageIds = (res.data.messages ?? [])
      .map((m) => m.id)
      .filter((id): id is string => !!id);
  } catch (e: any) {
    result.errors.push(`Gmail list error: ${e.message}`);
    return result;
  }

  if (messageIds.length === 0) return result;

  // Check which gmail message IDs we already have as reply_items
  const externalKeys = messageIds.map((id) => `gmail-${id}`);
  const existingExternalIds = new Set<string>();
  const { data: existing } = await supabase
    .from("reply_items")
    .select("external_id")
    .eq("user_id", account.user_id)
    .eq("platform", "gmail")
    .in("external_id", externalKeys);
  if (existing) {
    for (const row of existing) existingExternalIds.add(row.external_id);
  }

  // Fetch metadata for new messages (cap at 20 per run)
  const newIds = messageIds
    .filter((id) => !existingExternalIds.has(`gmail-${id}`))
    .slice(0, 20);

  // Headers we need for filtering
  const METADATA_HEADERS = [
    "From", "Subject", "Date", "Content-Type",
    "List-Unsubscribe", "Precedence", "X-Mailer-Type", "Auto-Submitted",
  ];

  for (const msgId of newIds) {
    try {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: msgId,
        format: "metadata",
        metadataHeaders: METADATA_HEADERS,
      });

      const rawHeaders = full.data.payload?.headers ?? [];
      const from = getHeader(rawHeaders, "From") ?? "Unknown";
      const subject = getHeader(rawHeaders, "Subject") ?? "(no subject)";
      const dateStr = getHeader(rawHeaders, "Date");
      const date = dateStr ? new Date(dateStr) : new Date();
      const snippet = full.data.snippet ?? "";

      // Build filter input from headers
      const emailHeaders: EmailHeaders = {
        from,
        subject,
        contentType: getHeader(rawHeaders, "Content-Type"),
        listUnsubscribe: getHeader(rawHeaders, "List-Unsubscribe"),
        precedence: getHeader(rawHeaders, "Precedence"),
        xMailerType: getHeader(rawHeaders, "X-Mailer-Type"),
        autoSubmitted: getHeader(rawHeaders, "Auto-Submitted"),
      };

      const filterResult = shouldReply(emailHeaders, snippet);
      if (!filterResult.needsReply) {
        result.filtered++;
        console.log(
          `[gmail] Filtered gmail-${msgId} from "${from}": ${filterResult.reason}`
        );
        continue;
      }

      const { name, handle } = extractName(from);
      const urgency = boostForGmail(calculateUrgency(date));

      // TODO: Call Claude to classify context and generate draft.
      // For now, default to OPERATIONAL with empty draft.
      const context = "OPERATIONAL";
      const draftText = "";

      const priorityScore = urgency === "red" ? 8 : urgency === "amber" ? 5 : 3;

      const externalId = `gmail-${msgId}`;
      const { data: inserted, error } = await supabase
        .from("reply_items")
        .insert({
          external_id: externalId,
          user_id: account.user_id,
          platform: "gmail",
          urgency,
          context,
          priority_score: priorityScore,
          status: "pending",
          author_name: name,
          author_handle: handle,
          original_text: snippet,
          context_text: subject,
          draft_text: draftText || null,
          detected_at: date.toISOString(),
          account_label: account.platform_username,
        })
        .select("id")
        .single();

      if (error) {
        result.errors.push(`Insert ${externalId}: ${error.message}`);
      } else {
        result.inserted++;
        result.insertedIds.push(inserted!.id);
      }
    } catch (e: any) {
      result.errors.push(`Gmail message ${msgId}: ${e.message}`);
    }
  }

  return result;
}
