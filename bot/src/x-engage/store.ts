/**
 * Supabase data layer for the X engagement bot.
 * Manages users, link codes, topics, and engagement items.
 */

import { getSupabase } from "./supabase.js";

// ─── User management ───

export async function ensureUser(
  chatId: number,
  firstName?: string
): Promise<string> {
  // Check if user already linked to this X bot chat
  const { data: existing } = await getSupabase()
    .from("users")
    .select("id")
    .eq("x_bot_chat_id", chatId)
    .single();

  if (existing) return existing.id;

  // Create new user row (will be linked to web account via /link)
  const { data: created, error } = await getSupabase()
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
  const { data } = await getSupabase()
    .from("users")
    .select("id")
    .eq("x_bot_chat_id", chatId)
    .single();
  return data?.id ?? null;
}

export async function getChatIdForUser(
  userId: string
): Promise<number | null> {
  const { data } = await getSupabase()
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
  const sb = getSupabase();
  console.log(`[x-store] linkByEmail: email="${normalized}" chatId=${chatId}`);

  const { data: row, error } = await sb
    .from("users")
    .select("id, email")
    .eq("email", normalized)
    .single();

  if (error || !row) {
    console.log(`[x-store] No user found for email "${normalized}"`);
    return {
      error:
        "No account found with that email. Sign up at pingi-ai.vercel.app first, or type another email.",
    };
  }

  const { error: updateErr } = await getSupabase()
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
  const { data } = await getSupabase()
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
  const { error } = await getSupabase().from("user_topics").upsert(
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

// ─── Search topics ───

export async function getSearchTopics(
  userId: string
): Promise<string[]> {
  const { data } = await getSupabase()
    .from("user_topics")
    .select("search_topics")
    .eq("user_id", userId)
    .single();
  return (data?.search_topics as string[]) ?? [];
}

export async function setSearchTopics(
  userId: string,
  topics: string[]
): Promise<boolean> {
  const { error } = await getSupabase().from("user_topics").upsert(
    {
      user_id: userId,
      search_topics: topics,
    },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("[x-store] Failed to set search topics:", error.message);
    return false;
  }
  return true;
}

export async function addSearchTopics(
  userId: string,
  newTopics: string[]
): Promise<boolean> {
  const current = await getSearchTopics(userId);
  const normalized = newTopics.map((t) => t.trim().toLowerCase()).filter(Boolean);
  const merged = [...new Set([...current, ...normalized])];
  return setSearchTopics(userId, merged);
}

export async function removeSearchTopic(
  userId: string,
  topic: string
): Promise<boolean> {
  const current = await getSearchTopics(userId);
  const normalized = topic.trim().toLowerCase();
  const filtered = current.filter((t) => t !== normalized);
  if (filtered.length === current.length) return false;
  return setSearchTopics(userId, filtered);
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

  const { data, error } = await getSupabase()
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
  const { data } = await getSupabase()
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
  const { error } = await getSupabase()
    .from("x_engage_items")
    .update({ status: "posted", posted_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}

export async function markSkipped(id: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from("x_engage_items")
    .update({ status: "skipped" })
    .eq("id", id);
  return !error;
}

export async function updateDraftComment(
  id: string,
  newDraft: string
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("x_engage_items")
    .update({ draft_comment: newDraft })
    .eq("id", id);
  return !error;
}

export async function getRecentEngageItems(
  userId: string,
  limit: number = 10
): Promise<EngageItem[]> {
  const { data } = await getSupabase()
    .from("x_engage_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];
  return data.map((d: any) => ({
    id: d.id,
    tweetId: d.tweet_id,
    tweetUrl: d.tweet_url,
    authorName: d.author_name,
    authorHandle: d.author_handle,
    authorFollowers: d.author_followers,
    tweetText: d.tweet_text,
    draftComment: d.draft_comment,
    status: d.status,
  }));
}

export async function hasSeenTweet(
  userId: string,
  tweetId: string
): Promise<boolean> {
  const { data } = await getSupabase()
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
  const { count } = await getSupabase()
    .from("x_engage_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "posted")
    .gte("posted_at", oneHourAgo);
  return count ?? 0;
}

// ─── Plan helpers ───

const ADMIN_EMAILS = ["shiki4709@gmail.com"];

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

// ─── X cookies (per-user auth) ───

export interface UserXCookies {
  authToken: string;
  ct0: string;
}

export async function getXCookies(
  userId: string
): Promise<UserXCookies | null> {
  const { data } = await getSupabase()
    .from("users")
    .select("x_auth_token, x_ct0")
    .eq("id", userId)
    .single();

  if (!data?.x_auth_token || !data?.x_ct0) return null;
  return { authToken: data.x_auth_token, ct0: data.x_ct0 };
}

export async function setXCookies(
  userId: string,
  authToken: string,
  ct0: string
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("users")
    .update({ x_auth_token: authToken, x_ct0: ct0 })
    .eq("id", userId);
  if (error) {
    console.error("[x-store] Failed to save X cookies:", error.message);
    return false;
  }
  return true;
}

/** Get all user IDs that have watched accounts or search topics configured. */
export async function getUsersWithAccounts(): Promise<
  { userId: string; accounts: string[]; searchTopics: string[] }[]
> {
  const { data, error } = await getSupabase()
    .from("user_topics")
    .select("user_id, topics, search_topics");

  if (error || !data) return [];
  return data
    .filter((r: any) => {
      const hasAccounts = Array.isArray(r.topics) && r.topics.length > 0;
      const hasTopics = Array.isArray(r.search_topics) && r.search_topics.length > 0;
      return hasAccounts || hasTopics;
    })
    .map((r: any) => ({
      userId: r.user_id,
      accounts: (r.topics as string[]) ?? [],
      searchTopics: (r.search_topics as string[]) ?? [],
    }));
}
