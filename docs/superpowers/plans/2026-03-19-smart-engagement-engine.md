# Smart Engagement Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the X Engage bot with niche-based onboarding, trending tweet scanner, and periodic coaching to help users grow their X audience through strategic replies.

**Architecture:** Three layers built sequentially: (1) database + niche profile CRUD, (2) goal-based onboarding chat in Telegram, (3) trending scanner with LLM scoring, (4) coaching with weekly summaries and milestone nudges. Each layer depends on the previous.

**Tech Stack:** TypeScript, Supabase (Postgres), SocialData API, Claude Sonnet 4, Telegram Bot API, Fastify

**Spec:** `docs/superpowers/specs/2026-03-19-smart-engagement-engine-design.md`

---

### Task 1: Database migration — `user_niche_profiles` table + `weekly_reports` extensions

**Files:**
- Create: `supabase/migrations/011_smart_engagement.sql`

- [ ] **Step 1: Write the migration**

```sql
-- User niche profiles for goal-based engagement
CREATE TABLE IF NOT EXISTS user_niche_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  goal_text TEXT,
  target_icp TEXT,
  niche_keywords TEXT[] NOT NULL DEFAULT '{}',
  trending_queries TEXT[] NOT NULL DEFAULT '{}',
  suggested_accounts TEXT[] NOT NULL DEFAULT '{}',
  x_handle TEXT,
  x_follower_count INT DEFAULT 0,
  milestones_sent TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extend weekly_reports with coaching columns
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS conversations INT NOT NULL DEFAULT 0;
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS top_niche TEXT;
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS top_account TEXT;
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS trending_replies INT NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/011_smart_engagement.sql
git commit -m "migration: add user_niche_profiles table and extend weekly_reports"
```

---

### Task 2: Niche profile CRUD in store.ts

**Files:**
- Modify: `bot/src/x-engage/store.ts` (add functions after line 522)

- [ ] **Step 1: Add niche profile types and CRUD functions**

At the end of `bot/src/x-engage/store.ts`, add:

```typescript
// ─── Niche profiles ───

export interface NicheProfile {
  user_id: string;
  goal_text: string | null;
  target_icp: string | null;
  niche_keywords: string[];
  trending_queries: string[];
  suggested_accounts: string[];
  x_handle: string | null;
  x_follower_count: number;
  milestones_sent: string[];
}

export async function getNicheProfile(userId: string): Promise<NicheProfile | null> {
  const { data } = await getSupabase()
    .from("user_niche_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data ?? null;
}

export async function upsertNicheProfile(
  userId: string,
  profile: Partial<Omit<NicheProfile, "user_id">>
): Promise<void> {
  await getSupabase()
    .from("user_niche_profiles")
    .upsert(
      { user_id: userId, ...profile, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
}

export async function addMilestone(userId: string, milestone: string): Promise<void> {
  const profile = await getNicheProfile(userId);
  if (!profile) return;
  if (profile.milestones_sent.includes(milestone)) return;
  await getSupabase()
    .from("user_niche_profiles")
    .update({
      milestones_sent: [...profile.milestones_sent, milestone],
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

export async function getUsersWithNicheProfiles(): Promise<
  Array<{ user_id: string; telegram_chat_id: number; niche: NicheProfile }>
> {
  const { data: profiles } = await getSupabase()
    .from("user_niche_profiles")
    .select("*")
    .not("trending_queries", "eq", "{}");

  if (!profiles || profiles.length === 0) return [];

  const userIds = profiles.map((p: any) => p.user_id);
  const { data: users } = await getSupabase()
    .from("users")
    .select("id, telegram_chat_id")
    .in("id", userIds)
    .not("telegram_chat_id", "is", null);

  if (!users) return [];

  const userMap = new Map(users.map((u: any) => [u.id, u.telegram_chat_id]));
  return profiles
    .filter((p: any) => userMap.has(p.user_id))
    .map((p: any) => ({
      user_id: p.user_id,
      telegram_chat_id: userMap.get(p.user_id)!,
      niche: p as NicheProfile,
    }));
}

// ─── Engagement stats helpers ───

export async function getPostedCountForUser(userId: string): Promise<number> {
  const { count } = await getSupabase()
    .from("x_engage_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "posted");
  return count ?? 0;
}

export async function getConversationCount(userId: string, since?: string): Promise<number> {
  let query = getSupabase()
    .from("x_engage_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "posted")
    .gt("reply_replies", 0);
  if (since) query = query.gte("posted_at", since);
  const { count } = await query;
  return count ?? 0;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd bot && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add bot/src/x-engage/store.ts
git commit -m "feat: add niche profile CRUD and engagement stats helpers"
```

---

### Task 3: Goal-based onboarding chat — LLM niche generation

**Files:**
- Create: `bot/src/x-engage/niche-chat.ts`

This module handles the conversational niche onboarding. It manages chat state and uses Claude to extract a niche profile from the user's natural language input.

- [ ] **Step 1: Create the niche chat module**

```typescript
/**
 * Goal-based niche onboarding chat.
 * After email linking, asks the user about their goals and generates
 * a niche profile using Claude.
 */

import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import { upsertNicheProfile, getNicheProfile } from "./store.js";

const MODEL = "claude-sonnet-4-20250514";

// ─── Chat session state ───

interface NicheChatSession {
  chatId: number;
  userId: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  stage: "awaiting_goals" | "awaiting_followup" | "awaiting_account_confirm";
}

const sessions = new Map<number, NicheChatSession>();

export function startNicheChat(chatId: number, userId: string): void {
  sessions.set(chatId, {
    chatId,
    userId,
    messages: [],
    stage: "awaiting_goals",
  });
}

export function isInNicheChat(chatId: number): boolean {
  return sessions.has(chatId);
}

export function endNicheChat(chatId: number): void {
  sessions.delete(chatId);
}

// ─── LLM calls ───

function getAnthropic(): Anthropic | null {
  if (!config.anthropicApiKey) return null;
  return new Anthropic({ apiKey: config.anthropicApiKey });
}

const SYSTEM_PROMPT = `You are helping a user set up their X (Twitter) engagement strategy.

Your job:
1. Understand what the user does, what they're building, and who they want as followers on X.
2. If their first message is vague, ask 1-2 short follow-up questions. If it's clear enough, proceed directly.
3. When you have enough context, generate a niche profile as JSON.

When ready, respond with EXACTLY this format (no other text):
NICHE_PROFILE_JSON:
{
  "target_icp": "One sentence describing their ideal follower",
  "niche_keywords": ["keyword1", "keyword2", "keyword3"],
  "trending_queries": ["search query 1", "search query 2", "search query 3"],
  "suggested_accounts": ["handle1", "handle2", "handle3"]
}

Rules for generating the profile:
- niche_keywords: 3-5 specific topic keywords for their niche (not generic like "tech")
- trending_queries: 3-5 SocialData search queries that would find viral tweets in their niche. Use terms their target audience would use. Include "min_faves:50" in each query for quality filtering.
- suggested_accounts: 3-5 X accounts whose audience matches their ICP. Pick accounts with 10K-500K followers (sweet spot for engagement).
- Keep it specific to their stated goals, not generic.

If asking a follow-up, just ask naturally. Don't mention JSON or profiles to the user.`;

export interface NicheChatResult {
  type: "message" | "profile_complete" | "error";
  text: string;
  profile?: {
    target_icp: string;
    niche_keywords: string[];
    trending_queries: string[];
    suggested_accounts: string[];
  };
}

export async function handleNicheChatMessage(
  chatId: number,
  userText: string
): Promise<NicheChatResult> {
  const session = sessions.get(chatId);
  if (!session) return { type: "error", text: "No active session." };

  // If we're waiting for account confirmation
  if (session.stage === "awaiting_account_confirm") {
    const yes = /^(y|yes|sure|ok|yep|yeah|yea)/i.test(userText.trim());
    endNicheChat(chatId);
    if (yes) {
      return { type: "profile_complete", text: "accounts_accepted" };
    }
    return { type: "profile_complete", text: "accounts_declined" };
  }

  session.messages.push({ role: "user", content: userText });

  const client = getAnthropic();
  if (!client) return { type: "error", text: "AI not configured." };

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: session.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const assistantText =
      response.content[0].type === "text" ? response.content[0].text : "";
    session.messages.push({ role: "assistant", content: assistantText });

    // Check if LLM returned a profile
    const jsonMatch = assistantText.match(/NICHE_PROFILE_JSON:\s*(\{[\s\S]*\})/);
    if (jsonMatch) {
      try {
        const profile = JSON.parse(jsonMatch[1]);

        // Save to database
        await upsertNicheProfile(session.userId, {
          goal_text: session.messages
            .filter((m) => m.role === "user")
            .map((m) => m.content)
            .join(" | "),
          target_icp: profile.target_icp,
          niche_keywords: profile.niche_keywords,
          trending_queries: profile.trending_queries,
          suggested_accounts: profile.suggested_accounts,
        });

        // Move to account confirmation stage
        session.stage = "awaiting_account_confirm";

        const accountList = profile.suggested_accounts
          .map((h: string) => `@${h.replace(/^@/, "")}`)
          .join(", ");

        return {
          type: "message",
          text: `Got it. Based on your goals, I'd suggest watching these accounts: ${accountList}. Want me to add them?`,
          profile,
        };
      } catch {
        return { type: "error", text: "Failed to parse profile." };
      }
    }

    // LLM is asking a follow-up
    session.stage = "awaiting_followup";
    return { type: "message", text: assistantText };
  } catch (err: any) {
    console.error("[niche-chat] LLM error:", err.message);
    return { type: "error", text: "Something went wrong. Try again or type /goals later." };
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd bot && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add bot/src/x-engage/niche-chat.ts
git commit -m "feat: add niche chat module for goal-based onboarding"
```

---

### Task 4: Wire niche chat into handlers.ts

**Files:**
- Modify: `bot/src/x-engage/handlers.ts`

- [ ] **Step 1: Add imports**

At the top of `bot/src/x-engage/handlers.ts`, add with the other imports:

```typescript
import {
  startNicheChat,
  isInNicheChat,
  endNicheChat,
  handleNicheChatMessage,
} from "./niche-chat.js";
import { getNicheProfile, setWatchedAccounts, getWatchedAccounts } from "./store.js";
```

Note: `setWatchedAccounts` and `getWatchedAccounts` may already be imported — merge into the existing import.

- [ ] **Step 2: Add niche chat check to handler priority chain**

In `handleMessage()`, after the `awaitingEmail` check (line 135-138) and before the `/start` check (line 141), add:

```typescript
  // Niche onboarding chat
  if (isInNicheChat(chatId)) {
    const result = await handleNicheChatMessage(chatId, text);

    if (result.type === "profile_complete") {
      if (result.text === "accounts_accepted" && result.profile) {
        // Add suggested accounts to watch list
        const existing = await getWatchedAccounts(userId!);
        const newAccounts = result.profile.suggested_accounts
          .map((h: string) => h.replace(/^@/, "").toLowerCase())
          .filter((h: string) => !existing.includes(h));
        if (newAccounts.length > 0) {
          await setWatchedAccounts(userId!, [...existing, ...newAccounts]);
        }
        await sendMessage({
          chat_id: chatId,
          text: "Added\\! I'll start finding tweets in your niche\\. Use `/watch` or `/topics` to add more anytime\\.",
          parse_mode: "MarkdownV2",
        });
      } else {
        await sendMessage({
          chat_id: chatId,
          text: "No problem\\. Use `/watch` or `/topics` to add accounts manually\\. You can update your goals anytime with `/goals`\\.",
          parse_mode: "MarkdownV2",
        });
      }
      return;
    }

    if (result.type === "error") {
      endNicheChat(chatId);
      await sendMessage({ chat_id: chatId, text: result.text });
      return;
    }

    // LLM follow-up message
    await sendMessage({ chat_id: chatId, text: result.text });
    return;
  }
```

- [ ] **Step 3: Add `/goals` command**

After the `/untopics` handler block (around line 541) and before the unknown-command fallback, add:

```typescript
  // /goals — start or restart niche onboarding chat
  if (text.match(/^\/goals(@\w+)?$/)) {
    const userId = await getUserIdForChat(chatId);
    if (!userId) {
      await sendMessage({ chat_id: chatId, text: "Link your account first with /start" });
      return;
    }
    startNicheChat(chatId, userId);
    await sendMessage({
      chat_id: chatId,
      text: "Tell me about yourself and what you're building\\. Who do you want to reach on X?",
      parse_mode: "MarkdownV2",
    });
    return;
  }
```

- [ ] **Step 4: Modify handleEmailInput to trigger niche chat**

In `handleEmailInput()` (lines 780-792), replace the "Here's what you can do" message with niche chat initiation. Change:

```typescript
    awaitingEmail.delete(chatId);
    await sendMessage({
      chat_id: chatId,
      text: [
        "Connected\\! Here's what you can do:",
        ...
      ].join("\n"),
      parse_mode: "MarkdownV2",
    });
```

To:

```typescript
    awaitingEmail.delete(chatId);

    // Check if user already has a niche profile
    const existingProfile = await getNicheProfile(userId);
    if (existingProfile && existingProfile.trending_queries.length > 0) {
      // Already set up — show commands
      await sendMessage({
        chat_id: chatId,
        text: [
          "Connected\\! Here's what you can do:",
          "",
          "`/watch @paulg @naval` \\- Watch accounts for new tweets",
          "`/topics AI agents, fintech, startups` \\- Track topics",
          "`/goals` \\- Update your engagement strategy",
          "`/scan` \\- Scan now",
          "",
          "Type `/watch` or `/topics` to get started\\.",
        ].join("\n"),
        parse_mode: "MarkdownV2",
      });
    } else {
      // New user — start niche onboarding
      startNicheChat(chatId, userId);
      await sendMessage({
        chat_id: chatId,
        text: [
          "Connected\\!",
          "",
          "Before we start, tell me about yourself and what you're building\\. Who do you want to reach on X?",
        ].join("\n"),
        parse_mode: "MarkdownV2",
      });
    }
```

- [ ] **Step 5: Update command lists**

Update the `/start` welcome message (lines 147-153) and unknown-command fallback (lines 544-551) to include `/goals`.

In the `/start` message, add:
```
"`/goals` \\- Update your engagement strategy",
```

In the unknown-command fallback, change to:
```typescript
text: "Commands: `/start`, `/watch`, `/unwatch`, `/topics`, `/untopics`, `/goals`, `/scan`",
```

- [ ] **Step 6: Typecheck**

Run: `cd bot && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add bot/src/x-engage/handlers.ts
git commit -m "feat: wire niche chat into handlers with /goals command"
```

---

### Task 5: Trending niche scanner

**Files:**
- Create: `bot/src/x-engage/trending.ts`
- Modify: `bot/src/x-engage/scanner.ts`
- Modify: `bot/src/x-engage/config.ts`
- Modify: `bot/src/x-engage/index.ts`

- [ ] **Step 1: Add config**

In `bot/src/x-engage/config.ts`, add to the config object before `get usePolling()`:

```typescript
trendingScanIntervalMs: Number(process.env.TRENDING_SCAN_INTERVAL_MS ?? 10 * 60_000),
```

- [ ] **Step 2: Create the trending scanner module**

Create `bot/src/x-engage/trending.ts`:

```typescript
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
  getNicheProfile,
  type NicheProfile,
} from "./store.js";
import { searchTopicTweets, type Tweet } from "./scraper.js";
import { sendMessage, inlineButtons } from "./telegram.js";
import { getSupabase } from "./supabase.js";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TRENDING_PER_HOUR = 5;
const MIN_TWEET_AGE_MS = 0;
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
    if (age < MIN_TWEET_AGE_MS || age > MAX_TWEET_AGE_MS) return false;
    const followers = (t as any).followers ?? 0;
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
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  if (!config.anthropicApiKey) return [];

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
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  if (!config.anthropicApiKey) return null;

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
```

- [ ] **Step 3: Wire trending scanner into scanner.ts**

In `bot/src/x-engage/scanner.ts`, export the existing `startScanner`/`stopScanner` alongside the trending scanner. Add at the top:

```typescript
export { startTrendingScanner, stopTrendingScanner } from "./trending.js";
```

- [ ] **Step 4: Wire into index.ts**

In `bot/src/x-engage/index.ts`:

Add import:
```typescript
import { startTrendingScanner, stopTrendingScanner } from "./trending.js";
```

In `main()` after `startScanner()` (line 88), add:
```typescript
startTrendingScanner();
```

In `shutdown()` after `stopScanner()` (line 100), add:
```typescript
stopTrendingScanner();
```

- [ ] **Step 5: Typecheck**

Run: `cd bot && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add bot/src/x-engage/trending.ts bot/src/x-engage/scanner.ts bot/src/x-engage/config.ts bot/src/x-engage/index.ts
git commit -m "feat: add trending niche scanner with LLM scoring"
```

---

### Task 6: Periodic coaching — weekly summary + milestones

**Files:**
- Create: `bot/src/x-engage/coaching.ts`
- Modify: `bot/src/x-engage/index.ts`
- Modify: `bot/src/x-engage/handlers.ts` (milestone check on post action)

- [ ] **Step 1: Create the coaching module**

Create `bot/src/x-engage/coaching.ts`:

```typescript
/**
 * Periodic coaching: weekly summaries and milestone nudges.
 */

import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import {
  getUsersWithNicheProfiles,
  getPostedCountForUser,
  getConversationCount,
  getNicheProfile,
  addMilestone,
} from "./store.js";
import { sendMessage } from "./telegram.js";
import { getSupabase } from "./supabase.js";

const MODEL = "claude-sonnet-4-20250514";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

let coachingTimer: ReturnType<typeof setInterval> | null = null;

// ─── Weekly summary ───

export function startCoachingTimer(): void {
  if (coachingTimer) return;
  console.log("[coaching] Starting weekly coaching timer");
  coachingTimer = setInterval(() => {
    broadcastWeeklySummaries().catch((err) =>
      console.error("[coaching] Weekly summary failed:", err)
    );
  }, ONE_WEEK_MS);
}

export function stopCoachingTimer(): void {
  if (coachingTimer) {
    clearInterval(coachingTimer);
    coachingTimer = null;
  }
}

async function broadcastWeeklySummaries(): Promise<void> {
  const users = await getUsersWithNicheProfiles();
  for (const { user_id, telegram_chat_id, niche } of users) {
    try {
      await sendWeeklySummary(user_id, telegram_chat_id, niche);
    } catch (err: any) {
      console.error(`[coaching] Summary failed for ${user_id}:`, err.message);
    }
  }
}

async function sendWeeklySummary(
  userId: string,
  chatId: number,
  niche: any
): Promise<void> {
  const weekAgo = new Date(Date.now() - ONE_WEEK_MS).toISOString();

  // Get this week's stats
  const { data: weekItems } = await getSupabase()
    .from("x_engage_items")
    .select("status, author_handle, source_type, reply_replies")
    .eq("user_id", userId)
    .eq("status", "posted")
    .gte("posted_at", weekAgo);

  const items = weekItems ?? [];
  if (items.length === 0) return; // No activity, skip

  const repliesSent = items.length;
  const conversations = items.filter((i: any) => (i.reply_replies ?? 0) > 0).length;
  const trendingReplies = items.filter((i: any) => i.source_type === "trending").length;

  // Find top account
  const accountCounts = new Map<string, number>();
  for (const item of items) {
    const handle = (item as any).author_handle ?? "";
    accountCounts.set(handle, (accountCounts.get(handle) ?? 0) + 1);
  }
  const topAccount = [...accountCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";

  const summary = [
    "Your week on X:",
    "",
    `Replies sent: ${repliesSent}`,
    `Conversations started: ${conversations}`,
    `Trending replies: ${trendingReplies}`,
    `Most engaged account: @${topAccount}`,
  ].join("\n");

  await sendMessage({ chat_id: chatId, text: summary });
}

// ─── Milestone nudges ───

const MILESTONES = [
  { id: "10_replies", threshold: 10, message: "You've sent 10 replies. You're building momentum." },
  { id: "50_replies", threshold: 50, message: "50 replies sent. Your niche presence is growing." },
  { id: "100_replies", threshold: 100, message: "100 replies. Time for a strategy review." },
];

export async function checkMilestones(
  userId: string,
  chatId: number
): Promise<void> {
  const profile = await getNicheProfile(userId);
  if (!profile) return;

  const totalPosted = await getPostedCountForUser(userId);
  const conversations = await getConversationCount(userId);

  for (const milestone of MILESTONES) {
    if (
      totalPosted >= milestone.threshold &&
      !profile.milestones_sent.includes(milestone.id)
    ) {
      await sendMessage({ chat_id: chatId, text: milestone.message });
      await addMilestone(userId, milestone.id);
    }
  }

  // First conversation milestone
  if (conversations > 0 && !profile.milestones_sent.includes("first_conversation")) {
    await sendMessage({
      chat_id: chatId,
      text: "Someone replied back to your reply. That's the 75x algorithm boost in action. Keep it up.",
    });
    await addMilestone(userId, "first_conversation");
  }
}
```

- [ ] **Step 2: Wire coaching into index.ts**

In `bot/src/x-engage/index.ts`:

Add import:
```typescript
import { startCoachingTimer, stopCoachingTimer } from "./coaching.js";
```

In `main()` after `startTrendingScanner()`:
```typescript
startCoachingTimer();
```

In `shutdown()` after `stopTrendingScanner()`:
```typescript
stopCoachingTimer();
```

- [ ] **Step 3: Add milestone check to post handler**

In `bot/src/x-engage/handlers.ts`, find the post callback handler (around line 868 after `markPosted(itemId)`). After the "Posted" confirmation message, add:

```typescript
    // Check milestones
    const postUserId = await getUserIdForChat(chatId);
    if (postUserId) {
      checkMilestones(postUserId, chatId).catch(() => {});
    }
```

Add the import at the top:
```typescript
import { checkMilestones } from "./coaching.js";
```

- [ ] **Step 4: Typecheck**

Run: `cd bot && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add bot/src/x-engage/coaching.ts bot/src/x-engage/index.ts bot/src/x-engage/handlers.ts
git commit -m "feat: add periodic coaching with weekly summaries and milestone nudges"
```

---

### Task 7: Update drafter with niche context

**Files:**
- Modify: `bot/src/x-engage/drafter.ts`

- [ ] **Step 1: Update draftComment to accept niche context**

In `bot/src/x-engage/drafter.ts`, find the `draftComment()` function. Update its signature and system prompt to include niche context.

Change the signature from:
```typescript
export async function draftComment(tweet: Tweet): Promise<string | null> {
```

To:
```typescript
export async function draftComment(tweet: Tweet, nicheContext?: string): Promise<string | null> {
```

In the system prompt (around line 54), add after the first line:
```typescript
${nicheContext ? `\nYou are engaging as an expert in: ${nicheContext}. Your replies should reflect this expertise and attract followers interested in this niche.\n` : ""}
```

- [ ] **Step 2: Pass niche context from scanner**

In `bot/src/x-engage/scanner.ts`, in the `processTweets()` function (around line 155 where `draftComment(tweet)` is called), update to fetch and pass niche context:

Add import at top:
```typescript
import { getNicheProfile } from "./store.js";
```

Before the `processTweets` calls in `scanForUser`, fetch the profile:
```typescript
const nicheProfile = await getNicheProfile(userId);
const nicheContext = nicheProfile?.target_icp ?? undefined;
```

Then pass it to draftComment calls:
```typescript
const draft = await draftComment(tweet, nicheContext);
```

- [ ] **Step 3: Typecheck**

Run: `cd bot && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add bot/src/x-engage/drafter.ts bot/src/x-engage/scanner.ts
git commit -m "feat: pass niche context to draft generation for targeted replies"
```

---

### Task 8: Manual verification

- [ ] **Step 1: Apply the migration**

Run `011_smart_engagement.sql` in Supabase SQL editor.

- [ ] **Step 2: Test niche onboarding**

1. In the X Engage bot on Telegram, type `/goals`
2. Enter: "I build AI tools for startups. I want SaaS founders and indie hackers as followers."
3. Verify: bot asks 0-2 follow-ups, then suggests accounts
4. Reply "yes" to add suggested accounts
5. Check Supabase: `user_niche_profiles` row exists with keywords and queries

- [ ] **Step 3: Test trending scanner**

1. Wait 30 seconds for initial trending scan (or restart bot)
2. Check bot logs for `[trending] Scanning for N user(s)`
3. If tweets are found matching your niche, you should receive cards in Telegram with "Trending in your niche" header

- [ ] **Step 4: Test milestones**

1. Post a few items using the Post button
2. After posting, check if milestone messages appear (at 10 total posts)

- [ ] **Step 5: Verify existing functionality**

1. `/watch @paulg` still works
2. `/topics AI agents` still works
3. `/scan` still triggers a manual scan
4. Post/Edit/Skip buttons still work normally
