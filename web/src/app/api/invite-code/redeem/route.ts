import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const { code, userId } = await request.json();
    if (!code || !userId) {
      return NextResponse.json({ error: "Missing code or userId" }, { status: 400 });
    }

    const supabase = getSupabase();
    const normalizedCode = code.trim().toUpperCase();

    // Atomic redemption: only succeeds if code exists, is unused, and not expired
    const { data: redeemed, error: redeemError } = await supabase
      .from("invite_codes")
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq("code", normalizedCode)
      .is("used_by", null)
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .select("id")
      .single();

    if (redeemError || !redeemed) {
      // Determine specific error for better UX
      const { data: existing } = await supabase
        .from("invite_codes")
        .select("used_by, expires_at")
        .eq("code", normalizedCode)
        .single();

      if (!existing) {
        return NextResponse.json({ error: "Code not found" }, { status: 400 });
      }
      if (existing.used_by) {
        return NextResponse.json({ error: "Code already used" }, { status: 400 });
      }
      if (existing.expires_at && new Date(existing.expires_at) <= new Date()) {
        return NextResponse.json({ error: "Code expired" }, { status: 400 });
      }
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // Update user: 14-day trial, source, link to invite code
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { error: userError } = await supabase
      .from("users")
      .update({
        plan: "trial",
        trial_ends_at: trialEndsAt,
        source: "invite_code",
        invite_code_id: redeemed.id,
      })
      .eq("id", userId);

    if (userError) {
      console.error("[invite-code/redeem] Failed to update user:", userError);
      return NextResponse.json({ error: "Failed to activate trial" }, { status: 500 });
    }

    console.log(`[invite-code/redeem] Code ${normalizedCode} redeemed by user ${userId}, trial until ${trialEndsAt}`);
    return NextResponse.json({ success: true, trial_ends_at: trialEndsAt });
  } catch (err) {
    console.error("[invite-code/redeem] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
