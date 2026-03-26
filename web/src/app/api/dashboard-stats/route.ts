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
    sourceStatsRes,
    engageMetricsRes,
    engageAllTimePostedRes,
    engageAllTimeRes,
  ] = await Promise.all([
    // User info
    supabase
      .from("users")
      .select("name, email, plan, trial_ends_at, telegram_chat_id, x_bot_chat_id, sign_off, has_seen_celebration, trial_extended, created_at, onboarding_completed")
      .eq("id", userId)
      .single(),

    // All connected accounts (gmail, twitter, etc.)
    supabase
      .from("connected_accounts")
      .select("id, platform, platform_username")
      .eq("user_id", userId),

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

    // Engage: items acted on this week (posted or skipped)
    // Use posted_at for posted items, created_at as fallback for skipped
    supabase
      .from("x_engage_items")
      .select("id, status, created_at, posted_at")
      .eq("user_id", userId)
      .in("status", ["posted", "skipped"]),

    // Watched accounts & topics
    supabase
      .from("user_topics")
      .select("topics, search_topics")
      .eq("user_id", userId)
      .single(),

    // Recent inbox items (last 10)
    supabase
      .from("reply_items")
      .select("id, platform, urgency, status, author_name, author_handle, context_text, draft_text, detected_at, sent_at")
      .eq("user_id", userId)
      .order("detected_at", { ascending: false })
      .limit(10),

    // Recent engage items (last 10)
    supabase
      .from("x_engage_items")
      .select("id, author_name, author_handle, tweet_text, draft_comment, status, created_at, posted_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),

    // Per-source counts (last 7 days)
    supabase
      .from("x_engage_items")
      .select("source_type, source_value, status")
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

    // Engagement metrics on posted replies (likes + replies received)
    supabase
      .from("x_engage_items")
      .select("reply_likes, reply_replies")
      .eq("user_id", userId)
      .eq("status", "posted")
      .not("reply_tweet_id", "is", null),

    // All-time posted engage items (for onboarding "posted" check)
    supabase
      .from("x_engage_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "posted"),

    // All-time engage items (for onboarding "reviewed" check)
    supabase
      .from("x_engage_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const user = userRes.data;
  if (userRes.error) {
    console.error("[dashboard-stats] User query failed:", userRes.error.message);
  }
  const connectedAccounts = (gmailRes.data ?? []) as { id: string; platform: string; platform_username: string }[];
  const gmailAccount = connectedAccounts.find((a) => a.platform === "gmail");
  console.log(`[dashboard-stats] userId=${userId} telegram_chat_id=${user?.telegram_chat_id ?? "null"} x_bot_chat_id=${user?.x_bot_chat_id ?? "null"} gmail=${!!gmailAccount}`);
  const inboxLinked = !!user?.telegram_chat_id;
  const xLinked = !!user?.x_bot_chat_id;
  const gmailConnected = !!gmailAccount;

  // Count sent vs total for response rate
  const inboxWeekItems = inboxWeekRes.data ?? [];
  const inboxSent = inboxWeekItems.filter((i: any) => i.status === "sent").length;
  const inboxTotal = inboxWeekItems.length;

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const allEngageActioned = engageWeekRes.data ?? [];
  // Filter to items acted on this week using the right timestamp
  const engageWeekItems = allEngageActioned.filter((i: any) => {
    const actionTime = i.status === "posted" ? (i.posted_at ?? i.created_at) : i.created_at;
    return actionTime >= oneWeekAgo;
  });
  const engagePosted = engageWeekItems.filter((i: any) => i.status === "posted").length;
  const engageTotal = engageWeekItems.length;

  const totalPending = (inboxPendingRes.count ?? 0) + (engagePendingRes.count ?? 0);
  const totalActioned = inboxSent + engagePosted;
  const totalReviewed = inboxTotal + engageTotal;

  // Today's counts
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const recentInbox = recentInboxRes.data ?? [];
  const recentEngage = recentEngageRes.data ?? [];

  const inboxSentToday = recentInbox.filter(
    (i: any) => i.status === "sent" && i.sent_at && i.sent_at >= todayISO
  ).length;
  const engagePostedToday = recentEngage.filter(
    (i: any) => i.status === "posted" && i.posted_at && i.posted_at >= todayISO
  ).length;

  // Last activity timestamps
  const lastInboxActivity = recentInbox[0]?.detected_at ?? null;
  const lastEngageActivity = recentEngage[0]?.created_at ?? null;

  // Per-agent rates
  const inboxRate = inboxTotal > 0 ? Math.round((inboxSent / inboxTotal) * 100) : null;
  const engageRate = engageTotal > 0 ? Math.round((engagePosted / engageTotal) * 100) : null;
  const engageSkipped = engageWeekItems.filter((i: any) => i.status === "skipped").length;

  // Aggregate per-source counts (last 7 days)
  const sourceRows = sourceStatsRes.data ?? [];
  const sourceCounts: Record<string, { total: number; posted: number; pending: number }> = {};
  for (const r of sourceRows as any[]) {
    if (!r.source_type || !r.source_value) continue;
    const key = `${r.source_type}:${r.source_value}`;
    if (!sourceCounts[key]) sourceCounts[key] = { total: 0, posted: 0, pending: 0 };
    sourceCounts[key].total++;
    if (r.status === "posted") sourceCounts[key].posted++;
    if (r.status === "pending") sourceCounts[key].pending++;
  }

  const accountStats = Object.entries(sourceCounts)
    .filter(([k]) => k.startsWith("account:"))
    .map(([k, v]) => ({ name: k.replace("account:", ""), ...v }));

  const topicStats = Object.entries(sourceCounts)
    .filter(([k]) => k.startsWith("topic:"))
    .map(([k, v]) => ({ name: k.replace("topic:", ""), ...v }));

  // Onboarding checklist (computed from existing data)
  const userCreatedAt = user?.created_at ?? null;
  const isNewUser = userCreatedAt
    ? Date.now() - new Date(userCreatedAt).getTime() < 7 * 24 * 60 * 60 * 1000
    : false;
  const onboardingTelegram = inboxLinked || xLinked;
  const onboardingTracked = (topicsRes.data?.topics as string[] ?? []).length > 0;
  const onboardingReviewed = (engageAllTimeRes.count ?? 0) > 0;
  const onboardingPosted = (engageAllTimePostedRes.count ?? 0) > 0;
  const onboardingCompleted = [onboardingTelegram, onboardingTracked, onboardingReviewed, onboardingPosted].filter(Boolean).length;
  const showChecklist = isNewUser && onboardingCompleted < 4;

  // Aggregate engagement on posted replies
  const metricsRows = engageMetricsRes.data ?? [];
  const engageLikesReceived = metricsRows.reduce((sum: number, r: any) => sum + (r.reply_likes ?? 0), 0);
  const engageRepliesReceived = metricsRows.reduce((sum: number, r: any) => sum + (r.reply_replies ?? 0), 0);

  return NextResponse.json({
    // Connection status
    inbox_linked: inboxLinked,
    x_linked: xLinked,
    gmail_connected: gmailConnected,
    gmail_email: gmailAccount?.platform_username ?? null,
    connected_accounts: connectedAccounts.map((a) => ({ platform: a.platform, username: a.platform_username })),

    // User
    name: user?.name ?? null,
    plan: user?.plan ?? "free",
    trial_ends_at: user?.trial_ends_at ?? null,
    onboarding_completed: user?.onboarding_completed ?? false,

    // Stats
    pending_count: totalPending,
    inbox_pending: inboxPendingRes.count ?? 0,
    engage_pending: engagePendingRes.count ?? 0,
    actioned_this_week: totalActioned,
    reviewed_this_week: totalReviewed,
    response_rate: totalReviewed > 0 ? Math.round((totalActioned / totalReviewed) * 100) : null,

    // Today
    actioned_today: inboxSentToday + engagePostedToday,

    // Per-agent stats
    inbox_sent_week: inboxSent,
    inbox_reviewed_week: inboxTotal,
    inbox_sent_today: inboxSentToday,
    inbox_rate: inboxRate,

    engage_posted_week: engagePosted,
    engage_skipped_week: engageSkipped,
    engage_reviewed_week: engageTotal,
    engage_posted_today: engagePostedToday,
    engage_rate: engageRate,
    engage_likes_received: engageLikesReceived,
    engage_replies_received: engageRepliesReceived,

    // Onboarding
    created_at: user?.created_at ?? null,
    has_seen_celebration: user?.has_seen_celebration ?? false,
    trial_extended: user?.trial_extended ?? false,
    onboarding: {
      show: showChecklist,
      telegram: onboardingTelegram,
      tracked: onboardingTracked,
      reviewed: onboardingReviewed,
      posted: onboardingPosted,
      completed: onboardingCompleted,
      total: 4,
    },

    // Agent details
    watched_accounts: topicsRes.data?.topics ?? [],
    search_topics: topicsRes.data?.search_topics ?? [],
    account_stats: accountStats,
    topic_stats: topicStats,
    last_inbox_activity: lastInboxActivity,
    last_engage_activity: lastEngageActivity,

    // Recent activity (merged and sorted)
    recent_inbox: recentInbox.map((i: any) => ({
      id: i.id,
      type: "inbox" as const,
      author: i.author_name || i.author_handle,
      subject: i.context_text,
      status: i.status,
      urgency: i.urgency,
      time: i.detected_at,
    })),
    recent_engage: recentEngage.map((i: any) => ({
      id: i.id,
      type: "engage" as const,
      author: `@${i.author_handle}`,
      subject: i.tweet_text?.slice(0, 80),
      status: i.status,
      time: i.created_at,
    })),
  });
}
