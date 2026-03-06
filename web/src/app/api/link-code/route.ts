import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const code = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 hex chars
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Delete any existing codes for this user first
  await supabase.from("link_codes").delete().eq("user_id", userId);

  const { error } = await supabase.from("link_codes").insert({
    code,
    user_id: userId,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("Failed to create link code:", error.message);
    return NextResponse.json(
      { error: "Failed to generate code" },
      { status: 500 }
    );
  }

  return NextResponse.json({ code });
}
