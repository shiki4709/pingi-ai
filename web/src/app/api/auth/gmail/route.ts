import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/gmail-oauth";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Gmail OAuth not configured" },
      { status: 500 }
    );
  }

  const url = getAuthUrl(userId);
  return NextResponse.redirect(url);
}
