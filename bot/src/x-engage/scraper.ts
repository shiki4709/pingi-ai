/**
 * Twitter data layer for the X engagement bot.
 *
 * READING tweets: SocialData API (socialdata.tools) — no cookies needed.
 * POSTING/LIKING: Twitter API v2 (OAuth 1.0a) — kept from before.
 */

import { TwitterApi } from "twitter-api-v2";
import { config } from "./config.js";

// ─── Tweet type (matches SocialData response shape) ───

export interface Tweet {
  id: string;
  text: string;
  username: string;
  name: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  isRetweet: boolean;
  timeParsed: Date | null;
  permanentUrl: string;
}

// ─── SocialData API: fetch recent tweets from a handle ───

const SOCIALDATA_BASE = "https://api.socialdata.tools";

export async function getRecentTweets(
  handle: string,
  maxResults: number = 10
): Promise<Tweet[]> {
  const apiKey = config.socialDataApiKey;
  if (!apiKey) {
    console.warn("[scraper] SOCIALDATA_API_KEY not set, cannot fetch tweets");
    return [];
  }

  const query = `from:${handle.replace(/^@/, "")}`;
  const url = `${SOCIALDATA_BASE}/twitter/search?query=${encodeURIComponent(query)}&type=Latest`;

  try {
    console.log(`[scraper] SocialData search: "${query}"`);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[scraper] SocialData error: ${res.status} ${body.slice(0, 200)}`);
      return [];
    }

    const json = await res.json();
    const rawTweets: any[] = json.tweets ?? [];
    console.log(`[scraper] SocialData returned ${rawTweets.length} tweets for @${handle}`);

    const tweets: Tweet[] = [];
    for (const t of rawTweets) {
      if (tweets.length >= maxResults) break;

      const isRT = !!(t.retweeted_status || t.full_text?.startsWith("RT @"));

      tweets.push({
        id: t.id_str ?? String(t.id ?? ""),
        text: t.full_text ?? t.text ?? "",
        username: t.user?.screen_name ?? handle,
        name: t.user?.name ?? handle,
        likes: t.favorite_count ?? 0,
        retweets: t.retweet_count ?? 0,
        replies: t.reply_count ?? 0,
        views: t.views_count ?? 0,
        isRetweet: isRT,
        timeParsed: t.tweet_created_at ? new Date(t.tweet_created_at) : null,
        permanentUrl: `https://x.com/${t.user?.screen_name ?? handle}/status/${t.id_str ?? t.id}`,
      });
    }

    return tweets;
  } catch (e: any) {
    console.error(`[scraper] SocialData fetch failed for @${handle}:`, e.message);
    return [];
  }
}

// ─── SocialData API: search for Twitter users by name ───

export interface TwitterUser {
  username: string;
  name: string;
  followers: number;
  description: string;
}

export async function searchTwitterUsers(
  query: string,
  maxResults: number = 5
): Promise<TwitterUser[]> {
  const apiKey = config.socialDataApiKey;
  if (!apiKey) return [];

  // Search recent tweets mentioning this name, extract unique users
  const url = `${SOCIALDATA_BASE}/twitter/search?query=${encodeURIComponent(query)}&type=Latest`;

  try {
    console.log(`[scraper] User search: "${query}"`);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) return [];

    const json = await res.json();
    const rawTweets: any[] = json.tweets ?? [];

    // Extract unique users from tweet authors
    const seen = new Set<string>();
    const users: TwitterUser[] = [];

    for (const t of rawTweets) {
      const handle = t.user?.screen_name;
      if (!handle || seen.has(handle.toLowerCase())) continue;
      seen.add(handle.toLowerCase());

      users.push({
        username: handle,
        name: t.user?.name ?? handle,
        followers: t.user?.followers_count ?? 0,
        description: (t.user?.description ?? "").slice(0, 100),
      });

      if (users.length >= maxResults) break;
    }

    // Sort by followers descending
    users.sort((a, b) => b.followers - a.followers);
    console.log(`[scraper] User search for "${query}": found ${users.length} users`);
    return users;
  } catch (e: any) {
    console.error(`[scraper] User search failed for "${query}":`, e.message);
    return [];
  }
}

// ─── SocialData API: search tweets by topic/keyword ───

export async function searchTopicTweets(
  topic: string,
  maxResults: number = 10
): Promise<Tweet[]> {
  const apiKey = config.socialDataApiKey;
  if (!apiKey) {
    console.warn("[scraper] SOCIALDATA_API_KEY not set, cannot search topics");
    return [];
  }

  const query = `${topic} min_retweets:5 lang:en`;
  const url = `${SOCIALDATA_BASE}/twitter/search?query=${encodeURIComponent(query)}&type=Latest`;

  try {
    console.log(`[scraper] SocialData topic search: "${query}"`);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[scraper] SocialData error: ${res.status} ${body.slice(0, 200)}`);
      return [];
    }

    const json = await res.json();
    const rawTweets: any[] = json.tweets ?? [];
    console.log(`[scraper] SocialData returned ${rawTweets.length} tweets for topic "${topic}"`);

    const tweets: Tweet[] = [];
    for (const t of rawTweets) {
      if (tweets.length >= maxResults) break;

      const isRT = !!(t.retweeted_status || t.full_text?.startsWith("RT @"));
      if (isRT) continue;

      const views = t.views_count ?? 0;
      if (views < 5000) continue;

      const handle = t.user?.screen_name ?? "";
      tweets.push({
        id: t.id_str ?? String(t.id ?? ""),
        text: t.full_text ?? t.text ?? "",
        username: handle,
        name: t.user?.name ?? handle,
        likes: t.favorite_count ?? 0,
        retweets: t.retweet_count ?? 0,
        replies: t.reply_count ?? 0,
        views,
        isRetweet: false,
        timeParsed: t.tweet_created_at ? new Date(t.tweet_created_at) : null,
        permanentUrl: `https://x.com/${handle}/status/${t.id_str ?? t.id}`,
      });
    }

    return tweets;
  } catch (e: any) {
    console.error(`[scraper] SocialData topic search failed for "${topic}":`, e.message);
    return [];
  }
}

// ─── Diagnostic: test SocialData API ───

export async function runDiagnostic(): Promise<void> {
  const apiKey = config.socialDataApiKey;
  if (!apiKey) {
    console.log("[scraper-diag] SOCIALDATA_API_KEY not set, skipping diagnostic");
    return;
  }

  console.log("[scraper-diag] === Testing SocialData API ===");

  try {
    const tweets = await getRecentTweets("elonmusk", 3);
    console.log(`[scraper-diag] getRecentTweets("elonmusk"): got ${tweets.length} tweets`);
    if (tweets.length > 0) {
      console.log(`[scraper-diag]   first: "${tweets[0].text.slice(0, 80)}..." (${tweets[0].likes} likes)`);
    }
  } catch (e: any) {
    console.log(`[scraper-diag] getRecentTweets: FAIL — ${e.message}`);
  }

  console.log("[scraper-diag] === Diagnostic complete ===");
}

// ─── Twitter API v2 (OAuth 1.0a) for posting/liking ───

let twitterClient: TwitterApi | null = null;

function getTwitterClient(): TwitterApi | null {
  if (twitterClient) return twitterClient;

  const { twitterApiKey, twitterApiSecret, twitterAccessToken, twitterAccessSecret } = config;
  if (!twitterApiKey || !twitterApiSecret || !twitterAccessToken || !twitterAccessSecret) {
    console.warn("[scraper] Twitter API v2 not configured (missing TWITTER_API_KEY/SECRET/ACCESS_TOKEN/ACCESS_SECRET)");
    return null;
  }

  twitterClient = new TwitterApi({
    appKey: twitterApiKey,
    appSecret: twitterApiSecret,
    accessToken: twitterAccessToken,
    accessSecret: twitterAccessSecret,
  });

  console.log("[scraper] Twitter API v2 client initialized");
  return twitterClient;
}

export async function postQuote(
  tweetId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  console.log(`[scraper] postQuote: tweetId=${tweetId} text="${text.slice(0, 80)}..."`);

  const client = getTwitterClient();
  if (!client) {
    return { ok: false, error: "Twitter API not configured. Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET." };
  }

  try {
    const result = await client.v2.tweet({ text, quote_tweet_id: tweetId });
    console.log(`[scraper] Quote tweet posted: id=${result.data.id} text="${result.data.text?.slice(0, 80)}"`);
    return { ok: true };
  } catch (e: any) {
    console.error("[scraper] Quote tweet failed:", e.message);
    if (e.data) {
      console.error("[scraper] Quote tweet error data:", JSON.stringify(e.data));
    }
    return { ok: false, error: e.message };
  }
}

// Cache authenticated user ID for like endpoint
let cachedUserId: string | null = null;

async function getAuthenticatedUserId(): Promise<string | null> {
  if (cachedUserId) return cachedUserId;

  const client = getTwitterClient();
  if (!client) return null;

  try {
    const me = await client.v2.me();
    cachedUserId = me.data.id;
    console.log(`[scraper] Authenticated as @${me.data.username} (id=${cachedUserId})`);
    return cachedUserId;
  } catch (e: any) {
    console.error("[scraper] Failed to get authenticated user:", e.message);
    return null;
  }
}

export async function likeTweet(
  tweetId: string
): Promise<{ ok: boolean; error?: string }> {
  console.log(`[scraper] likeTweet: tweetId=${tweetId}`);

  const client = getTwitterClient();
  if (!client) {
    return { ok: false, error: "Twitter API not configured." };
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { ok: false, error: "Could not determine authenticated user ID." };
  }

  try {
    await client.v2.like(userId, tweetId);
    console.log(`[scraper] Liked tweet ${tweetId}`);
    return { ok: true };
  } catch (e: any) {
    console.error("[scraper] Like failed:", e.message);
    if (e.data) {
      console.error("[scraper] Like error data:", JSON.stringify(e.data));
    }
    return { ok: false, error: e.message };
  }
}
