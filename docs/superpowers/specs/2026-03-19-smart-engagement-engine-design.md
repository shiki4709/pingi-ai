# Smart Engagement Engine for X Audience Growth

## Overview

Enhance the existing X Engage bot with three new capabilities: (1) niche discovery via goal-based onboarding chat, (2) trending tweet scanner that finds high-opportunity reply targets in the user's niche, (3) periodic coaching that optimizes their strategy based on what's working.

## 1. Goal-Based Onboarding Chat

**Where:** In the X Engage Telegram bot, after email linking.

**Flow:**
- Bot asks: "Tell me about yourself and what you're building. Who do you want to reach on X?"
- User replies naturally (e.g. "I'm building an AI tool for small businesses. I want SaaS founders and indie hackers to follow me")
- LLM asks 1-2 follow-ups if needed (e.g. "Are you targeting early-stage founders or more established ones?")
- LLM generates a niche profile:
  - `niche_keywords`: ["AI agents", "SaaS", "indie hacking", "developer tools"]
  - `target_icp`: "Early-stage SaaS founders and indie hackers building with AI"
  - `suggested_accounts`: ["@paulg", "@levelsio", "@naval"] (accounts whose audience matches their ICP)
  - `trending_search_queries`: ["AI tools startups", "indie hacker", "SaaS growth"]
- Stored in a new `user_niche_profiles` table
- User can update anytime via `/goals` command

**Onboarding integration:** After email linking succeeds in `handleEmailInput()` (handlers.ts lines 761-793), instead of immediately showing the "Here's what you can do" message, the bot transitions to a niche chat session. A new `awaitingNicheChat` Map tracks this state, similar to existing `awaitingEmail` and `editSessions`. The state is checked in the handler priority chain (lines 119-138) at a priority level above the `/watch` pattern matcher, so free-text niche responses aren't intercepted as handle inputs.

**Suggested accounts:** When the LLM generates `suggested_accounts`, the bot presents them as recommendations: "Based on your goals, I'd suggest watching these accounts: @paulg, @levelsio, @naval. Want me to add them?" User replies yes/no. If yes, they're added to `/watch` (via existing `setWatchedAccounts` in store.ts). If no, they're stored in the niche profile for reference only.

**LLM prompt strategy:** The system prompt tells Claude to:
1. Extract the user's domain, product/role, and target audience from their message
2. Ask 1-2 clarifying follow-ups only if the input is vague
3. Generate structured output: niche_keywords, target_icp, suggested_accounts, trending_search_queries
4. Keep the conversation natural and short (max 3 back-and-forth exchanges)

## 2. Trending Niche Scanner

Separate from the existing hourly account scanner. Runs every 10 minutes.

### Relationship to existing `/topics`

The existing `/topics` command lets users manually define search topics (stored in `user_topics.search_topics`). The trending scanner uses `trending_queries` from the LLM-generated niche profile. These are related but distinct:

- **`/topics`** — user-chosen, explicit. User types `/topics AI agents, fintech`. Scanned hourly by the existing scanner.
- **`trending_queries`** — AI-generated from the user's goals/ICP. Optimized for finding reply opportunities. Scanned every 10 min by the trending scanner.

**Dedup:** The trending scanner deduplicates against ALL existing `x_engage_items` for the user (by tweet ID), regardless of source. This covers both `/topics` results and `/watch` results. No double-sends.

A user may have overlapping terms in both — that's fine. The dedup handles it, and the trending scanner applies stricter filtering (velocity, scoring) so the overlap produces no duplicates.

### How it works

1. For each user with a niche profile, search SocialData API using their `trending_search_queries`
2. Filter tweets: must be < 2 hours old, from accounts with 5x+ the user's follower count (see "User follower count" below)
3. LLM scores tweets in a **single batch call** — all candidate tweets (typically 10-30) are passed in one prompt, and the LLM returns scores as structured JSON. This keeps API costs manageable (1 Claude call per user per scan, not per tweet).
4. Scoring dimensions (1-10 each):
   - **Conversation potential** — Is the author likely to reply back? Questions and hot takes score highest. Pure announcements score lowest.
   - **Velocity** — Likes/retweets per hour since posted. Higher = more eyeballs on your reply.
   - **Author sweet spot** — 5-50x user's followers is ideal (big enough for visibility, small enough they might reply back). 100x+ still worth it but lower reply-back chance.
   - **Niche fit** — How relevant to the user's ICP? LLM scores this against their niche profile.
   - **Reply count** — Under 20 replies = your reply is visible. Over 100 = buried in the thread.
5. Only tweets scoring 7+ get surfaced to the user
6. Draft a reply optimized for engagement: add value, invite conversation, match formality level of original tweet
7. Push to Telegram with Post/Edit/Skip buttons (same UX as existing engage bot)
8. Card includes an urgency indicator: "Reply within 45 min for best visibility"

### User follower count

The user's X follower count is needed for the "author sweet spot" filter. Stored as `x_follower_count` on `user_niche_profiles`. Populated during niche onboarding: the LLM asks "What's your X handle?" and the system fetches their profile from SocialData to get the follower count. Refreshed weekly during the coaching cycle.

### Rate limits

- Max 5 trending items per user per hour (avoid overwhelming the user and looking spammy)
- Dedup against ALL existing `x_engage_items` for the user by tweet ID (covers `/watch`, `/topics`, and previous trending results)
- SocialData API: batch users with overlapping niche keywords into shared queries to reduce API calls (critical for cost — see Section 7)

### Source tracking

Trending items are inserted into `x_engage_items` with `source_type: "trending"` and `source_value` set to the matching trending query. This distinguishes them from `source_type: "account"` (from `/watch`) and `source_type: "topic"` (from `/topics`), enabling the coaching system to analyze which source drives best engagement.

### Tweet age window

Only surface tweets posted within the last 2 hours. The X algorithm gives heavy weight to the first 30-60 minutes of a tweet's life. Replying early puts you in the visible reply section before it gets crowded.

### Reply optimization rules

The draft reply should:
- Add specific value (data point, personal experience, contrarian insight)
- Be conversational enough to invite a reply back (the 75x algorithm multiplier)
- Match the formality of the original tweet
- Avoid generic praise ("Great thread!") which gets no engagement
- Stay under 280 characters for maximum readability
- Follow existing ANTI_AI_RULES from TONE_SYSTEM.md

## 3. Periodic Coaching

### Weekly summary (every 7 days)

Triggered by a `setInterval` in the bot process (same pattern as existing weekly report timer in `index.ts`). Runs every 7 days.

Bot sends a Telegram message with:
- Replies sent this week
- Conversations started (reply-backs received)
- Best performing niche keyword
- Account that drove most engagement
- LLM-generated insight: e.g. "Your AI agent replies get 3x more engagement than your SaaS replies. Want me to focus more on AI?"
- User can accept (updates niche profile) or dismiss

### Defining "conversations"

A conversation = an `x_engage_item` with status "posted" where `reply_replies > 0`. This means the author (or someone else) replied to the user's reply. The existing metrics-checking loop in `scanner.ts` (`getPostedItemsForMetrics`) already populates `reply_replies` by checking posted items periodically. No new external API calls needed.

### Milestone nudges

Triggered by specific events, checked after each "Post" action:
- **10 replies sent:** "You've sent 10 replies. Here's what's working so far..." with brief analysis
- **First conversation (reply_replies > 0):** "Nice — someone replied back to your reply. This is the 75x algorithm boost in action."
- **50 replies sent:** Deeper analysis with niche refinement suggestions
- **100 replies sent:** Full strategy review

Milestone tracking: each milestone fires once, tracked by `milestones_sent` TEXT[] array on `user_niche_profiles`.

### Coaching data source

Coaching queries `x_engage_items` (status, author_handle, posted_at, source_type, reply_replies) and aggregates into the existing `weekly_reports` table (extended with new columns — see Database Changes). No new external API calls needed.

## 4. Database Changes

### New table: `user_niche_profiles`

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | UUID | FK to users, unique (one profile per user) |
| `goal_text` | TEXT | Raw user input from onboarding chat |
| `target_icp` | TEXT | LLM-generated ICP description |
| `niche_keywords` | TEXT[] | Array of niche keywords for search |
| `trending_queries` | TEXT[] | Search queries for trending scanner |
| `suggested_accounts` | TEXT[] | LLM-suggested accounts to watch |
| `x_handle` | TEXT | User's X handle (for profile lookups) |
| `x_follower_count` | INT | User's follower count, refreshed weekly |
| `milestones_sent` | TEXT[] | Array of milestone IDs already sent, default '{}' |
| `created_at` | TIMESTAMPTZ | Default now() |
| `updated_at` | TIMESTAMPTZ | Default now() |

### Extend existing `weekly_reports` table

Add columns (no new table — avoids duplication with existing weekly stats):

| Column | Type | Notes |
|--------|------|-------|
| `conversations` | INT | Items with reply_replies > 0 that week, default 0 |
| `top_niche` | TEXT | Best performing niche keyword |
| `top_account` | TEXT | Account handle that drove most engagement |
| `trending_replies` | INT | Replies from trending source, default 0 |

## 5. File Changes

### Modified files

- `bot/src/x-engage/scanner.ts` — add trending scan loop (10 min interval) alongside existing hourly account scan. Trending scan calls new `trending.ts` module. Add `stopTrendingScanner()` to graceful shutdown.
- `bot/src/x-engage/handlers.ts` — add `/goals` command handler and niche onboarding chat flow after email linking. Add `awaitingNicheChat` Map for session state, slotted above the `/watch` pattern matcher in the priority chain. Update unknown-command fallback (line 547) and `/start` welcome message (lines 147-153) to include `/goals`.
- `bot/src/x-engage/drafter.ts` — update system prompt to include user's niche context (ICP, keywords) for more targeted reply drafting.
- `bot/src/x-engage/store.ts` — add CRUD for niche profiles (`getNicheProfile`, `upsertNicheProfile`) and helpers for weekly stats (`incrementRepliesSent`, `getConversationCount`).
- `bot/src/x-engage/config.ts` — add `TRENDING_SCAN_INTERVAL_MS` (default 10 min).
- `bot/src/x-engage/index.ts` — call `stopTrendingScanner()` in graceful shutdown alongside existing `stopScanner()`.

### New files

- `bot/src/x-engage/trending.ts` — trending scanner logic: query SocialData by niche queries, filter by age/velocity/follower count, batch LLM tweet scoring, dedup against existing items, push scored items to user.
- `bot/src/x-engage/coaching.ts` — weekly summary generation (LLM-powered analysis of weekly_reports + x_engage_items), milestone nudge triggers, niche adjustment suggestions. Uses `setInterval` (same pattern as weekly report timer).

## 6. What Does NOT Change

- Existing account tracking (`/watch`, `/topics`) — works as before, runs on its existing hourly interval
- Post/Edit/Skip UX — same buttons, same Telegram card format
- SocialData API for reading tweets — same provider, same API
- Copy-paste posting model — user still posts manually from their own X account
- `hasPro()` / trial / payment logic — unchanged
- Dashboard web app — unchanged (can display niche profile read-only later)

## 7. Cost Considerations

### SocialData API

The trending scanner runs every 10 minutes per user, with 3-5 queries per user per scan.

For 10 users at $0.01/request: ~30-50 calls per 10 min = ~$30-50/day. This is significant.

**Required optimization:** Batch users with overlapping niche keywords into shared queries. If 5 users all have "AI startups" as a trending query, that's 1 API call, not 5. This can reduce costs by 50-80% depending on user overlap.

**Fallback:** If costs are too high, increase scan interval to 20 minutes (still within the 2-hour reply window) or reduce to 2-3 trending queries per user.

### Anthropic API (Claude)

Batch scoring: 1 Claude call per user per scan (all candidate tweets in one prompt). At 10 users, that's ~60 calls/hour. At Sonnet pricing (~$3/M input, $15/M output), with ~2K input tokens and ~500 output tokens per call: ~$0.04/hour for 10 users. Negligible.

Draft generation: 1 Claude call per surfaced tweet (max 5/user/hour). Same cost profile as existing engage bot. Negligible.
