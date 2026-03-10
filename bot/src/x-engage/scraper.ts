/**
 * Twitter scraper using @the-convocation/twitter-scraper.
 * Auth: TWITTER_COOKIES env var, or X_AUTH_TOKEN+X_CT0, or password login.
 * Posting uses raw GraphQL API since this library fork is read-only.
 *
 * Key insight: setCookies() with string cookies sets them against "https://x.com",
 * so Domain=.twitter.com gets rejected (domain mismatch). We pass Cookie objects
 * instead, which the library handles by stripping the leading dot and building
 * the correct URL.
 */

import { Scraper, SearchMode } from "@the-convocation/twitter-scraper";
import type { Tweet } from "@the-convocation/twitter-scraper";
import { Cookie } from "tough-cookie";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "./config.js";

export { SearchMode };
export type { Tweet };

const COOKIE_FILE = resolve(process.cwd(), ".x-cookies.json");

const BEARER =
  "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

// Global (fallback) scraper
let scraper: Scraper | null = null;
let loginPromise: Promise<void> | null = null;

// Per-user scraper cache: userId → Scraper
const userScrapers = new Map<string, Scraper>();

// Raw cookie values for GraphQL posting
let rawAuthToken = "";
let rawCt0 = "";

// ─── Build Cookie objects that the library accepts ───

function buildCookieObjects(authToken: string, ct0: string): Cookie[] {
  return [
    new Cookie({
      key: "auth_token",
      value: authToken,
      domain: "x.com",
      path: "/",
      secure: true,
      httpOnly: true,
    }),
    new Cookie({
      key: "ct0",
      value: ct0,
      domain: "x.com",
      path: "/",
      secure: true,
    }),
  ];
}

// ─── Cookie helpers ───

async function saveCookies(s: Scraper): Promise<void> {
  try {
    const cookies = await s.getCookies();
    await writeFile(COOKIE_FILE, JSON.stringify(cookies, null, 2));
    console.log(`[scraper] Cookies saved to ${COOKIE_FILE}`);
  } catch (e: any) {
    console.warn("[scraper] Failed to save cookies:", e.message);
  }
}

function extractTokensFromCookies(cookies: any[]): void {
  for (const c of cookies) {
    const key = c.key ?? c.name ?? "";
    if (key === "auth_token") rawAuthToken = c.value;
    if (key === "ct0") rawCt0 = c.value;
  }
}

// ─── Auth strategies ───

async function tryTwitterCookiesEnv(s: Scraper): Promise<boolean> {
  if (!config.twitterCookies) return false;

  console.log("[scraper] Trying TWITTER_COOKIES env var...");
  try {
    const parsed = JSON.parse(config.twitterCookies) as Array<{
      name: string;
      value: string;
      domain: string;
    }>;

    // Extract auth_token and ct0 from the JSON array
    let authToken = "";
    let ct0 = "";
    for (const c of parsed) {
      if (c.name === "auth_token") authToken = c.value;
      if (c.name === "ct0") ct0 = c.value;
    }

    if (!authToken || !ct0) {
      console.warn("[scraper]   TWITTER_COOKIES missing auth_token or ct0");
      return false;
    }

    rawAuthToken = authToken;
    rawCt0 = ct0;

    const cookieObjects = buildCookieObjects(authToken, ct0);
    console.log(`[scraper]   Setting ${cookieObjects.length} Cookie objects`);
    await s.setCookies(cookieObjects);

    const setCookies = await s.getCookies();
    console.log(`[scraper]   Cookies after setCookies: ${setCookies.length}`);
    for (const c of setCookies) {
      const obj = c as any;
      console.log(`[scraper]     ${obj.key}=${String(obj.value).slice(0, 10)}... (domain=${obj.domain})`);
    }

    const ok = await s.isLoggedIn();
    console.log(`[scraper]   isLoggedIn() = ${ok}`);
    if (ok) {
      console.log("[scraper] Authenticated via TWITTER_COOKIES");
      await saveCookies(s);
      return true;
    }

    return await verifyWithProfile(s, "TWITTER_COOKIES");
  } catch (e: any) {
    console.warn("[scraper] TWITTER_COOKIES failed:", e.message);
  }
  return false;
}

async function tryEnvTokens(s: Scraper): Promise<boolean> {
  if (!config.xAuthToken || !config.xCt0) return false;

  console.log("[scraper] Trying X_AUTH_TOKEN + X_CT0...");
  console.log(`[scraper]   X_AUTH_TOKEN: "${config.xAuthToken.slice(0, 10)}..." (${config.xAuthToken.length} chars)`);
  console.log(`[scraper]   X_CT0: "${config.xCt0.slice(0, 10)}..." (${config.xCt0.length} chars)`);

  rawAuthToken = config.xAuthToken;
  rawCt0 = config.xCt0;

  try {
    const cookieObjects = buildCookieObjects(config.xAuthToken, config.xCt0);
    await s.setCookies(cookieObjects);

    const setCookies = await s.getCookies();
    console.log(`[scraper]   Cookies after setCookies: ${setCookies.length}`);
    for (const c of setCookies) {
      const obj = c as any;
      console.log(`[scraper]     ${obj.key}=${String(obj.value).slice(0, 10)}... (domain=${obj.domain})`);
    }

    const ok = await s.isLoggedIn();
    console.log(`[scraper]   isLoggedIn() = ${ok}`);
    if (ok) {
      console.log("[scraper] Authenticated via X_AUTH_TOKEN + X_CT0");
      await saveCookies(s);
      return true;
    }

    return await verifyWithProfile(s, "X_AUTH_TOKEN+X_CT0");
  } catch (e: any) {
    console.warn("[scraper] X_AUTH_TOKEN+X_CT0 failed:", e.message);
  }
  return false;
}

async function tryFileCookies(s: Scraper): Promise<boolean> {
  try {
    const raw = await readFile(COOKIE_FILE, "utf-8");
    const cookies = JSON.parse(raw);
    if (!Array.isArray(cookies) || cookies.length === 0) return false;

    console.log(`[scraper] Cookie file found with ${cookies.length} cookies`);

    // Convert saved cookies to Cookie objects
    const cookieObjects = cookies.map((c: any) => {
      return new Cookie({
        key: c.key ?? c.name,
        value: c.value,
        domain: (c.domain ?? "x.com").replace(/^\./, ""),
        path: c.path ?? "/",
        secure: c.secure ?? true,
        httpOnly: c.httpOnly ?? false,
      });
    });

    extractTokensFromCookies(cookies);
    await s.setCookies(cookieObjects);

    const ok = await s.isLoggedIn();
    console.log(`[scraper]   file-cookies isLoggedIn() = ${ok}`);
    if (ok) {
      console.log("[scraper] Authenticated via cookie file");
      return true;
    }

    return await verifyWithProfile(s, "cookie-file");
  } catch {
    return false;
  }
}

async function tryPasswordLogin(s: Scraper): Promise<boolean> {
  if (!config.twitterUsername || !config.twitterPassword || !config.twitterEmail) {
    return false;
  }

  console.log(`[scraper] Trying password login as @${config.twitterUsername}...`);
  try {
    await s.login(config.twitterUsername, config.twitterPassword, config.twitterEmail);
    const ok = await s.isLoggedIn();
    console.log(`[scraper]   password isLoggedIn() = ${ok}`);
    if (ok) {
      console.log("[scraper] Authenticated via password login");
      const cookies = await s.getCookies();
      extractTokensFromCookies(cookies as any[]);
      await saveCookies(s);
      return true;
    }
    console.error("[scraper] Password login: isLoggedIn() false");
  } catch (e: any) {
    console.error("[scraper] Password login failed:", e.message);
  }
  return false;
}

async function verifyWithProfile(s: Scraper, label: string): Promise<boolean> {
  console.log(`[scraper]   ${label}: isLoggedIn() false, trying getProfile...`);
  try {
    const profile = await s.getProfile("elonmusk");
    if (profile && profile.username) {
      console.log(`[scraper]   ${label}: getProfile OK (@${profile.username}), session valid`);
      await saveCookies(s);
      return true;
    }
    console.log(`[scraper]   ${label}: getProfile returned empty`);
  } catch (e: any) {
    console.log(`[scraper]   ${label}: getProfile failed: ${e.message}`);
  }

  // Last resort: raw fetch test
  if (rawAuthToken && rawCt0) {
    console.log(`[scraper]   ${label}: trying raw GraphQL fetch...`);
    try {
      const variables = encodeURIComponent(JSON.stringify({ screen_name: "elonmusk" }));
      const features = encodeURIComponent(JSON.stringify({ hidden_profile_subscriptions_enabled: true }));
      const url = `https://twitter.com/i/api/graphql/NimuplG1OB7Fd2btCLdBOw/UserByScreenName?variables=${variables}&features=${features}`;

      const res = await fetch(url, {
        headers: {
          Cookie: `auth_token=${rawAuthToken}; ct0=${rawCt0}`,
          "x-csrf-token": rawCt0,
          authorization: BEARER,
        },
      });
      const body = await res.text();
      console.log(`[scraper]   Raw fetch status: ${res.status}, body: ${body.slice(0, 300)}`);

      if (res.ok) {
        console.log(`[scraper]   ${label}: raw fetch PASSED — cookies valid, library issue`);
        return true;
      }
    } catch (e: any) {
      console.log(`[scraper]   ${label}: raw fetch error: ${e.message}`);
    }
  }

  return false;
}

// ─── Main entry ───

export async function getScraper(): Promise<Scraper | null> {
  if (scraper) return scraper;
  if (loginPromise) {
    await loginPromise;
    return scraper;
  }

  const hasCookiesEnv = !!config.twitterCookies;
  const hasTokens = !!(config.xAuthToken && config.xCt0);
  const hasPassword = !!(config.twitterUsername && config.twitterPassword && config.twitterEmail);

  if (!hasCookiesEnv && !hasTokens && !hasPassword) {
    console.warn(
      "[scraper] No auth configured. Set TWITTER_COOKIES, or X_AUTH_TOKEN+X_CT0, or TWITTER_USERNAME+TWITTER_PASSWORD+TWITTER_EMAIL"
    );
    return null;
  }

  const s = new Scraper();
  loginPromise = (async () => {
    try {
      if (await tryFileCookies(s)) { scraper = s; return; }
      if (await tryTwitterCookiesEnv(s)) { scraper = s; return; }
      if (await tryEnvTokens(s)) { scraper = s; return; }
      if (await tryPasswordLogin(s)) { scraper = s; return; }

      console.error("[scraper] All auth methods failed");
    } catch (e: any) {
      console.error("[scraper] Auth error:", e.message);
    } finally {
      loginPromise = null;
    }
  })();

  await loginPromise;
  return scraper;
}

// ─── Per-user scraper (uses cookies stored in DB) ───

export async function getScraperForUser(
  authToken: string,
  ct0: string,
  userId?: string
): Promise<Scraper | null> {
  // Check cache
  if (userId && userScrapers.has(userId)) {
    return userScrapers.get(userId)!;
  }

  const s = new Scraper();
  try {
    const cookieObjects = buildCookieObjects(authToken, ct0);
    await s.setCookies(cookieObjects);

    // Quick verification
    const ok = await s.isLoggedIn();
    if (!ok) {
      // Try profile fallback
      const verified = await verifyWithProfile(s, `user-cookies${userId ? ` (${userId.slice(0, 8)})` : ""}`);
      if (!verified) {
        console.log(`[scraper] Per-user cookies invalid${userId ? ` for ${userId.slice(0, 8)}` : ""}`);
        return null;
      }
    }

    console.log(`[scraper] Per-user scraper authenticated${userId ? ` for ${userId.slice(0, 8)}` : ""}`);
    if (userId) userScrapers.set(userId, s);
    return s;
  } catch (e: any) {
    console.error(`[scraper] Per-user auth failed:`, e.message);
    return null;
  }
}

/** Clear cached scraper for a user (e.g., when cookies are updated). */
export function clearUserScraper(userId: string): void {
  userScrapers.delete(userId);
}

// ─── Diagnostic: test which methods work ───

export async function runDiagnostic(): Promise<void> {
  const s = await getScraper();
  if (!s) {
    console.log("[scraper-diag] No scraper available, skipping diagnostic");
    return;
  }

  console.log("[scraper-diag] === Testing available methods ===");

  // Test getProfile
  try {
    const profile = await s.getProfile("elonmusk");
    console.log(`[scraper-diag] getProfile: OK (@${profile?.username}, ${profile?.followersCount} followers)`);
  } catch (e: any) {
    console.log(`[scraper-diag] getProfile: FAIL — ${e.message}`);
  }

  // Test getLatestTweet
  try {
    const tweet = await s.getLatestTweet("elonmusk");
    console.log(`[scraper-diag] getLatestTweet: ${tweet ? `OK — "${tweet.text?.slice(0, 80)}..."` : "FAIL — returned null"}`);
  } catch (e: any) {
    console.log(`[scraper-diag] getLatestTweet: FAIL — ${e.message}`);
  }

  // Test getTweets (iterator)
  try {
    const iter = s.getTweets("elonmusk", 3);
    const tweets: Tweet[] = [];
    for await (const t of iter) {
      tweets.push(t);
      if (tweets.length >= 3) break;
    }
    console.log(`[scraper-diag] getTweets: OK — got ${tweets.length} tweets`);
    if (tweets.length > 0) {
      console.log(`[scraper-diag]   first tweet: "${tweets[0].text?.slice(0, 80)}..."`);
    }
  } catch (e: any) {
    console.log(`[scraper-diag] getTweets: FAIL — ${e.message}`);
  }

  // Test searchTweets
  try {
    const iter = s.searchTweets("AI agents", 3, SearchMode.Top);
    const tweets: Tweet[] = [];
    for await (const t of iter) {
      tweets.push(t);
      if (tweets.length >= 3) break;
    }
    console.log(`[scraper-diag] searchTweets: OK — got ${tweets.length} tweets`);
  } catch (e: any) {
    console.log(`[scraper-diag] searchTweets: FAIL — ${e.message}`);
  }

  console.log("[scraper-diag] === Diagnostic complete ===");
}

// ─── Fetch recent tweets from a specific account ───

export async function getRecentTweets(
  handle: string,
  maxResults: number = 10,
  scraperOverride?: Scraper | null
): Promise<Tweet[]> {
  const s = scraperOverride ?? await getScraper();
  if (!s) return [];

  const tweets: Tweet[] = [];
  try {
    const iter = s.getTweets(handle, maxResults);
    for await (const tweet of iter) {
      tweets.push(tweet);
      if (tweets.length >= maxResults) break;
    }
  } catch (e: any) {
    console.error(`[scraper] getTweets failed for @${handle}:`, e.message);

    // Fallback: try getLatestTweet
    if (tweets.length === 0) {
      try {
        const latest = await s.getLatestTweet(handle);
        if (latest) tweets.push(latest);
      } catch (e2: any) {
        console.error(`[scraper] getLatestTweet fallback failed for @${handle}:`, e2.message);
      }
    }
  }
  return tweets;
}

// ─── Search (may 404 on some library versions) ───

export async function searchTopTweets(
  query: string,
  maxResults: number = 20
): Promise<Tweet[]> {
  const s = await getScraper();
  if (!s) return [];

  const tweets: Tweet[] = [];
  try {
    const iter = s.searchTweets(query, maxResults, SearchMode.Top);
    for await (const tweet of iter) {
      tweets.push(tweet);
    }
  } catch (e: any) {
    console.error(`[scraper] searchTweets failed for "${query}":`, e.message);
  }
  return tweets;
}

// ─── Post reply via Twitter API v2 (OAuth 1.0a) ───

import { TwitterApi } from "twitter-api-v2";

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
