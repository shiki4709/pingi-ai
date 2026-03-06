import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
];

function resolveRedirectUri(requestUrl?: string): string {
  if (process.env.GMAIL_REDIRECT_URI) return process.env.GMAIL_REDIRECT_URI;
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (requestUrl ? new URL(requestUrl).origin : "http://localhost:3000");
  return `${base}/api/auth/gmail/callback`;
}

export function getOAuth2Client(requestUrl?: string) {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    resolveRedirectUri(requestUrl)
  );
}

export function getAuthUrl(userId: string, requestUrl?: string): string {
  const client = getOAuth2Client(requestUrl);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: userId,
  });
}

export async function exchangeCode(code: string, requestUrl?: string) {
  const client = getOAuth2Client(requestUrl);
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Fetch the authenticated user's Gmail address using their access token.
 */
export async function fetchGmailAddress(accessToken: string): Promise<string> {
  const { google } = await import("googleapis");
  const auth = getOAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });
  const profile = await gmail.users.getProfile({ userId: "me" });
  return profile.data.emailAddress ?? "";
}
