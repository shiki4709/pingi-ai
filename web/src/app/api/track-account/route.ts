import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_TRACKING_SLOTS = 10;

const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  const { userId, handle } = await request.json();
  if (!userId || !handle) {
    return NextResponse.json({ error: "userId and handle required" }, { status: 400 });
  }

  const normalized = handle.replace(/^@/, "").trim().toLowerCase();
  if (!normalized || !/^[a-zA-Z0-9_]+$/.test(normalized)) {
    return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("user_topics")
    .select("topics, search_topics")
    .eq("user_id", userId)
    .single();

  const currentAccounts: string[] = (existing?.topics as string[]) ?? [];
  const currentTopics: string[] = (existing?.search_topics as string[]) ?? [];
  const totalUsed = currentAccounts.length + currentTopics.length;

  if (currentAccounts.includes(normalized)) {
    return NextResponse.json({ ok: true, remaining: MAX_TRACKING_SLOTS - totalUsed });
  }

  if (totalUsed >= MAX_TRACKING_SLOTS) {
    return NextResponse.json({ error: "limit", max: MAX_TRACKING_SLOTS }, { status: 429 });
  }

  const newAccounts = [...currentAccounts, normalized];

  const { error } = await supabase.from("user_topics").upsert(
    { user_id: userId, topics: newAccounts },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[track-account] Failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, remaining: MAX_TRACKING_SLOTS - totalUsed - 1 });
}
