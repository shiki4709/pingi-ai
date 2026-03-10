/**
 * Supabase-backed item store.
 * Replaces mock-data.ts for production use.
 */

import { getSupabase } from "./supabase.js";
import type {
  TrackedItem,
  Platform,
  Urgency,
  ContextCategory,
  ItemStatus,
} from "./types.js";

// ─── Row → TrackedItem mapper ───

function rowToItem(row: Record<string, any>): TrackedItem {
  return {
    id: row.id,
    platform: row.platform as Platform,
    urgency: row.urgency as Urgency,
    context: row.context as ContextCategory,
    priorityScore: row.priority_score,
    authorName: row.author_name,
    authorHandle: row.author_handle ?? undefined,
    originalText: row.original_text,
    originalBody: row.original_body ?? undefined,
    contextText: row.context_text ?? undefined,
    detectedAt: new Date(row.detected_at),
    draftText: row.draft_text ?? undefined,
    accountLabel: row.account_label ?? undefined,
    status: row.status as ItemStatus,
    sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
    finalDraft: row.final_draft ?? undefined,
  };
}

// ─── Item queries ───

export async function getItemById(
  id: string
): Promise<TrackedItem | undefined> {
  const { data } = await getSupabase()
    .from("reply_items")
    .select("*")
    .eq("id", id)
    .single();
  return data ? rowToItem(data) : undefined;
}

export async function getPendingItemsForUser(
  userId: string
): Promise<TrackedItem[]> {
  const { data } = await getSupabase()
    .from("reply_items")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("priority_score", { ascending: false });
  return (data ?? []).map(rowToItem);
}

// ─── Item mutations ───

export async function markSent(
  id: string,
  finalDraft?: string
): Promise<boolean> {
  const update: Record<string, any> = {
    status: "sent",
    sent_at: new Date().toISOString(),
  };
  if (finalDraft) update.final_draft = finalDraft;
  const { error } = await getSupabase()
    .from("reply_items")
    .update(update)
    .eq("id", id);
  return !error;
}

export async function markSkipped(id: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from("reply_items")
    .update({ status: "skipped" })
    .eq("id", id);
  return !error;
}

export async function updateDraft(
  id: string,
  newDraft: string
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("reply_items")
    .update({ draft_text: newDraft })
    .eq("id", id);
  return !error;
}

// ─── User management ───

/**
 * Ensure a user row exists for this Telegram chat.
 * Returns the user's UUID.
 */
export async function ensureUser(
  chatId: number,
  firstName?: string
): Promise<string> {
  // Try to find existing user
  const { data: existing } = await getSupabase()
    .from("users")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .single();

  if (existing) return existing.id;

  // Create new user
  const { data: created, error } = await getSupabase()
    .from("users")
    .insert({
      telegram_chat_id: chatId,
      name: firstName ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create user for chat ${chatId}: ${error.message}`);
  }

  return created!.id;
}

// ─── Sign-off ───

export async function getSignOff(userId: string): Promise<string | null> {
  const { data } = await getSupabase()
    .from("users")
    .select("sign_off, name")
    .eq("id", userId)
    .single();
  if (data?.sign_off) return data.sign_off;
  // Default: "Best,\n{first name}" if we know their name
  if (data?.name) return `Best,\n${data.name.split(/\s+/)[0]}`;
  return null;
}

export async function setSignOff(
  chatId: number,
  signOff: string
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("users")
    .update({ sign_off: signOff })
    .eq("telegram_chat_id", chatId);
  return !error;
}

export async function getSignOffForChat(chatId: number): Promise<string | null> {
  const { data } = await getSupabase()
    .from("users")
    .select("sign_off, name")
    .eq("telegram_chat_id", chatId)
    .single();
  if (data?.sign_off) return data.sign_off;
  // Default: "Best,\n{first name}" if we know their name
  if (data?.name) return `Best,\n${data.name.split(/\s+/)[0]}`;
  return null;
}

/**
 * Look up the Telegram chat ID for a given user UUID.
 */
export async function getChatIdForUser(
  userId: string
): Promise<number | null> {
  const { data } = await getSupabase()
    .from("users")
    .select("telegram_chat_id")
    .eq("id", userId)
    .single();

  return data?.telegram_chat_id ?? null;
}

/**
 * Look up the user UUID for a given Telegram chat ID.
 */
export async function getUserIdForChat(
  chatId: number
): Promise<string | null> {
  const { data } = await getSupabase()
    .from("users")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .single();

  return data?.id ?? null;
}

// ─── Plan & draft usage ───

const ADMIN_EMAILS = ["shiki4709@gmail.com"];
const FREE_DRAFT_LIMIT = 5;

/**
 * Check if a user has Pro access.
 * Pro = plan is 'pro', OR plan is 'trial' with trial_ends_at in the future,
 * OR email is in the admin list.
 */
export async function hasPro(userId: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from("users")
    .select("plan, trial_ends_at, email")
    .eq("id", userId)
    .single();

  if (!data) return false;
  if (data.email && ADMIN_EMAILS.includes(data.email.toLowerCase())) return true;
  if (data.plan === "pro") return true;
  if (data.plan === "trial" && data.trial_ends_at) {
    return new Date(data.trial_ends_at) > new Date();
  }
  return false;
}

/**
 * Check if user's trial has expired (plan='trial' but past trial_ends_at).
 */
export async function isTrialExpired(userId: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from("users")
    .select("plan, trial_ends_at")
    .eq("id", userId)
    .single();

  if (!data || data.plan !== "trial") return false;
  if (!data.trial_ends_at) return true;
  return new Date(data.trial_ends_at) <= new Date();
}

/**
 * Count how many reply_items with a non-null draft_text this user has created
 * in the current calendar month.
 */
export async function getDraftUsageThisMonth(
  userId: string
): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count } = await getSupabase()
    .from("reply_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("draft_text", "is", null)
    .gte("detected_at", startOfMonth);

  return count ?? 0;
}

/**
 * Check whether a user is allowed to generate a draft.
 * Pro/trial users: unlimited. Free users: 5/month.
 */
export async function canGenerateDraft(
  userId: string
): Promise<{ allowed: true } | { allowed: false; usage: number; limit: number }> {
  if (await hasPro(userId)) {
    return { allowed: true };
  }

  // Free plan: check monthly usage
  const usage = await getDraftUsageThisMonth(userId);
  if (usage < FREE_DRAFT_LIMIT) {
    return { allowed: true };
  }

  return { allowed: false, usage, limit: FREE_DRAFT_LIMIT };
}

// ─── Email-based account linking ───

/**
 * Link a Telegram chat to a Pingi account by email lookup.
 * Looks up the email in the users table, sets telegram_chat_id if found.
 */
export async function linkByEmail(
  email: string,
  chatId: number
): Promise<{ userId: string } | { error: string }> {
  const normalized = email.trim().toLowerCase();
  console.log(`[store] linkByEmail: email="${normalized}" chatId=${chatId}`);

  const { data: row, error } = await getSupabase()
    .from("users")
    .select("id")
    .eq("email", normalized)
    .single();

  if (error || !row) {
    console.log(`[store] No user found for email "${normalized}"`);
    return {
      error:
        "No account found with that email. Sign up at pingi-ai.vercel.app first, or type another email.",
    };
  }

  const { error: updateErr } = await getSupabase()
    .from("users")
    .update({ telegram_chat_id: chatId })
    .eq("id", row.id);

  if (updateErr) {
    console.error(`[store] linkByEmail: update failed:`, updateErr.message);
    return { error: "Failed to link account. Try again." };
  }

  console.log(`[store] linkByEmail: SUCCESS — user ${row.id} linked to chat ${chatId}`);
  return { userId: row.id };
}

// ─── Report queries ───

/**
 * Fetch all items detected in the last `days` days for a given user.
 * Includes sent, skipped, and pending items.
 */
export async function getItemsSince(
  userId: string,
  days: number
): Promise<TrackedItem[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await getSupabase()
    .from("reply_items")
    .select("*")
    .eq("user_id", userId)
    .gte("detected_at", since)
    .order("detected_at", { ascending: false });
  return (data ?? []).map(rowToItem);
}

/**
 * Return all known Telegram chat IDs (for broadcasting reports).
 */
export async function getAllChatIds(): Promise<number[]> {
  const { data } = await getSupabase()
    .from("users")
    .select("telegram_chat_id");
  return (data ?? [])
    .map((row: Record<string, any>) => row.telegram_chat_id as number | null)
    .filter((id: number | null): id is number => id != null);
}
