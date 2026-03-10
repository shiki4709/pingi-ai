/**
 * Periodic scanner that fetches tweets from watched accounts AND search topics,
 * then sends engagement cards. Runs every 30 minutes.
 */

import { getRecentTweets, searchTopicTweets, runDiagnostic } from "./scraper.js";
import { draftComment } from "./drafter.js";
import {
  getUsersWithAccounts,
  getChatIdForUser,
  getSearchTopics,
  hasSeenTweet,
  insertEngageItem,
  countPostedLastHour,
  hasPro,
  isTrialExpired,
} from "./store.js";
import { pushItemCard } from "./handlers.js";
import { sendMessage } from "./telegram.js";

const SCAN_INTERVAL_MS = 30 * 60_000; // 30 minutes
const MAX_POSTS_PER_HOUR = 5;
const MAX_AGE_HOURS = 24;
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

  for (const { userId, accounts, searchTopics } of users) {
    try {
      await scanForUser(userId, accounts, undefined, searchTopics);
    } catch (e: any) {
      console.error(`[scanner] Error scanning for user ${userId}:`, e.message);
    }
  }

  console.log("[scanner] Scan complete");
}

export async function scanForUser(
  userId: string,
  accounts: string[],
  chatIdOverride?: number,
  searchTopicsOverride?: string[]
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

  const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60_000);
  let itemsSent = 0;

  // --- Watched accounts ---
  for (const handle of accounts) {
    if (postedCount + itemsSent >= MAX_POSTS_PER_HOUR) break;

    console.log(`[scanner] Fetching tweets from @${handle} for user ${userId}`);
    const tweets = await getRecentTweets(handle, TWEETS_PER_ACCOUNT);
    console.log(`[scanner]   Got ${tweets.length} tweets from @${handle}`);

    itemsSent += await processTweets(tweets, userId, chatId, cutoff, postedCount + itemsSent);
  }

  // --- Search topics ---
  const topics = searchTopicsOverride ?? await getSearchTopics(userId);
  for (const topic of topics) {
    if (postedCount + itemsSent >= MAX_POSTS_PER_HOUR) break;

    console.log(`[scanner] Searching topic "${topic}" for user ${userId}`);
    const tweets = await searchTopicTweets(topic, TWEETS_PER_ACCOUNT);
    console.log(`[scanner]   Got ${tweets.length} tweets for topic "${topic}"`);

    itemsSent += await processTweets(tweets, userId, chatId, cutoff, postedCount + itemsSent);
  }

  console.log(`[scanner] User ${userId}: sent ${itemsSent} items this scan`);
  return itemsSent;
}

async function processTweets(
  tweets: Awaited<ReturnType<typeof getRecentTweets>>,
  userId: string,
  chatId: number,
  cutoff: Date,
  currentCount: number
): Promise<number> {
  let sent = 0;

  for (const tweet of tweets) {
    if (currentCount + sent >= MAX_POSTS_PER_HOUR) break;

    if (!tweet.text?.trim()) { console.log(`[scanner]   skip: empty text`); continue; }
    if (tweet.isRetweet) { console.log(`[scanner]   skip: retweet`); continue; }
    if (tweet.timeParsed && tweet.timeParsed < cutoff) {
      console.log(`[scanner]   skip: too old (${tweet.timeParsed.toISOString()} < ${cutoff.toISOString()}) tweet=${tweet.id}`);
      continue;
    }

    const tweetId = tweet.id ?? "";
    if (!tweetId) { console.log(`[scanner]   skip: no id`); continue; }

    if (await hasSeenTweet(userId, tweetId)) { console.log(`[scanner]   skip: already seen ${tweetId}`); continue; }

    console.log(`[scanner]   drafting for tweet ${tweetId} by @${tweet.username}`);
    const draft = await draftComment(tweet);
    if (!draft) { console.log(`[scanner]   skip: draft failed for ${tweetId}`); continue; }

    const authorHandle = tweet.username ?? "";
    const authorName = tweet.name ?? authorHandle;
    const tweetUrl = tweet.permanentUrl;

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

    await pushItemCard(chatId, {
      id: itemId,
      authorName,
      authorHandle,
      tweetText: tweet.text ?? "",
      tweetUrl,
      draftComment: draft,
    });

    sent++;
    console.log(`[scanner] Sent item for @${authorHandle} tweet ${tweetId} to user ${userId}`);

    await new Promise((r) => setTimeout(r, 500));
  }

  return sent;
}
