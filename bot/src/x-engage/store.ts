/**
 * Supabase data layer for the X engagement bot.
 * Manages users, link codes, topics, and engagement items.
 */

import { supabase } from "./supabase.js";

// ─── User management ───

export async function ensureUser(
  chatId: number,
  firstName?: string
): Promise<string> {
  // Check if user already linked to this X bot chat
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("x_bot_chat_id", chatId)
    .single();

  if (existing) return existing.id;

  // Create new user row (will be linked to web account via /link)
  const { data: created, error } = await supabase
    .from("users")
    .insert({
      x_bot_chat_id: chatId,
      name: firstName ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `Failed to create user for x-bot chat ${chatId}: ${error.message}`
    );
  }

  return created!.id;
}

export async function getUserIdForChat(
  chatId: number
): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("x_bot_chat_id", chatId)
    .single();
  return data?.id ?? null;
}

export async function getChatIdForUser(
  userId: string
): Promise<number | null> {
  const { data } = await supabase
    .from("users")
    .select("x_bot_chat_id")
    .eq("id", userId)
    .single();
  return data?.x_bot_chat_id ?? null;
}

// ─── Email-based account linking ───

export async function linkByEmail(
  email: string,
  chatId: number
): Promise<{ userId: string } | { error: string }> {
  const normalized = email.trim().toLowerCase();
  console.log(`[x-store] linkByEmail: email="${normalized}" chatId=${chatId}`);

  const { data: row, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", normalized)
    .single();

  if (error || !row) {
    console.log(`[x-store] No user found for email "${normalized}"`);
    return {
      error:
        "No account found with that email. Sign up at pingi-ai.vercel.app first, or type another email.",
    };
  }

  const { error: updateErr } = await supabase
    .from("users")
    .update({ x_bot_chat_id: chatId })
    .eq("id", row.id);

  if (updateErr) {
    console.error(`[x-store] Link failed:`, updateErr.message);
    return { error: "Failed to link account. Try again." };
  }

  console.log(
    `[x-store] SUCCESS: user ${row.id} linked to x-bot chat ${chatId}`
  );
  return { userId: row.id };
}

// ─── Watched accounts ───

export async function getWatchedAccounts(
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("user_topics")
    .select("topics")
    .eq("user_id", userId)
    .single();
  return (data?.topics as string[]) ?? [];
}

export async function setWatchedAccounts(
  userId: string,
  accounts: string[]
): Promise<boolean> {
  const { error } = await supabase.from("user_topics").upsert(
    {
      user_id: userId,
      topics: accounts,
    },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("[x-store] Failed to set watched accounts:", error.message);
    return false;
  }
  return true;
}

export async function addWatchedAccount(
  userId: string,
  handle: string
): Promise<boolean> {
  const current = await getWatchedAccounts(userId);
  const normalized = handle.replace(/^@/, "").toLowerCase();
  if (current.includes(normalized)) return true;
  return setWatchedAccounts(userId, [...current, normalized]);
}

export async function removeWatchedAccount(
  userId: string,
  handle: string
): Promise<boolean> {
  const current = await getWatchedAccounts(userId);
  const normalized = handle.replace(/^@/, "").toLowerCase();
  const filtered = current.filter((a) => a !== normalized);
  if (filtered.length === current.length) return false;
  return setWatchedAccounts(userId, filtered);
}

// ─── Engagement items ───

export interface EngageItem {
  id: string;
  tweetId: string;
  tweetUrl: string;
  authorName: string;
  authorHandle: string;
  authorFollowers: number;
  tweetText: string;
  draftComment: string;
  status: "pending" | "posted" | "skipped";
}

export async function insertEngageItem(
  userId: string,
  item: Omit<EngageItem, "id" | "status">
): Promise<string | null> {
  const row = {
    user_id: userId,
    tweet_id: item.tweetId,
    tweet_url: item.tweetUrl,
    author_name: item.authorName,
    author_handle: item.authorHandle,
    author_followers: item.authorFollowers,
    tweet_text: item.tweetText,
    draft_comment: item.draftComment,
    status: "pending",
  };
  console.log("[x-store] insertEngageItem row:", JSON.stringify(row, null, 2));

  const { data, error } = await supabase
    .from("x_engage_items")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("[x-store] Insert engage item failed:", error.message);
    return null;
  }
  return data!.id;
}

export async function getEngageItem(
  id: string
): Promise<EngageItem | null> {
  const { data } = await supabase
    .from("x_engage_items")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) return null;
  return {
    id: data.id,
    tweetId: data.tweet_id,
    tweetUrl: data.tweet_url,
    authorName: data.author_name,
    authorHandle: data.author_handle,
    authorFollowers: data.author_followers,
    tweetText: data.tweet_text,
    draftComment: data.draft_comment,
    status: data.status,
  };
}

export async function markPosted(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("x_engage_items")
    .update({ status: "posted", posted_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}

export async function markSkipped(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("x_engage_items")
    .update({ status: "skipped" })
    .eq("id", id);
  return !error;
}

export async function updateDraftComment(
  id: string,
  newDraft: string
): Promise<boolean> {
  const { error } = await supabase
    .from("x_engage_items")
    .update({ draft_comment: newDraft })
    .eq("id", id);
  return !error;
}

export async function hasSeenTweet(
  userId: string,
  tweetId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("x_engage_items")
    .select("id")
    .eq("user_id", userId)
    .eq("tweet_id", tweetId)
    .single();
  return !!data;
}

export async function countPostedLastHour(
  userId: string
): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count } = await supabase
    .from("x_engage_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "posted")
    .gte("posted_at", oneHourAgo);
  return count ?? 0;
}

/** Get all user IDs that have watched accounts configured. */
export async function getUsersWithAccounts(): Promise<
  { userId: string; accounts: string[] }[]
> {
  const { data, error } = await supabase
    .from("user_topics")
    .select("user_id, topics");

  if (error || !data) return [];
  return data
    .filter((r: any) => Array.isArray(r.topics) && r.topics.length > 0)
    .map((r: any) => ({ userId: r.user_id, accounts: r.topics as string[] }));
}
