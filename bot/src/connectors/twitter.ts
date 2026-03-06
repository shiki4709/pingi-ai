/**
 * Twitter/X connector for the Telegram bot.
 * Uses Twitter API v2 with Bearer token auth (app-only).
 * Fetches user mentions, classifies + drafts via Claude, inserts into Supabase.
 *
 * Required env vars:
 *   TWITTER_BEARER_TOKEN  — Twitter API v2 Bearer token
 *   TWITTER_USER_ID       — Numeric Twitter user ID to monitor
 */

import { supabase } from "../supabase.js";
import { classifyAndDraft } from "../services/drafter.js";
import type { ContextCategory } from "../types.js";

// ─── Urgency helpers (same logic as gmail.ts) ───

function calculateUrgency(detectedAt: Date): "red" | "amber" | "green" {
  const hoursAgo = (Date.now() - detectedAt.getTime()) / 3_600_000;
  if (hoursAgo >= 12) return "red";
  if (hoursAgo >= 4) return "amber";
  return "green";
}

// Twitter mentions decay faster: green → amber boost
function boostForTwitter(
  base: "red" | "amber" | "green"
): "red" | "amber" | "green" {
  if (base === "green") return "amber";
  return base;
}

// ─── Twitter API types (subset we need) ───

interface TweetData {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  in_reply_to_user_id?: string;
  conversation_id?: string;
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
}

interface TwitterApiResponse {
  data?: TweetData[];
  includes?: {
    users?: TwitterUser[];
  };
  meta?: {
    result_count?: number;
    newest_id?: string;
    oldest_id?: string;
    next_token?: string;
  };
}

// ─── Connector result ───

export interface TwitterConnectorResult {
  userId: string;
  inserted: number;
  insertedIds: string[];
  errors: string[];
}

// ─── Main fetch function ───

export async function fetchTwitterForUser(
  userId: string,
  lookbackHours: number = 24
): Promise<TwitterConnectorResult> {
  const result: TwitterConnectorResult = {
    userId,
    inserted: 0,
    insertedIds: [],
    errors: [],
  };

  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  const twitterUserId = process.env.TWITTER_USER_ID;

  if (!bearerToken || !twitterUserId) {
    result.errors.push(
      "Twitter not configured — missing TWITTER_BEARER_TOKEN or TWITTER_USER_ID"
    );
    return result;
  }

  const startTime = new Date(
    Date.now() - lookbackHours * 60 * 60 * 1000
  ).toISOString();

  // Fetch mentions via Twitter API v2
  const params = new URLSearchParams({
    start_time: startTime,
    max_results: "20",
    "tweet.fields": "created_at,author_id,in_reply_to_user_id,conversation_id",
    "user.fields": "name,username",
    expansions: "author_id",
  });

  const url = `https://api.twitter.com/2/users/${twitterUserId}/mentions?${params}`;

  let apiResponse: TwitterApiResponse;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    // Handle rate limits gracefully
    if (res.status === 429) {
      const resetHeader = res.headers.get("x-rate-limit-reset");
      const resetInfo = resetHeader
        ? ` (resets at ${new Date(Number(resetHeader) * 1000).toISOString()})`
        : "";
      result.errors.push(`Twitter rate limited${resetInfo} — skipping this cycle`);
      return result;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      result.errors.push(
        `Twitter API error: ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`
      );
      return result;
    }

    apiResponse = (await res.json()) as TwitterApiResponse;
  } catch (e: any) {
    result.errors.push(`Twitter fetch error: ${e.message}`);
    return result;
  }

  const tweets = apiResponse.data ?? [];
  if (tweets.length === 0) {
    return result;
  }

  // Build user lookup map from includes
  const users = new Map<string, TwitterUser>();
  for (const u of apiResponse.includes?.users ?? []) {
    users.set(u.id, u);
  }

  console.log(`[twitter] Found ${tweets.length} mentions for user ${twitterUserId}`);

  // Check which tweet IDs we already have in Supabase
  const externalKeys = tweets.map((t) => `twitter-${t.id}`);
  const existingExternalIds = new Set<string>();

  for (let i = 0; i < externalKeys.length; i += 50) {
    const chunk = externalKeys.slice(i, i + 50);
    const { data: existing } = await supabase
      .from("reply_items")
      .select("external_id")
      .eq("user_id", userId)
      .eq("platform", "twitter")
      .in("external_id", chunk);
    if (existing) {
      for (const row of existing) existingExternalIds.add(row.external_id);
    }
  }

  const newTweets = tweets.filter(
    (t) => !existingExternalIds.has(`twitter-${t.id}`)
  );

  console.log(
    `[twitter] ${tweets.length} total, ${existingExternalIds.size} already in DB, ${newTweets.length} new to process`
  );

  for (const tweet of newTweets) {
    try {
      const author = users.get(tweet.author_id ?? "");
      const authorName = author?.name ?? "Unknown";
      const authorHandle = author ? `@${author.username}` : "@unknown";
      const date = tweet.created_at ? new Date(tweet.created_at) : new Date();
      const urgency = boostForTwitter(calculateUrgency(date));
      const tweetUrl = `https://x.com/${author?.username ?? "i"}/status/${tweet.id}`;

      // Classify context and generate draft via Claude
      const { context, draftText } = await classifyAndDraft(
        "twitter",
        authorName,
        `Mention from ${authorHandle}`,
        tweet.text
      );

      const priorityScore =
        urgency === "red" ? 8 : urgency === "amber" ? 5 : 3;

      const externalId = `twitter-${tweet.id}`;
      const { data: inserted, error } = await supabase
        .from("reply_items")
        .insert({
          external_id: externalId,
          user_id: userId,
          platform: "twitter",
          urgency,
          context,
          priority_score: priorityScore,
          status: "pending",
          author_name: authorName,
          author_handle: authorHandle,
          original_text: tweet.text,
          context_text: `Mention from ${authorHandle}`,
          draft_text: draftText || null,
          detected_at: date.toISOString(),
          item_url: tweetUrl,
        })
        .select("id")
        .single();

      if (error) {
        result.errors.push(`Insert ${externalId}: ${error.message}`);
      } else {
        result.inserted++;
        result.insertedIds.push(inserted!.id);
      }
    } catch (e: any) {
      result.errors.push(`Twitter tweet ${tweet.id}: ${e.message}`);
    }
  }

  return result;
}
