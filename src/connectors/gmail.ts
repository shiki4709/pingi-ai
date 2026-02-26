import { google } from "googleapis";
import { ConnectorResult, EngagementItem } from "../types";
import { calculateUrgency, adjustForPlatform } from "../urgency";

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return auth;
}

export async function fetchGmailItems(
  lookbackHours: number = 24
): Promise<ConnectorResult> {
  const items: EngagementItem[] = [];
  const errors: string[] = [];

  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    return { items, errors: ["Gmail not configured — missing GOOGLE_REFRESH_TOKEN"] };
  }

  try {
    const auth = getAuth();
    const gmail = google.gmail({ version: "v1", auth });

    // Find threads where someone emailed you and you haven't replied
    const after = Math.floor(
      (Date.now() - lookbackHours * 60 * 60 * 1000) / 1000
    );

    const res = await gmail.users.messages.list({
      userId: "me",
      q: `is:inbox is:unread after:${after}`,
      maxResults: 50,
    });

    const messages = res.data.messages || [];
    console.log(`  📧 Gmail: found ${messages.length} unread messages`);

    for (const msg of messages.slice(0, 20)) {
      try {
        const full = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        });

        const headers = full.data.payload?.headers || [];
        const from = headers.find((h) => h.name === "From")?.value || "Unknown";
        const subject =
          headers.find((h) => h.name === "Subject")?.value || "(no subject)";
        const dateStr = headers.find((h) => h.name === "Date")?.value;
        const date = dateStr ? new Date(dateStr) : new Date();

        // Skip automated/noreply emails
        const fromLower = from.toLowerCase();
        if (
          fromLower.includes("noreply") ||
          fromLower.includes("no-reply") ||
          fromLower.includes("notifications@") ||
          fromLower.includes("mailer-daemon") ||
          fromLower.includes("newsletter") ||
          fromLower.includes("digest@")
        ) {
          continue;
        }

        // Extract sender name
        const nameMatch = from.match(/^"?([^"<]+)"?\s*</);
        const authorName = nameMatch ? nameMatch[1].trim() : from.split("@")[0];

        const snippet = full.data.snippet || "";
        const urgency = adjustForPlatform(
          calculateUrgency(date),
          "gmail",
          "email"
        );

        items.push({
          id: `gmail-${msg.id}`,
          platform: "gmail",
          itemType: "email",
          authorName,
          authorHandle: from,
          originalText: snippet,
          contextText: subject,
          itemUrl: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
          detectedAt: date,
          urgency,
        });
      } catch (e: any) {
        errors.push(`Gmail message ${msg.id}: ${e.message}`);
      }
    }
  } catch (e: any) {
    errors.push(`Gmail API error: ${e.message}`);
  }

  return { items, errors };
}

// ─── OAuth helper: run this once to get your refresh token ───
export async function getGmailAuthUrl(): Promise<string> {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  return auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
    ],
  });
}

export async function exchangeGmailCode(code: string): Promise<string> {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const { tokens } = await auth.getToken(code);
  console.log("\n✅ Gmail refresh token (save to .env):");
  console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  return tokens.refresh_token || "";
}
