import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Run all queries in parallel
  const [
    userRes,
    gmailRes,
    inboxPendingRes,
    inboxWeekRes,
    engagePendingRes,
    engageWeekRes,
    topicsRes,
    recentInboxRes,
    recentEngageRes,
  ] = await Promise.all([
    // User info
    supabase
      .from("users")
      .select("name, email, plan, trial_ends_at, telegram_chat_id, x_bot_chat_id, sign_off")
      .eq("id", userId)
      .single(),

    // Gmail connected
    supabase
      .from("connected_accounts")
      .select("id, platform_username")
      .eq("user_id", userId)
      .eq("platform", "gmail")
      .single(),

    // Inbox: pending items
    supabase
      .from("reply_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending"),

    // Inbox: items this week (sent + skipped)
    supabase
      .from("reply_items")
      .select("id, status", { count: "exact" })
      .eq("user_id", userId)
      .in("status", ["sent", "skipped"])
      .gte("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

    // Engage: pending items
    supabase
      .from("x_engage_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending"),

    // Engage: items this week (posted + skipped)
    supabase
      .from("x_engage_items")
      .select("id, status", { count: "exact" })
      .eq("user_id", userId)
      .in("status", ["posted", "skipped"])
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

    // Watched accounts & topics
    supabase
      .from("user_topics")
      .select("topics, search_topics")
      .eq("user_id", userId)
      .single(),

    // Recent inbox items (last 5)
    supabase
      .from("reply_items")
      .select("id, platform, urgency, status, author_name, author_handle, context_text, draft_text, detected_at")
      .eq("user_id", userId)
      .order("detected_at", { ascending: false })
      .limit(5),

    // Recent engage items (last 5)
    supabase
      .from("x_engage_items")
      .select("id, author_name, author_handle, tweet_text, draft_comment, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const user = userRes.data;
  const inboxLinked = !!user?.telegram_chat_id;
  const xLinked = !!user?.x_bot_chat_id;
  const gmailConnected = !!gmailRes.data;

  // Count sent vs total for response rate
  const inboxWeekItems = inboxWeekRes.data ?? [];
  const inboxSent = inboxWeekItems.filter((i: any) => i.status === "sent").length;
  const inboxTotal = inboxWeekItems.length;

  const engageWeekItems = engageWeekRes.data ?? [];
  const engagePosted = engageWeekItems.filter((i: any) => i.status === "posted").length;
  const engageTotal = engageWeekItems.length;

  const totalPending = (inboxPendingRes.count ?? 0) + (engagePendingRes.count ?? 0);
  const totalActioned = inboxSent + engagePosted;
  const totalReviewed = inboxTotal + engageTotal;

  return NextResponse.json({
    // Connection status
    inbox_linked: inboxLinked,
    x_linked: xLinked,
    gmail_connected: gmailConnected,
    gmail_email: gmailRes.data?.platform_username ?? null,

    // User
    name: user?.name ?? null,
    plan: user?.plan ?? "free",
    trial_ends_at: user?.trial_ends_at ?? null,

    // Stats
    pending_count: totalPending,
    inbox_pending: inboxPendingRes.count ?? 0,
    engage_pending: engagePendingRes.count ?? 0,
    actioned_this_week: totalActioned,
    reviewed_this_week: totalReviewed,
    response_rate: totalReviewed > 0 ? Math.round((totalActioned / totalReviewed) * 100) : null,

    // Engage details
    watched_accounts: topicsRes.data?.topics ?? [],
    search_topics: topicsRes.data?.search_topics ?? [],
    engage_posted_week: engagePosted,

    // Recent activity (merged and sorted)
    recent_inbox: (recentInboxRes.data ?? []).map((i: any) => ({
      id: i.id,
      type: "inbox" as const,
      author: i.author_name || i.author_handle,
      subject: i.context_text,
      status: i.status,
      urgency: i.urgency,
      time: i.detected_at,
    })),
    recent_engage: (recentEngageRes.data ?? []).map((i: any) => ({
      id: i.id,
      type: "engage" as const,
      author: `@${i.author_handle}`,
      subject: i.tweet_text?.slice(0, 80),
      status: i.status,
      time: i.created_at,
    })),
  });
}
