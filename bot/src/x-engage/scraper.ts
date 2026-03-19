/**
 * Twitter data layer for the X engagement bot.
 *
 * READING tweets: SocialData API (socialdata.tools) — no cookies needed.
 */

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

  const headers = { Authorization: `Bearer ${apiKey}` };

  // 1) Try exact username lookup (e.g. "naval" → @naval)
  const guessHandle = query.replace(/\s+/g, "").replace(/^@/, "").toLowerCase();
  try {
    console.log(`[scraper] User lookup: trying @${guessHandle}`);
    const profileRes = await fetch(
      `${SOCIALDATA_BASE}/twitter/user/${encodeURIComponent(guessHandle)}`,
      { headers }
    );
    if (profileRes.ok) {
      const p = await profileRes.json();
      if (p.screen_name) {
        const exact: TwitterUser = {
          username: p.screen_name,
          name: p.name ?? p.screen_name,
          followers: p.followers_count ?? 0,
          description: (p.description ?? "").slice(0, 100),
        };
        console.log(`[scraper] Exact match: @${exact.username} (${exact.followers} followers)`);
        // Still search for alternatives if the name is multi-word
        if (!query.includes(" ")) return [exact];
        // Multi-word: return exact match + search results
        const others = await searchUsersByTweets(query, headers, maxResults - 1);
        const seen = new Set([exact.username.toLowerCase()]);
        return [exact, ...others.filter((u) => !seen.has(u.username.toLowerCase()))].slice(0, maxResults);
      }
    }
  } catch {
    // Exact lookup failed, continue to search
  }

  // 2) Search tweets by people whose name matches, using quoted name search
  return searchUsersByTweets(query, headers, maxResults);
}

async function searchUsersByTweets(
  name: string,
  headers: Record<string, string>,
  maxResults: number
): Promise<TwitterUser[]> {
  // Search for tweets where the author's display name contains this name
  // Use quoted search to find tweets BY this person (their name appears in results)
  const searchQuery = `"${name}"`;
  const url = `${SOCIALDATA_BASE}/twitter/search?query=${encodeURIComponent(searchQuery)}&type=Top`;

  try {
    console.log(`[scraper] User search via tweets: "${searchQuery}"`);
    const res = await fetch(url, { headers });
    if (!res.ok) return [];

    const json = await res.json();
    const rawTweets: any[] = json.tweets ?? [];

    // Extract users, preferring those whose display name matches the query
    const seen = new Set<string>();
    const matches: TwitterUser[] = [];
    const others: TwitterUser[] = [];
    const nameLower = name.toLowerCase();

    for (const t of rawTweets) {
      const handle = t.user?.screen_name;
      if (!handle || seen.has(handle.toLowerCase())) continue;
      seen.add(handle.toLowerCase());

      const user: TwitterUser = {
        username: handle,
        name: t.user?.name ?? handle,
        followers: t.user?.followers_count ?? 0,
        description: (t.user?.description ?? "").slice(0, 100),
      };

      // Prioritize users whose name or handle contains the search term
      const displayLower = user.name.toLowerCase();
      const handleLower = handle.toLowerCase();
      if (displayLower.includes(nameLower) || handleLower.includes(nameLower.replace(/\s+/g, ""))) {
        matches.push(user);
      } else {
        others.push(user);
      }
    }

    // Sort each group by followers
    matches.sort((a, b) => b.followers - a.followers);
    others.sort((a, b) => b.followers - a.followers);

    const result = [...matches, ...others].slice(0, maxResults);
    console.log(`[scraper] User search for "${name}": ${matches.length} name matches, ${others.length} others`);
    return result;
  } catch (e: any) {
    console.error(`[scraper] User search failed for "${name}":`, e.message);
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
