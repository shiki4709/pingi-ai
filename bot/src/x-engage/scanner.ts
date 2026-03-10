/**
 * Periodic scanner that fetches tweets from watched accounts and sends engagement cards.
 * Runs every 30 minutes. For each user's watched accounts, fetches recent tweets,
 * filters to last 6 hours, drafts replies via Claude, and sends to Telegram.
 */

import { getRecentTweets, getScraperForUser, getScraper, runDiagnostic, type Tweet } from "./scraper.js";
import type { Scraper } from "@the-convocation/twitter-scraper";
import { draftComment } from "./drafter.js";
import {
  getUsersWithAccounts,
  getChatIdForUser,
  hasSeenTweet,
  insertEngageItem,
  countPostedLastHour,
  hasPro,
  isTrialExpired,
  getXCookies,
} from "./store.js";
import { pushItemCard } from "./handlers.js";
import { sendMessage } from "./telegram.js";

const SCAN_INTERVAL_MS = 30 * 60_000; // 30 minutes
const MAX_POSTS_PER_HOUR = 5;
const MAX_AGE_HOURS = 6;
const TWEETS_PER_ACCOUNT = 5;

let scanTimer: ReturnType<typeof setInterval> | null = null;
let diagnosticDone = false;

export function startScanner(): void {
  console.log("[scanner] Starting periodic scan (every 30min)");
  setTimeout(async () => {
    if (!diagnosticDone) {
      await runDiagnostic();
      diagnosticDone = true;
    }
    await runScan();
  }, 10_000);
  scanTimer = setInterval(() => runScan(), SCAN_INTERVAL_MS);
}

export function stopScanner(): void {
  if (scanTimer) {
    clearInterval(scanTimer);
    scanTimer = null;
    console.log("[scanner] Stopped");
  }
}

async function runScan(): Promise<void> {
  console.log("[scanner] Scan starting...");

  const users = await getUsersWithAccounts();
  if (users.length === 0) {
    console.log("[scanner] No users with watched accounts, skipping");
    return;
  }

  for (const { userId, accounts } of users) {
    try {
      await scanForUser(userId, accounts);
    } catch (e: any) {
      console.error(`[scanner] Error scanning for user ${userId}:`, e.message);
    }
  }

  console.log("[scanner] Scan complete");
}

export async function scanForUser(
  userId: string,
  accounts: string[],
  chatIdOverride?: number
): Promise<number> {
  const chatId = chatIdOverride ?? (await getChatIdForUser(userId));
  if (!chatId) {
    console.log(`[scanner] User ${userId} has no linked chat, skipping`);
    return 0;
  }

  // Check trial/plan status
  if (await isTrialExpired(userId)) {
    await sendMessage({
      chat_id: chatId,
      text: "Your free trial ended. Upgrade to Pro for $19/mo to keep unlimited access: https://pingi-ai.vercel.app/pricing",
    });
    console.log(`[scanner] User ${userId} trial expired, skipping scan`);
    return 0;
  }

  const postedCount = await countPostedLastHour(userId);
  if (postedCount >= MAX_POSTS_PER_HOUR) {
    console.log(`[scanner] User ${userId} at rate limit (${postedCount}/${MAX_POSTS_PER_HOUR})`);
    return 0;
  }

  // Load per-user scraper (DB cookies), fall back to global
  let userScraper: Scraper | null = null;
  const cookies = await getXCookies(userId);
  if (cookies) {
    userScraper = await getScraperForUser(cookies.authToken, cookies.ct0, userId);
    if (userScraper) {
      console.log(`[scanner] Using per-user cookies for ${userId.slice(0, 8)}`);
    } else {
      console.log(`[scanner] Per-user cookies invalid for ${userId.slice(0, 8)}, trying global`);
    }
  }
  if (!userScraper) {
    userScraper = await getScraper();
  }
  if (!userScraper) {
    console.log(`[scanner] No scraper available for user ${userId}, skipping`);
    return 0;
  }

  const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60_000);
  let itemsSent = 0;

  for (const handle of accounts) {
    if (postedCount + itemsSent >= MAX_POSTS_PER_HOUR) break;

    console.log(`[scanner] Fetching tweets from @${handle} for user ${userId}`);
    const tweets = await getRecentTweets(handle, TWEETS_PER_ACCOUNT, userScraper);
    console.log(`[scanner]   Got ${tweets.length} tweets from @${handle}`);

    for (const tweet of tweets) {
      if (postedCount + itemsSent >= MAX_POSTS_PER_HOUR) break;

      // Filter
      if (!tweet.text?.trim()) continue;
      if (tweet.isRetweet) continue;
      if (tweet.timeParsed && tweet.timeParsed < cutoff) continue;

      const tweetId = tweet.id ?? "";
      if (!tweetId) continue;

      // Skip already seen
      if (await hasSeenTweet(userId, tweetId)) continue;

      // Draft a reply
      const draft = await draftComment(tweet);
      if (!draft) continue;

      const authorHandle = tweet.username ?? handle;
      const authorName = tweet.name ?? authorHandle;
      const tweetUrl = `https://x.com/${authorHandle}/status/${tweetId}`;

      // Store in DB
      const itemId = await insertEngageItem(userId, {
        tweetId,
        tweetUrl,
        authorName,
        authorHandle,
        authorFollowers: (tweet as any).followers ?? 0,
        tweetText: tweet.text ?? "",
        draftComment: draft,
      });

      if (!itemId) continue;

      // Push to Telegram
      await pushItemCard(chatId, {
        id: itemId,
        authorName,
        authorHandle,
        tweetText: tweet.text ?? "",
        tweetUrl,
        draftComment: draft,
      });

      itemsSent++;
      console.log(`[scanner] Sent item for @${authorHandle} tweet ${tweetId} to user ${userId}`);

      // Small delay between Claude calls
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`[scanner] User ${userId}: sent ${itemsSent} items this scan`);
  return itemsSent;
}
