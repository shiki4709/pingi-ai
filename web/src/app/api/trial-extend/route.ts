import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("trial_ends_at, trial_extended")
    .eq("id", userId)
    .single();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.trial_extended) {
    return NextResponse.json({ error: "already_extended" }, { status: 400 });
  }

  const now = new Date();
  const currentEnd = user.trial_ends_at ? new Date(user.trial_ends_at) : now;
  const fromNowPlus5 = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const currentPlus2 = new Date(currentEnd.getTime() + 2 * 24 * 60 * 60 * 1000);
  const newEnd = fromNowPlus5 > currentPlus2 ? fromNowPlus5 : currentPlus2;

  const { error } = await supabase
    .from("users")
    .update({ trial_ends_at: newEnd.toISOString(), trial_extended: true })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, new_trial_ends_at: newEnd.toISOString() });
}
