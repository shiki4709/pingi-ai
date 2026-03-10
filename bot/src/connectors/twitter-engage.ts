/**
 * Proactive X/Twitter engagement connector.
 * Searches for popular tweets matching user-defined topics,
 * generates thoughtful comments via Claude, and sends them
 * to the user's Telegram for approval (Post/Edit/Skip).
 *
 * Uses agent-twitter-client (Scraper) for search and posting.
 *
 * Required env vars:
 *   TWITTER_USERNAME   — X account username
 *   TWITTER_PASSWORD   — X account password
 *   TWITTER_EMAIL      — X account email (for 2FA fallback)
 *   ANTHROPIC_API_KEY  — Claude API key
 */

import { Scraper, SearchMode } from "@the-convocation/twitter-scraper";
import type { Tweet } from "@the-convocation/twitter-scraper";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "../supabase.js";
import { sendMessage, inlineButtons } from "../telegram.js";
import { getChatIdForUser } from "../store.js";

const MODEL = "claude-sonnet-4-20250514";
const MAX_COMMENTS_PER_HOUR = 5;
const SEARCH_INTERVAL_MS = 30 * 60_000; // 30 minutes
const MIN_LIKES_THRESHOLD = 10; // only engage with tweets that have some traction
const MAX_TWEETS_PER_SEARCH = 15;

// ─── Scraper singleton ───

let scraper: Scraper | null = null;
let loginPromise: Promise<void> | null = null;

async function getScraper(): Promise<Scraper | null> {
  const username = process.env.TWITTER_USERNAME;
  const password = process.env.TWITTER_PASSWORD;
  const email = process.env.TWITTER_EMAIL;

  if (!username || !password) {
    console.warn("[engage] TWITTER_USERNAME/TWITTER_PASSWORD not set, skipping");
    return null;
  }

  if (scraper) return scraper;

  if (loginPromise) {
    await loginPromise;
    return scraper;
  }

  scraper = new Scraper();
  loginPromise = (async () => {
    try {
      console.log(`[engage] Logging in as @${username}`);
      await scraper!.login(username, password, email);
      const loggedIn = await scraper!.isLoggedIn();
      if (!loggedIn) {
        console.error("[engage] Login returned but isLoggedIn() is false");
        scraper = null;
      } else {
        console.log("[engage] Logged in successfully");
      }
    } catch (e: any) {
      console.error("[engage] Login failed:", e.message);
      scraper = null;
    } finally {
      loginPromise = null;
    }
  })();

  await loginPromise;
  return scraper;
}

// ─── Claude client ───

let anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic | null {
  if (anthropic) return anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  anthropic = new Anthropic({ apiKey });
  return anthropic;
}

// ─── Anti-AI rules from TONE_SYSTEM.md ───

const ANTI_AI_RULES = `RULES (non-negotiable):
- NEVER use: delve, embark, leverage, utilize, game-changer, unlock, cutting-edge, groundbreaking, remarkable, revolutionary, tapestry, illuminate, unveil, pivotal, intricate, hence, furthermore, moreover, realm, landscape, testament, harness, exciting, ever-evolving, foster, elevate, streamline, robust, seamless, synergy, holistic, paradigm, innovative, optimize, empower, curate, ecosystem, stakeholder, scalable, deep dive, double down, circle back, move the needle, at the end of the day, craft, navigate, supercharge, boost, powerful, inquiries, stark
- NEVER use em dashes. Use commas or periods.
- NEVER use semicolons.
- NEVER start with "Great question!" or "Thanks for sharing!" or "I'm excited to..."
- NEVER use "Not just X, but also Y" constructions
- NEVER use "Let me know if you have any questions" or "Happy to help" or "Feel free to reach out"
- Maximum ONE exclamation mark per reply
- No lists in conversational replies
- No markdown formatting (bold, headers) in replies
- DO use contractions (don't, can't, won't, I'd, we're, that's)
- DO use sentence fragments when natural ("Works for me." "Totally.")
- DO vary sentence lengths. Mix short punchy with longer ones.
- DO use active voice, not passive
- DO use specific details over generic praise
- Match the formality level of the incoming message. Never be more formal than the person who wrote to you.`;

// ─── Draft a comment for a tweet ───

async function draftComment(tweet: Tweet): Promise<string | null> {
  const client = getAnthropic();
  if (!client) return null;

  const authorName = tweet.name ?? tweet.username ?? "someone";
  const tweetText = tweet.text ?? "";

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are writing a reply to a tweet on X/Twitter as a proactive engagement comment. The goal is to add genuine value to the conversation, not just be seen.

TWEET by @${tweet.username ?? "unknown"} (${authorName}):
"${tweetText}"

TWEET STATS: ${tweet.likes ?? 0} likes, ${tweet.retweets ?? 0} retweets, ${tweet.replies ?? 0} replies

YOUR TASK:
Write a reply that adds value. This means one of:
- Share a specific insight, data point, or personal experience related to the topic
- Ask a thoughtful follow-up question that deepens the conversation
- Offer a respectful contrarian take with reasoning
- Connect their point to something relevant they may not have considered

DO NOT:
- Just agree ("So true!", "This is spot on", "100% agree")
- Summarize what they said back to them
- Be sycophantic or performative
- Tag other users
- Use hashtags
- Promote anything

Keep it under 280 characters. Sound like a real person, not a brand account.

${ANTI_AI_RULES}

Write ONLY the reply text. Nothing else.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "";

    if (!text || text.length > 280) {
      console.log(
        `[engage] Draft too long or empty (${text.length} chars), skipping`
      );
      return null;
    }

    return text;
  } catch (e: any) {
    console.error("[engage] Draft generation failed:", e.message);
    return null;
  }
}

// ─── Topic management ───

export interface UserTopic {
  id: string;
  userId: string;
  topic: string;
  createdAt: string;
}

export async function getTopicsForUser(userId: string): Promise<UserTopic[]> {
  const { data, error } = await getSupabase()
    .from("user_topics")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    if (error && !error.message.includes("0 rows")) {
      console.error("[engage] Failed to fetch topics:", error.message);
    }
    return [];
  }

  const topics = Array.isArray(data.topics) ? data.topics as string[] : [];
  return topics.map((t: string) => ({
    id: data.id ?? data.user_id,
    userId: data.user_id,
    topic: t,
    createdAt: data.created_at ?? new Date().toISOString(),
  }));
}

export async function addTopicForUser(
  userId: string,
  topic: string
): Promise<boolean> {
  const current = await getTopicsForUser(userId);
  const currentTopics = current.map((t) => t.topic);
  const normalized = topic.trim().toLowerCase();
  if (currentTopics.includes(normalized)) return true;

  const updated = [...currentTopics, normalized];
  const { error } = await getSupabase().from("user_topics").upsert(
    { user_id: userId, topics: updated },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("[engage] Failed to add topic:", error.message);
    return false;
  }
  return true;
}

export async function removeTopicForUser(
  userId: string,
  topic: string
): Promise<boolean> {
  const current = await getTopicsForUser(userId);
  const currentTopics = current.map((t) => t.topic);
  const normalized = topic.trim().toLowerCase();
  const filtered = currentTopics.filter((t) => t !== normalized);
  if (filtered.length === currentTopics.length) return false;

  const { error } = await getSupabase()
    .from("user_topics")
    .update({ topics: filtered })
    .eq("user_id", userId);
  if (error) {
    console.error("[engage] Failed to remove topic:", error.message);
    return false;
  }
  return true;
}

// ─── Rate limiting ───

const commentTimestamps: number[] = [];

function canPostComment(): boolean {
  const oneHourAgo = Date.now() - 60 * 60_000;
  // Clean old timestamps
  while (commentTimestamps.length > 0 && commentTimestamps[0] < oneHourAgo) {
    commentTimestamps.shift();
  }
  return commentTimestamps.length < MAX_COMMENTS_PER_HOUR;
}

function recordComment(): void {
  commentTimestamps.push(Date.now());
}

// ─── MarkdownV2 escape ───

function esc(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

// ─── Format engagement card for Telegram ───

function formatEngagementCard(
  tweet: Tweet,
  draftComment: string
): string {
  const author = tweet.username ?? "unknown";
  const authorName = tweet.name ?? author;
  const tweetText = tweet.text ?? "";
  const stats = [
    tweet.likes ? `${tweet.likes} likes` : null,
    tweet.retweets ? `${tweet.retweets} RTs` : null,
    tweet.replies ? `${tweet.replies} replies` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    `*Engagement opportunity*\n\n` +
    `*@${esc(author)}* \\(${esc(authorName)}\\)\n` +
    `${esc(tweetText.length > 500 ? tweetText.slice(0, 500) + "..." : tweetText)}\n` +
    (stats ? `_${esc(stats)}_\n` : "") +
    `\n` +
    `*Draft comment:*\n` +
    `${esc(draftComment)}`
  );
}

// ─── Search and draft for one topic ───

async function searchAndDraftForTopic(
  topic: string,
  userId: string,
  chatId: number
): Promise<number> {
  const client = await getScraper();
  if (!client) return 0;

  console.log(`[engage] Searching for topic: "${topic}" (user: ${userId})`);

  let tweets: Tweet[] = [];
  try {
    const iter = client.searchTweets(topic, MAX_TWEETS_PER_SEARCH, SearchMode.Top);
    for await (const tweet of iter) {
      tweets.push(tweet);
    }
  } catch (e: any) {
    console.error(`[engage] Search failed for "${topic}":`, e.message);
    return 0;
  }

  console.log(`[engage] Found ${tweets.length} tweets for "${topic}"`);

  // Filter: must have some engagement, not be a retweet, have text
  const candidates = tweets.filter((t) => {
    if (!t.text || !t.id) return false;
    if (t.isRetweet) return false;
    if ((t.likes ?? 0) < MIN_LIKES_THRESHOLD) return false;
    return true;
  });

  console.log(`[engage] ${candidates.length} candidates after filtering`);

  let sent = 0;

  for (const tweet of candidates) {
    if (!canPostComment()) {
      console.log("[engage] Rate limit reached, stopping");
      break;
    }

    // Check if we've already drafted for this tweet
    const externalId = `engage-${tweet.id}`;
    const { data: existing } = await getSupabase()
      .from("reply_items")
      .select("id")
      .eq("external_id", externalId)
      .eq("user_id", userId)
      .single();

    if (existing) continue;

    // Generate draft comment
    const draft = await draftComment(tweet);
    if (!draft) continue;

    // Store in reply_items for tracking
    const tweetUrl = tweet.permanentUrl ?? `https://x.com/${tweet.username}/status/${tweet.id}`;
    const { data: inserted, error: insertErr } = await getSupabase()
      .from("reply_items")
      .insert({
        external_id: externalId,
        user_id: userId,
        platform: "twitter",
        urgency: "green",
        context: "AUDIENCE_ENGAGEMENT",
        priority_score: 2,
        status: "pending",
        author_name: tweet.name ?? tweet.username ?? "Unknown",
        author_handle: tweet.username ? `@${tweet.username}` : "@unknown",
        original_text: tweet.text ?? "",
        context_text: `Engagement: ${topic}`,
        draft_text: draft,
        detected_at: (tweet.timeParsed ?? new Date()).toISOString(),
        item_url: tweetUrl,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error(`[engage] Insert failed for ${externalId}:`, insertErr.message);
      continue;
    }

    // Send to Telegram
    const text = formatEngagementCard(tweet, draft);
    const itemId = inserted!.id;

    try {
      await sendMessage({
        chat_id: chatId,
        text,
        parse_mode: "MarkdownV2",
        reply_markup: inlineButtons([
          [
            { text: "Post", data: `send:${itemId}` },
            { text: "Edit", data: `edit:${itemId}` },
            { text: "Skip", data: `skip:${itemId}` },
          ],
        ]),
      });
      sent++;
      console.log(`[engage] Sent engagement card to chat ${chatId}: @${tweet.username} — "${draft.slice(0, 50)}..."`);
    } catch (e: any) {
      console.error(`[engage] Failed to send Telegram message:`, e.message);
    }

    // Small delay between messages
    await new Promise((r) => setTimeout(r, 1000));
  }

  return sent;
}

// ─── Main engagement scan ───

export async function runEngagementScan(): Promise<void> {
  console.log("[engage] Starting engagement scan");

  // Get all users who have topics configured (jsonb array column)
  const { data: topicRows, error } = await getSupabase()
    .from("user_topics")
    .select("user_id, topics");

  if (error) {
    console.error("[engage] Failed to fetch user topics:", error.message);
    return;
  }

  if (!topicRows || topicRows.length === 0) {
    console.log("[engage] No user topics configured, skipping scan");
    return;
  }

  // Group topics by user (topics is a jsonb array of strings)
  const topicsByUser = new Map<string, string[]>();
  for (const row of topicRows) {
    const topics = Array.isArray(row.topics) ? row.topics as string[] : [];
    if (topics.length > 0) {
      topicsByUser.set(row.user_id, topics);
    }
  }

  for (const [userId, topics] of topicsByUser) {
    const chatId = await getChatIdForUser(userId);
    if (!chatId) {
      console.log(`[engage] No Telegram chat for user ${userId}, skipping`);
      continue;
    }

    console.log(
      `[engage] User ${userId}: ${topics.length} topic(s) — ${topics.join(", ")}`
    );

    let totalSent = 0;
    for (const topic of topics) {
      if (!canPostComment()) {
        console.log("[engage] Rate limit reached, stopping for this user");
        break;
      }
      const sent = await searchAndDraftForTopic(topic, userId, chatId);
      totalSent += sent;
    }

    console.log(`[engage] User ${userId}: sent ${totalSent} engagement card(s)`);
  }

  console.log("[engage] Engagement scan complete");
}

// ─── Post a comment to X (for future use when user taps "Post") ───

export async function postCommentToX(
  tweetId: string,
  commentText: string
): Promise<{ ok: boolean; error?: string }> {
  const client = await getScraper();
  if (!client) {
    return { ok: false, error: "Twitter client not configured" };
  }

  if (!canPostComment()) {
    return { ok: false, error: "Rate limit reached (5 comments/hour)" };
  }

  try {
    console.log(`[engage] Posting comment to tweet ${tweetId}: "${commentText.slice(0, 50)}..."`);
    // @the-convocation/twitter-scraper doesn't have sendTweet — use raw GraphQL
    const cookies = await client.getCookies();
    let authToken = "";
    let ct0 = "";
    for (const c of cookies) {
      const obj = c as any;
      if ((obj.key ?? obj.name) === "auth_token") authToken = obj.value;
      if ((obj.key ?? obj.name) === "ct0") ct0 = obj.value;
    }
    if (!authToken || !ct0) throw new Error("Missing auth cookies for posting");
    const BEARER = "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
    const res = await fetch("https://twitter.com/i/api/graphql/a1p9RWpkYKBjWv_I3WzS-A/CreateTweet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth_token=${authToken}; ct0=${ct0}`,
        "x-csrf-token": ct0,
        authorization: BEARER,
      },
      body: JSON.stringify({
        variables: {
          tweet_text: commentText,
          reply: { in_reply_to_tweet_id: tweetId, exclude_reply_user_ids: [] },
          dark_request: false,
          media: { media_entities: [], possibly_sensitive: false },
          semantic_annotation_ids: [],
        },
        features: {
          communities_web_enable_tweet_community_results_fetch: true,
          c9s_tweet_anatomy_moderator_badge_enabled: true,
          tweetypie_unmention_optimization_enabled: true,
          responsive_web_edit_tweet_api_enabled: true,
          graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
          view_counts_everywhere_api_enabled: true,
          longform_notetweets_consumption_enabled: true,
          responsive_web_twitter_article_tweet_consumption_enabled: true,
          tweet_awards_web_tipping_enabled: false,
          creator_subscriptions_quote_tweet_preview_enabled: false,
          longform_notetweets_rich_text_read_enabled: true,
          longform_notetweets_inline_media_enabled: true,
          articles_preview_enabled: true,
          rweb_video_timestamps_enabled: true,
          rweb_tipjar_consumption_enabled: true,
          responsive_web_graphql_exclude_directive_enabled: true,
          verified_phone_label_enabled: false,
          freedom_of_speech_not_reach_fetch_enabled: true,
          standardized_nudges_misinfo: true,
          tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
          responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
          responsive_web_graphql_timeline_navigation_enabled: true,
          responsive_web_enhance_cards_enabled: false,
        },
        queryId: "a1p9RWpkYKBjWv_I3WzS-A",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    recordComment();
    console.log(`[engage] Comment posted successfully`);
    return { ok: true };
  } catch (e: any) {
    console.error("[engage] Post failed:", e.message);
    return { ok: false, error: e.message };
  }
}

// ─── Worker: periodic engagement scan ───

let engageTimer: ReturnType<typeof setInterval> | null = null;

export function startEngagementWorker(): void {
  if (engageTimer) return;

  const username = process.env.TWITTER_USERNAME;
  if (!username) {
    console.log("[engage] TWITTER_USERNAME not set, engagement worker disabled");
    return;
  }

  console.log(
    `[engage] Starting engagement worker (interval: ${SEARCH_INTERVAL_MS / 60_000}min, rate limit: ${MAX_COMMENTS_PER_HOUR}/hr)`
  );

  // Run first scan after a short delay (let the bot start up first)
  setTimeout(() => {
    runEngagementScan().catch((e) =>
      console.error("[engage] Scan failed:", e.message)
    );
  }, 10_000);

  engageTimer = setInterval(() => {
    runEngagementScan().catch((e) =>
      console.error("[engage] Scan failed:", e.message)
    );
  }, SEARCH_INTERVAL_MS);
}

export function stopEngagementWorker(): void {
  if (engageTimer) {
    clearInterval(engageTimer);
    engageTimer = null;
    console.log("[engage] Engagement worker stopped");
  }
}
