/**
 * Trending niche scanner.
 * Finds high-opportunity reply targets by searching for hot tweets
 * matching the user's niche profile, scoring them with an LLM,
 * and pushing the best ones to Telegram.
 */

import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import {
  getUsersWithNicheProfiles,
  insertEngageItem,
  type NicheProfile,
} from "./store.js";
import { searchTopicTweets, type Tweet } from "./scraper.js";
import { sendMessage, inlineButtons } from "./telegram.js";
import { getSupabase } from "./supabase.js";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TRENDING_PER_HOUR = 5;
const MAX_TWEET_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours
const MIN_SCORE = 7;

let trendingTimer: ReturnType<typeof setInterval> | null = null;

// ─── Scanner lifecycle ───

export function startTrendingScanner(): void {
  if (trendingTimer) return;
  console.log(`[trending] Starting trending scanner (interval: ${config.trendingScanIntervalMs / 60_000}min)`);

  // First run after 30 seconds
  setTimeout(() => {
    runTrendingScan().catch((err) =>
      console.error("[trending] Scan failed:", err)
    );
  }, 30_000);

  trendingTimer = setInterval(() => {
    runTrendingScan().catch((err) =>
      console.error("[trending] Scan failed:", err)
    );
  }, config.trendingScanIntervalMs);
}

export function stopTrendingScanner(): void {
  if (trendingTimer) {
    clearInterval(trendingTimer);
    trendingTimer = null;
    console.log("[trending] Scanner stopped");
  }
}

// ─── Main scan loop ───

async function runTrendingScan(): Promise<void> {
  const usersWithProfiles = await getUsersWithNicheProfiles();
  if (usersWithProfiles.length === 0) return;

  console.log(`[trending] Scanning for ${usersWithProfiles.length} user(s)`);

  for (const { user_id, telegram_chat_id, niche } of usersWithProfiles) {
    try {
      await scanTrendingForUser(user_id, telegram_chat_id, niche);
    } catch (err: any) {
      console.error(`[trending] Error for user ${user_id}:`, err.message);
    }
  }
}

async function scanTrendingForUser(
  userId: string,
  chatId: number,
  niche: NicheProfile
): Promise<void> {
  // Check how many trending items sent in last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await getSupabase()
    .from("x_engage_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("source_type", "trending")
    .gte("created_at", oneHourAgo);

  if ((recentCount ?? 0) >= MAX_TRENDING_PER_HOUR) {
    console.log(`[trending] User ${userId} hit hourly limit (${recentCount}/${MAX_TRENDING_PER_HOUR})`);
    return;
  }

  const remaining = MAX_TRENDING_PER_HOUR - (recentCount ?? 0);

  // Fetch candidate tweets from all trending queries
  const allCandidates: Tweet[] = [];
  for (const query of niche.trending_queries) {
    const tweets = await searchTopicTweets(query, 15);
    allCandidates.push(...tweets);
  }

  if (allCandidates.length === 0) return;

  // Filter by age (< 2 hours) and follower threshold
  const now = Date.now();
  const minFollowers = (niche.x_follower_count || 100) * 5;
  const fresh = allCandidates.filter((t) => {
    if (!t.timeParsed) return false;
    const age = now - t.timeParsed.getTime();
    if (age < 0 || age > MAX_TWEET_AGE_MS) return false;
    // Use followers from the tweet data if available
    const followers = (t as any).followers ?? t.views ?? 0;
    if (followers < minFollowers) return false;
    return true;
  });

  if (fresh.length === 0) return;

  // Dedup against existing items for this user
  const tweetIds = fresh.map((t) => t.id);
  const { data: existing } = await getSupabase()
    .from("x_engage_items")
    .select("tweet_id")
    .eq("user_id", userId)
    .in("tweet_id", tweetIds);

  const existingIds = new Set((existing ?? []).map((e: any) => e.tweet_id));
  const newTweets = fresh.filter((t) => !existingIds.has(t.id));

  if (newTweets.length === 0) return;

  // Batch LLM scoring
  const scored = await scoreTweets(newTweets, niche);
  const topTweets = scored
    .filter((s) => s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, remaining);

  if (topTweets.length === 0) return;

  console.log(`[trending] Found ${topTweets.length} high-score tweets for user ${userId}`);

  // Draft and push each
  for (const { tweet, score } of topTweets) {
    const draft = await draftTrendingReply(tweet, niche);
    if (!draft) continue;

    const itemId = await insertEngageItem(
      userId,
      {
        tweetId: tweet.id,
        tweetUrl: tweet.permanentUrl,
        authorName: tweet.name,
        authorHandle: tweet.username,
        authorFollowers: (tweet as any).followers ?? 0,
        tweetText: tweet.text,
        draftComment: draft,
      },
      { type: "trending", value: "niche" }
    );

    if (!itemId) continue;

    // Push to Telegram
    const ageMin = Math.round((now - (tweet.timeParsed?.getTime() ?? now)) / 60_000);
    const urgency = ageMin < 30 ? "Reply now for best visibility" : `Posted ${ageMin}min ago`;

    const text = [
      `*Trending in your niche* \\(score: ${score}/10\\)`,
      ``,
      `*${escMd(tweet.name)}* \\(@${escMd(tweet.username)}\\)`,
      ``,
      escMd(tweet.text.slice(0, 500)),
      ``,
      `\u2014\u2014\u2014`,
      `*Draft reply:*`,
      escMd(draft),
      ``,
      `_${escMd(urgency)}_`,
    ].join("\n");

    const markup = inlineButtons([
      [
        { text: "Post", data: `post:${itemId}` },
        { text: "Edit", data: `edit:${itemId}` },
        { text: "Skip", data: `skip:${itemId}` },
      ],
      [{ text: "View tweet", url: tweet.permanentUrl }],
    ]);

    await sendMessage({
      chat_id: chatId,
      text,
      parse_mode: "MarkdownV2",
      reply_markup: markup,
    });
  }
}

// ─── LLM batch scoring ───

interface ScoredTweet {
  tweet: Tweet;
  score: number;
}

async function scoreTweets(
  tweets: Tweet[],
  niche: NicheProfile
): Promise<ScoredTweet[]> {
  if (!config.anthropicApiKey) return [];

  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const tweetSummaries = tweets.map((t, i) => ({
    index: i,
    text: t.text.slice(0, 300),
    author: t.username,
    likes: t.likes,
    retweets: t.retweets,
    replies: t.replies,
    views: t.views,
  }));

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: `Score these tweets for reply opportunity. The user's target audience: ${niche.target_icp}. Niche keywords: ${niche.niche_keywords.join(", ")}.

Score each tweet 1-10 based on:
1. Conversation potential (will author reply back? Questions/hot takes = high, announcements = low)
2. Velocity (likes/retweets suggest momentum)
3. Niche fit (relevance to user's ICP)
4. Reply count (under 20 = visible, over 100 = buried)

Return ONLY a JSON array: [{"index": 0, "score": 7}, ...]`,
      messages: [
        { role: "user", content: JSON.stringify(tweetSummaries) },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const scores: Array<{ index: number; score: number }> = JSON.parse(jsonMatch[0]);
    return scores
      .filter((s) => s.index >= 0 && s.index < tweets.length)
      .map((s) => ({ tweet: tweets[s.index], score: s.score }));
  } catch (err: any) {
    console.error("[trending] Scoring failed:", err.message);
    return [];
  }
}

// ─── Draft reply for trending tweet ───

async function draftTrendingReply(
  tweet: Tweet,
  niche: NicheProfile
): Promise<string | null> {
  if (!config.anthropicApiKey) return null;

  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: `You are replying to a tweet to build engagement and grow followers in this niche: ${niche.target_icp}.

Write a reply that:
- Adds specific value (insight, data point, personal experience, or contrarian take)
- Invites the author to reply back (ask a follow-up question or share a perspective they might want to respond to)
- Matches the formality of the original tweet
- Stays under 280 characters
- Sounds like a real person, not a bot
- NEVER uses: delve, leverage, game-changer, unlock, cutting-edge, groundbreaking
- NEVER uses em dashes or semicolons
- Uses contractions naturally (don't, can't, won't)

Return ONLY the reply text. No quotes, no explanation.`,
      messages: [
        {
          role: "user",
          content: `Tweet by @${tweet.username}: "${tweet.text}"`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return text.trim() || null;
  } catch (err: any) {
    console.error("[trending] Draft failed:", err.message);
    return null;
  }
}

// ─── Helpers ───

function escMd(s: string): string {
  return s.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}
