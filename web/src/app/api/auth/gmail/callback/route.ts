import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, fetchGmailAddress } from "@/lib/gmail-oauth";
import { supabase } from "@/lib/supabase";
import { calculateBaseline } from "@/lib/baseline";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state"); // user_id
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/gmail/error?reason=${error}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state" },
      { status: 400 }
    );
  }

  const userId = state;

  // Exchange authorization code for tokens
  let tokens;
  try {
    tokens = await exchangeCode(code);
  } catch (e: any) {
    console.error("Gmail token exchange failed:", e.message);
    return NextResponse.redirect(
      new URL("/auth/gmail/error?reason=token_exchange_failed", request.url)
    );
  }

  // Fetch the Gmail address for this account
  let emailAddress = "unknown";
  try {
    if (tokens.access_token) {
      emailAddress = await fetchGmailAddress(tokens.access_token);
    }
  } catch (e: any) {
    console.error("Failed to fetch Gmail address:", e.message);
    // Non-fatal: proceed with "unknown", will be updated on next token refresh
  }

  // Upsert into connected_accounts (keyed by user + platform + email)
  const { error: dbError } = await supabase.from("connected_accounts").upsert(
    {
      user_id: userId,
      platform: "gmail" as const,
      platform_username: emailAddress,
      access_token: tokens.access_token ?? null,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      scopes: tokens.scope?.split(" ") ?? [],
    },
    { onConflict: "user_id,platform,platform_username" }
  );

  if (dbError) {
    console.error("Failed to store Gmail tokens:", dbError.message);
    return NextResponse.redirect(
      new URL("/auth/gmail/error?reason=db_error", request.url)
    );
  }

  // Fire-and-forget: calculate baseline stats from last 30 days of email history.
  // Don't await — let it run in the background so the user isn't blocked.
  if (tokens.access_token && emailAddress !== "unknown") {
    calculateBaseline(tokens.access_token, userId, emailAddress).catch((e) =>
      console.error("[baseline] Background calculation failed:", e.message)
    );
  }

  return NextResponse.redirect(new URL("/auth/gmail/success", request.url));
}
