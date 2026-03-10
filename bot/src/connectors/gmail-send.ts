/**
 * Send a Gmail reply in the same thread as the original message.
 * Uses the user's OAuth tokens from connected_accounts.
 */

import { google } from "googleapis";
import { getSupabase } from "../supabase.js";

interface SendReplyParams {
  /** reply_items.id (UUID) */
  itemId: string;
  /** The draft text to send */
  draftText: string;
}

interface SendResult {
  ok: boolean;
  error?: string;
}

/**
 * Send a reply to the original Gmail thread.
 * Fetches the original message to get thread ID, Message-ID, and From/To headers,
 * then sends the reply with correct In-Reply-To / References headers.
 */
export async function sendGmailReply(params: SendReplyParams): Promise<SendResult> {
  const { itemId, draftText } = params;

  // 1. Get the reply_item row (need external_id, user_id, author_handle)
  const { data: row, error: rowErr } = await getSupabase()
    .from("reply_items")
    .select("external_id, user_id, author_handle, context_text")
    .eq("id", itemId)
    .single();

  if (rowErr || !row) {
    return { ok: false, error: `Item not found: ${rowErr?.message ?? "no row"}` };
  }

  const gmailMessageId = row.external_id?.replace(/^gmail-/, "");
  if (!gmailMessageId) {
    return { ok: false, error: "Not a Gmail item or missing external_id" };
  }

  // 2. Get the user's Gmail connected account
  const { data: account, error: accErr } = await getSupabase()
    .from("connected_accounts")
    .select("access_token, refresh_token, platform_username")
    .eq("user_id", row.user_id)
    .eq("platform", "gmail")
    .limit(1)
    .single();

  if (accErr || !account) {
    return { ok: false, error: `No Gmail account found for user: ${accErr?.message ?? "no account"}` };
  }

  if (!account.refresh_token) {
    return { ok: false, error: "Gmail account has no refresh token" };
  }

  // 3. Build OAuth2 client
  const clientId = process.env.GMAIL_CLIENT_ID ?? "";
  const clientSecret = process.env.GMAIL_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) {
    return { ok: false, error: "Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET" };
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({
    refresh_token: account.refresh_token,
    access_token: account.access_token ?? undefined,
  });

  try {
    const { credentials } = await auth.refreshAccessToken();
    if (credentials.access_token && credentials.access_token !== account.access_token) {
      await getSupabase()
        .from("connected_accounts")
        .update({
          access_token: credentials.access_token,
          token_expires_at: credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : null,
        })
        .eq("user_id", row.user_id)
        .eq("platform", "gmail")
        .eq("platform_username", account.platform_username);
    }
  } catch (e: any) {
    return { ok: false, error: `Token refresh failed: ${e.message}` };
  }

  const gmail = google.gmail({ version: "v1", auth });

  // 4. Fetch original message for thread ID, Message-ID, and headers
  let threadId: string;
  let originalMessageId: string; // RFC 2822 Message-ID header
  let replyTo: string;
  let subject: string;
  let userEmail: string;

  try {
    const original = await gmail.users.messages.get({
      userId: "me",
      id: gmailMessageId,
      format: "metadata",
      metadataHeaders: ["From", "To", "Subject", "Message-ID"],
    });

    threadId = original.data.threadId ?? "";
    if (!threadId) {
      return { ok: false, error: "Original message has no thread ID" };
    }

    const headers = original.data.payload?.headers ?? [];
    const getH = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

    originalMessageId = getH("Message-ID");
    replyTo = getH("From"); // reply to whoever sent it
    subject = getH("Subject");
    userEmail = account.platform_username;

    // Add "Re:" if not already present
    if (subject && !subject.toLowerCase().startsWith("re:")) {
      subject = `Re: ${subject}`;
    }
  } catch (e: any) {
    return { ok: false, error: `Failed to fetch original message: ${e.message}` };
  }

  // 5. Build RFC 2822 email
  const emailLines = [
    `From: ${userEmail}`,
    `To: ${replyTo}`,
    `Subject: ${subject}`,
    `In-Reply-To: ${originalMessageId}`,
    `References: ${originalMessageId}`,
    `Content-Type: text/plain; charset=UTF-8`,
    "",
    draftText,
  ];

  const rawEmail = emailLines.join("\r\n");
  // Gmail API expects URL-safe base64
  const encoded = Buffer.from(rawEmail)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // 6. Send via Gmail API
  try {
    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encoded,
        threadId,
      },
    });

    console.log(`[gmail-send] Sent reply for item ${itemId} to ${replyTo} (thread ${threadId})`);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: `Gmail send failed: ${e.message}` };
  }
}
