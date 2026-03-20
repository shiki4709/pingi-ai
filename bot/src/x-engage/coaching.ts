/**
 * Periodic coaching: weekly summaries and milestone nudges.
 */

import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import {
  getUsersWithNicheProfiles,
  getPostedCountForUser,
  getConversationCount,
  getNicheProfile,
  addMilestone,
} from "./store.js";
import { sendMessage } from "./telegram.js";
import { getSupabase } from "./supabase.js";

const MODEL = "claude-sonnet-4-20250514";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

let coachingTimer: ReturnType<typeof setInterval> | null = null;

// ─── Weekly summary ───

export function startCoachingTimer(): void {
  if (coachingTimer) return;
  console.log("[coaching] Starting weekly coaching timer");
  coachingTimer = setInterval(() => {
    broadcastWeeklySummaries().catch((err) =>
      console.error("[coaching] Weekly summary failed:", err)
    );
  }, ONE_WEEK_MS);
}

export function stopCoachingTimer(): void {
  if (coachingTimer) {
    clearInterval(coachingTimer);
    coachingTimer = null;
  }
}

async function broadcastWeeklySummaries(): Promise<void> {
  const users = await getUsersWithNicheProfiles();
  for (const { user_id, telegram_chat_id } of users) {
    try {
      await sendWeeklySummary(user_id, telegram_chat_id);
    } catch (err: any) {
      console.error(`[coaching] Summary failed for ${user_id}:`, err.message);
    }
  }
}

async function sendWeeklySummary(
  userId: string,
  chatId: number,
): Promise<void> {
  const weekAgo = new Date(Date.now() - ONE_WEEK_MS).toISOString();

  const { data: weekItems } = await getSupabase()
    .from("x_engage_items")
    .select("status, author_handle, source_type, reply_replies")
    .eq("user_id", userId)
    .eq("status", "posted")
    .gte("posted_at", weekAgo);

  const items = weekItems ?? [];
  if (items.length === 0) return;

  const repliesSent = items.length;
  const conversations = items.filter((i: any) => (i.reply_replies ?? 0) > 0).length;
  const trendingReplies = items.filter((i: any) => i.source_type === "trending").length;

  const accountCounts = new Map<string, number>();
  for (const item of items) {
    const handle = (item as any).author_handle ?? "";
    accountCounts.set(handle, (accountCounts.get(handle) ?? 0) + 1);
  }
  const topAccount = [...accountCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";

  const summary = [
    "Your week on X:",
    "",
    `Replies sent: ${repliesSent}`,
    `Conversations started: ${conversations}`,
    `Trending replies: ${trendingReplies}`,
    `Most engaged account: @${topAccount}`,
  ].join("\n");

  await sendMessage({ chat_id: chatId, text: summary });
}

// ─── Milestone nudges ───

const MILESTONES = [
  { id: "10_replies", threshold: 10, message: "You've sent 10 replies. You're building momentum." },
  { id: "50_replies", threshold: 50, message: "50 replies sent. Your niche presence is growing." },
  { id: "100_replies", threshold: 100, message: "100 replies. Time for a strategy review." },
];

export async function checkMilestones(
  userId: string,
  chatId: number
): Promise<void> {
  const profile = await getNicheProfile(userId);
  if (!profile) return;

  const totalPosted = await getPostedCountForUser(userId);
  const conversations = await getConversationCount(userId);

  for (const milestone of MILESTONES) {
    if (
      totalPosted >= milestone.threshold &&
      !profile.milestones_sent.includes(milestone.id)
    ) {
      await sendMessage({ chat_id: chatId, text: milestone.message });
      await addMilestone(userId, milestone.id);
    }
  }

  if (conversations > 0 && !profile.milestones_sent.includes("first_conversation")) {
    await sendMessage({
      chat_id: chatId,
      text: "Someone replied back to your reply. That's the 75x algorithm boost in action. Keep it up.",
    });
    await addMilestone(userId, "first_conversation");
  }
}
