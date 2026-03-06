/**
 * Supabase-backed item store.
 * Replaces mock-data.ts for production use.
 */

import { supabase } from "./supabase.js";
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
  const { data } = await supabase
    .from("reply_items")
    .select("*")
    .eq("id", id)
    .single();
  return data ? rowToItem(data) : undefined;
}

export async function getPendingItemsForUser(
  userId: string
): Promise<TrackedItem[]> {
  const { data } = await supabase
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
  const { error } = await supabase
    .from("reply_items")
    .update(update)
    .eq("id", id);
  return !error;
}

export async function markSkipped(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("reply_items")
    .update({ status: "skipped" })
    .eq("id", id);
  return !error;
}

export async function updateDraft(
  id: string,
  newDraft: string
): Promise<boolean> {
  const { error } = await supabase
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
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .single();

  if (existing) return existing.id;

  // Create new user
  const { data: created, error } = await supabase
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
  const { data } = await supabase
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
  const { error } = await supabase
    .from("users")
    .update({ sign_off: signOff })
    .eq("telegram_chat_id", chatId);
  return !error;
}

export async function getSignOffForChat(chatId: number): Promise<string | null> {
  const { data } = await supabase
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
  const { data } = await supabase
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
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .single();

  return data?.id ?? null;
}

// ─── Subscription & draft usage ───

const FREE_DRAFT_LIMIT = 10;

/**
 * Count how many reply_items with a non-null draft_text this user has created
 * in the current calendar month.
 */
export async function getDraftUsageThisMonth(
  userId: string
): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count } = await supabase
    .from("reply_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("draft_text", "is", null)
    .gte("detected_at", startOfMonth);

  return count ?? 0;
}

/**
 * Check whether a user is allowed to generate a draft.
 * Returns { allowed: true } or { allowed: false, usage, limit }.
 */
export async function canGenerateDraft(
  userId: string
): Promise<{ allowed: true } | { allowed: false; usage: number; limit: number }> {
  // Check for active Pro subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .single();

  if (sub?.plan === "pro" && sub?.status === "active") {
    return { allowed: true };
  }

  // Free plan: check monthly usage
  const usage = await getDraftUsageThisMonth(userId);
  if (usage < FREE_DRAFT_LIMIT) {
    return { allowed: true };
  }

  return { allowed: false, usage, limit: FREE_DRAFT_LIMIT };
}

// ─── Link code redemption ───

/**
 * Redeem a 6-character link code from the web onboarding flow.
 * Looks up the code, checks expiry, sets telegram_chat_id on the user,
 * then deletes the code. Returns the user_id on success, null on failure.
 */
export async function redeemLinkCode(
  code: string,
  chatId: number
): Promise<{ userId: string } | { error: string }> {
  const { data: row, error } = await supabase
    .from("link_codes")
    .select("user_id, expires_at")
    .eq("code", code.toUpperCase())
    .single();

  if (error || !row) {
    return { error: "Invalid code. Check and try again." };
  }

  if (new Date(row.expires_at) < new Date()) {
    await supabase.from("link_codes").delete().eq("code", code.toUpperCase());
    return { error: "Code expired. Go back to the web app to get a new one." };
  }

  // Link Telegram chat to the existing web user
  const { error: updateErr } = await supabase
    .from("users")
    .update({ telegram_chat_id: chatId })
    .eq("id", row.user_id);

  if (updateErr) {
    return { error: "Failed to link account. Try again." };
  }

  // Clean up used code
  await supabase.from("link_codes").delete().eq("code", code.toUpperCase());

  return { userId: row.user_id };
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
  const { data } = await supabase
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
  const { data } = await supabase
    .from("users")
    .select("telegram_chat_id");
  return (data ?? [])
    .map((row: Record<string, any>) => row.telegram_chat_id as number | null)
    .filter((id: number | null): id is number => id != null);
}
