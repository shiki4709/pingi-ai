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
