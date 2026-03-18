# Onboarding "Aha Moment" Flow — Design Spec

**Date**: 2026-03-18
**Goal**: Get users from signup to first posted reply within 1 hour. Ship onboarding checklist, suggested accounts, celebration moment, and trial extension.

---

## 1. Database Changes

### Migration: `009_onboarding_aha.sql`

Add two columns to `users`:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_celebration BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_extended BOOLEAN NOT NULL DEFAULT false;
```

No other schema changes. Onboarding checklist state is computed from existing tables at query time.

---

## 2. Suggested Accounts Component

### When shown
On the dashboard when the user has 0 tracked accounts in `user_topics.topics` (or row doesn't exist).

### UI
- 2-column grid on mobile, 4-column on desktop
- Each card: gradient avatar with initials, name, @handle, one-line description, "+ Track" button
- Below cards: text input "or enter any @handle" with Add button

### Hardcoded suggestions (for now)

| Handle | Name | Description |
|--------|------|-------------|
| paulg | Paul Graham | Startup essays |
| naval | Naval Ravikant | Philosophy & startups |
| sama | Sam Altman | AI & OpenAI |
| levelsio | Pieter Levels | Indie hacking |
| dhh | DHH | Ruby on Rails, bootstrapping |
| patio11 | Patrick McKenzie | SaaS & strategy |
| asmartbear | Jason Cohen | WP Engine founder |
| shreyas | Shreyas Doshi | Product management |

### Behavior
- Clicking "+ Track" calls `POST /api/track-account` with `{ userId, handle }`
- Button changes to checkmark after success
- Respects the 10-slot tracking limit (`MAX_TRACKING_SLOTS`)
- Once user has >= 1 tracked account, section collapses to a smaller "Add more accounts" link

### New API: `POST /api/track-account`

```
Request: { userId: string, handle: string }
Response: { ok: true, remaining: number } | { error: "limit", max: 10 }
```

Logic:
1. Normalize handle (strip @, lowercase)
2. Read current `user_topics.topics` for userId
3. Check combined count (topics + accounts) against MAX_TRACKING_SLOTS (10)
4. If under limit, upsert into `user_topics.topics` array
5. Return remaining slots

---

## 3. Onboarding Checklist

### When shown
Dashboard, above agent metrics. Visible when:
- User `created_at` is within last 7 days, AND
- Not all 4 steps are complete

### Steps (computed, not stored)

| # | Label | Action link | Complete when |
|---|-------|-------------|---------------|
| 1 | Connect Telegram | `https://t.me/{BOT}` | `users.telegram_chat_id IS NOT NULL` OR `users.x_bot_chat_id IS NOT NULL` |
| 2 | Track your first account | Scrolls to suggested accounts section | `user_topics.topics` array length >= 1 |
| 3 | Review your first draft | Opens Telegram | `x_engage_items` count >= 1 for user |
| 4 | Post your first reply | Opens Telegram | `x_engage_items` with `status = 'posted'` count >= 1 for user |

### UI
- Card with thin indigo progress bar at top: "2 of 4 complete"
- 4 rows, each with: circle (empty/checked), label, action link for incomplete steps
- Disappears when all 4 complete or user > 7 days old

### Data source
Add to `/api/dashboard-stats` response:

```json
{
  "onboarding_checklist": {
    "show": true,
    "telegram": true,
    "tracked": false,
    "reviewed": false,
    "posted": false,
    "completed": 1,
    "total": 4
  }
}
```

Computed in the API from existing tables — no new queries needed beyond what's already fetched (user row, user_topics, x_engage_items counts).

---

## 4. Celebration Banner

### When shown
Dashboard, above onboarding checklist. Shown when:
- User has at least 1 `x_engage_items` row (first draft was sent), AND
- `users.has_seen_celebration` is false

### UI
- Indigo-tinted card with text: "Your first reply draft was sent to Telegram. Early replies get 10x more visibility — this is the edge."
- Small "x" dismiss button
- One-time only — never shows again after dismiss

### New API: `POST /api/dismiss-celebration`

```
Request: { userId: string }
Response: { ok: true }
```

Sets `users.has_seen_celebration = true`.

---

## 5. Trial Expiry Banner + Extension

### Trial expiry banner
Shown when `users.trial_ends_at` is within 24 hours of now and plan is "trial".

UI:
- Warning-tinted card: "Your trial ends in X hours — upgrade to keep going"
- Two actions: "Upgrade" (links to /pricing) and "Extend 2 days" button
- "Extend 2 days" button only visible if `users.trial_extended` is false

### New API: `POST /api/trial-extend`

```
Request: { userId: string }
Response: { ok: true, new_trial_ends_at: string } | { error: "already_extended" }
```

Logic:
1. Check `users.trial_extended` — if true, return error
2. Compute new end: `MAX(now + 5 days, current trial_ends_at + 2 days)`
3. Update `users.trial_ends_at` and set `users.trial_extended = true`
4. Return new end date

### Banner priority
If both celebration and trial banners could show, celebration takes priority (more positive moment).

---

## 6. Dashboard Stats API Changes

Add to the existing `/api/dashboard-stats` response:

```json
{
  "onboarding_checklist": { ... },
  "has_seen_celebration": false,
  "trial_extended": false,
  "created_at": "2026-03-18T..."
}
```

The `created_at` field is needed to determine if the checklist should show (< 7 days).

The onboarding checklist fields are computed from data already fetched:
- `telegram`: from `user.telegram_chat_id` or `user.x_bot_chat_id` (already fetched)
- `tracked`: from `topicsRes` (already fetched)
- `reviewed`: from `engagePendingRes` count + `engageWeekRes` count > 0 (already fetched)
- `posted`: from `engagePosted` > 0 or any historical posted item

For `posted`, need one additional query: count of all-time posted x_engage_items (not just this week).

---

## 7. File Changes Summary

### New files
- `web/src/app/api/track-account/route.ts`
- `web/src/app/api/trial-extend/route.ts`
- `web/src/app/api/dismiss-celebration/route.ts`
- `supabase/migrations/009_onboarding_aha.sql`

### Modified files
- `web/src/app/api/dashboard-stats/route.ts` — add onboarding fields
- `web/src/app/dashboard/DashboardClient.tsx` — add checklist, suggested accounts, banners

### Not included (deferred)
- Email onboarding sequence (needs Resend setup)
- Admin stats page (separate follow-up)
- Follower growth feature (separate project)

---

## 8. Component Hierarchy (Dashboard)

```
Dashboard
├── Celebration Banner (one-time, dismissible)
├── Trial Expiry Banner (if < 24h left)
├── Onboarding Checklist (if < 7 days old, not all complete)
├── Suggested Accounts (if 0 tracked accounts)
│   ├── Account cards (8 suggestions)
│   └── Manual input
├── Agent Metrics (existing)
│   ├── Inbox Agent card
│   └── Engage Agent card
└── (Recent Activity removed)
```
