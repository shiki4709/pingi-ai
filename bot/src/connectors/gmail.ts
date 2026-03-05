import { google } from "googleapis";
import { supabase } from "../supabase.js";
import { shouldReply, extractDomain, type EmailHeaders } from "./email-filter.js";
import { classifyAndDraft } from "../services/drafter.js";

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

// ─── Sent-to domain whitelist ───
// Cache per user: { domains, builtAt }
// Rebuilt if older than 1 hour

interface WhitelistEntry {
  domains: Set<string>;
  builtAt: number;
}

const whitelistCache = new Map<string, WhitelistEntry>();
const WHITELIST_TTL_MS = 60 * 60_000; // 1 hour

async function getSentDomainWhitelist(
  gmail: ReturnType<typeof google.gmail>,
  userId: string
): Promise<Set<string>> {
  const cached = whitelistCache.get(userId);
  if (cached && Date.now() - cached.builtAt < WHITELIST_TTL_MS) {
    return cached.domains;
  }

  const domains = new Set<string>();

  try {
    // Fetch recent sent emails (last 90 days, up to 200 messages)
    const ninetyDaysAgo = Math.floor((Date.now() - 90 * 24 * 3_600_000) / 1000);
    let pageToken: string | undefined;
    let fetched = 0;
    const MAX_SENT = 200;

    while (fetched < MAX_SENT) {
      const res = await gmail.users.messages.list({
        userId: "me",
        q: `in:sent after:${ninetyDaysAgo}`,
        maxResults: Math.min(100, MAX_SENT - fetched),
        pageToken,
      });

      const messages = res.data.messages ?? [];
      if (messages.length === 0) break;

      // Fetch To/Cc headers for each sent message
      for (const msg of messages) {
        if (!msg.id) continue;
        try {
          const full = await gmail.users.messages.get({
            userId: "me",
            id: msg.id,
            format: "metadata",
            metadataHeaders: ["To", "Cc"],
          });

          const headers = full.data.payload?.headers ?? [];
          for (const h of headers) {
            if (h.name?.toLowerCase() === "to" || h.name?.toLowerCase() === "cc") {
              // Header value can contain multiple addresses: "a@x.com, b@y.com"
              const addrs = (h.value ?? "").split(",");
              for (const addr of addrs) {
                const domain = extractDomain(addr);
                if (domain) domains.add(domain);
              }
            }
          }
        } catch {
          // Skip individual message errors
        }
      }

      fetched += messages.length;
      pageToken = res.data.nextPageToken ?? undefined;
      if (!pageToken) break;
    }

    console.log(`[gmail] Built sent-to whitelist for ${userId}: ${domains.size} domains (scanned ${fetched} sent messages)`);
    if (domains.size <= 30) {
      console.log(`[gmail] Whitelisted domains: ${[...domains].sort().join(", ")}`);
    }
  } catch (e: any) {
    console.error(`[gmail] Failed to build sent-to whitelist: ${e.message}`);
    // Return empty set — the filter will be maximally strict
  }

  const entry: WhitelistEntry = { domains, builtAt: Date.now() };
  whitelistCache.set(userId, entry);
  return domains;
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

  // Build sent-to domain whitelist (cached, rebuilt hourly)
  const whitelistedDomains = await getSentDomainWhitelist(gmail, account.user_id);

  // Fetch inbox messages not from the user within the lookback window
  const afterEpoch = Math.floor(
    (Date.now() - lookbackHours * 3_600_000) / 1000
  );

  const afterDate = new Date(afterEpoch * 1000);
  const query1 = `is:inbox -from:me after:${afterEpoch}`;
  const query2 = `is:inbox is:unread -from:me after:${afterEpoch}`;
  console.log(`[gmail] Query 1: "${query1}"`);
  console.log(`[gmail] Query 2: "${query2}"`);
  console.log(`[gmail] after=${afterEpoch} => ${afterDate.toISOString()} (${afterDate.toLocaleString()}) lookbackHours=${lookbackHours}`);

  const allIds = new Set<string>();

  // Run both queries to maximize coverage
  for (const q of [query1, query2]) {
    try {
      const res = await gmail.users.messages.list({
        userId: "me",
        q,
        maxResults: 100,
      });
      const ids = (res.data.messages ?? [])
        .map((m) => m.id)
        .filter((id): id is string => !!id);
      console.log(`[gmail] "${q}" returned ${ids.length} message IDs`);
      for (const id of ids) allIds.add(id);
    } catch (e: any) {
      result.errors.push(`Gmail list error (${q}): ${e.message}`);
    }
  }

  const messageIds = [...allIds];
  console.log(`[gmail] ${messageIds.length} unique message IDs after merging both queries`);

  if (messageIds.length === 0) {
    console.log("[gmail] No messages found matching any query");
    return result;
  }

  // Check which gmail message IDs we already have as reply_items
  // Batch .in() queries in chunks of 50 to avoid PostgREST URL length limits
  const externalKeys = messageIds.map((id) => `gmail-${id}`);
  const existingExternalIds = new Set<string>();
  for (let i = 0; i < externalKeys.length; i += 50) {
    const chunk = externalKeys.slice(i, i + 50);
    const { data: existing } = await supabase
      .from("reply_items")
      .select("external_id")
      .eq("user_id", account.user_id)
      .eq("platform", "gmail")
      .in("external_id", chunk);
    if (existing) {
      for (const row of existing) existingExternalIds.add(row.external_id);
    }
  }

  // Process ALL new messages — no cap, real human emails are rare and must not be missed
  const newIds = messageIds
    .filter((id) => !existingExternalIds.has(`gmail-${id}`));
  console.log(`[gmail] ${messageIds.length} total, ${existingExternalIds.size} already in DB, ${newIds.length} new to process`);

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

      // Log every email before filtering
      console.log(`[gmail] #${newIds.indexOf(msgId) + 1} id=${msgId} from="${from}" subject="${subject}"`);

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

      const filterResult = shouldReply(emailHeaders, snippet, whitelistedDomains);
      if (!filterResult.needsReply) {
        result.filtered++;
        console.log(
          `[gmail] Filtered gmail-${msgId} from "${from}": ${filterResult.reason}`
        );
        continue;
      }

      const { name, handle } = extractName(from);
      const urgency = boostForGmail(calculateUrgency(date));

      // Classify context and generate draft via Claude API
      const { context, draftText } = await classifyAndDraft(
        "gmail", name, subject, snippet
      );

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
