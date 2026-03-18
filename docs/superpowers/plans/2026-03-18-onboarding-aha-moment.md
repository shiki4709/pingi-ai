# Onboarding "Aha Moment" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add onboarding checklist, suggested accounts, celebration banner, and trial extension to the Pingi dashboard so new users reach their first posted reply within 1 hour.

**Architecture:** All onboarding state is computed server-side in the existing `/api/dashboard-stats` endpoint (no new polling). Three new lightweight API routes handle mutations (track account, dismiss celebration, extend trial). The dashboard renders new sections conditionally based on the API response. One DB migration adds two boolean columns.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL), React (inline styles matching existing design system), TypeScript

**Spec:** `docs/superpowers/specs/2026-03-18-onboarding-aha-moment-design.md`

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/009_onboarding_aha.sql` | Add `has_seen_celebration`, `trial_extended` columns to `users` |
| `web/src/app/api/track-account/route.ts` | POST endpoint: add handle to `user_topics.topics` |
| `web/src/app/api/trial-extend/route.ts` | POST endpoint: extend trial by 2 days (once) |
| `web/src/app/api/dismiss-celebration/route.ts` | POST endpoint: set `has_seen_celebration = true` |

### Modified files
| File | Changes |
|------|---------|
| `web/src/app/api/dashboard-stats/route.ts` | Add onboarding checklist computation, return `created_at`, `has_seen_celebration`, `trial_extended`, `onboarding` object, all-time posted count |
| `web/src/app/dashboard/DashboardClient.tsx` | Add `DashboardData` fields, render celebration banner, trial banner, onboarding checklist, suggested accounts section |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/009_onboarding_aha.sql`

- [ ] **Step 1: Write migration file**

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_celebration BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_extended BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/009_onboarding_aha.sql
git commit -m "migration: add has_seen_celebration, trial_extended to users"
```

- [ ] **Step 3: Run migration on Supabase**

Execute the SQL in Supabase SQL Editor. Verify with:
```sql
SELECT has_seen_celebration, trial_extended FROM users LIMIT 1;
```
Expected: both columns exist, default `false`.

---

### Task 2: Track Account API Route

**Files:**
- Create: `web/src/app/api/track-account/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_TRACKING_SLOTS = 10;

const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  const { userId, handle } = await request.json();
  if (!userId || !handle) {
    return NextResponse.json({ error: "userId and handle required" }, { status: 400 });
  }

  const normalized = handle.replace(/^@/, "").trim().toLowerCase();
  if (!normalized || !/^[a-zA-Z0-9_]+$/.test(normalized)) {
    return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
  }

  // Get current topics
  const { data: existing } = await supabase
    .from("user_topics")
    .select("topics, search_topics")
    .eq("user_id", userId)
    .single();

  const currentAccounts: string[] = (existing?.topics as string[]) ?? [];
  const currentTopics: string[] = (existing?.search_topics as string[]) ?? [];
  const totalUsed = currentAccounts.length + currentTopics.length;

  if (currentAccounts.includes(normalized)) {
    return NextResponse.json({ ok: true, remaining: MAX_TRACKING_SLOTS - totalUsed });
  }

  if (totalUsed >= MAX_TRACKING_SLOTS) {
    return NextResponse.json({ error: "limit", max: MAX_TRACKING_SLOTS }, { status: 429 });
  }

  const newAccounts = [...currentAccounts, normalized];

  const { error } = await supabase.from("user_topics").upsert(
    { user_id: userId, topics: newAccounts },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[track-account] Failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, remaining: MAX_TRACKING_SLOTS - totalUsed - 1 });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd web && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add web/src/app/api/track-account/route.ts
git commit -m "feat: add /api/track-account endpoint for web-based account tracking"
```

---

### Task 3: Trial Extend API Route

**Files:**
- Create: `web/src/app/api/trial-extend/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("trial_ends_at, trial_extended")
    .eq("id", userId)
    .single();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.trial_extended) {
    return NextResponse.json({ error: "already_extended" }, { status: 400 });
  }

  const now = new Date();
  const currentEnd = user.trial_ends_at ? new Date(user.trial_ends_at) : now;
  const fromNowPlus5 = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const currentPlus2 = new Date(currentEnd.getTime() + 2 * 24 * 60 * 60 * 1000);
  const newEnd = fromNowPlus5 > currentPlus2 ? fromNowPlus5 : currentPlus2;

  const { error } = await supabase
    .from("users")
    .update({ trial_ends_at: newEnd.toISOString(), trial_extended: true })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, new_trial_ends_at: newEnd.toISOString() });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd web && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add web/src/app/api/trial-extend/route.ts
git commit -m "feat: add /api/trial-extend endpoint for one-time trial extension"
```

---

### Task 4: Dismiss Celebration API Route

**Files:**
- Create: `web/src/app/api/dismiss-celebration/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .update({ has_seen_celebration: true })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify and commit**

```bash
cd web && npx tsc --noEmit
git add web/src/app/api/dismiss-celebration/route.ts
git commit -m "feat: add /api/dismiss-celebration endpoint"
```

---

### Task 5: Update Dashboard Stats API

**Files:**
- Modify: `web/src/app/api/dashboard-stats/route.ts`

- [ ] **Step 1: Add onboarding queries to the parallel Promise.all**

Add two new queries inside the existing `Promise.all`:

```typescript
// All-time posted engage items (for onboarding "posted" check)
supabase
  .from("x_engage_items")
  .select("id", { count: "exact", head: true })
  .eq("user_id", userId)
  .eq("status", "posted"),

// All-time engage items (for onboarding "reviewed" check)
supabase
  .from("x_engage_items")
  .select("id", { count: "exact", head: true })
  .eq("user_id", userId),
```

Add these to the destructured result array as `engageAllTimePostedRes` and `engageAllTimeRes`.

- [ ] **Step 2: Compute onboarding checklist and add to response**

After the existing computation, before `return NextResponse.json({`:

```typescript
// Onboarding checklist (computed from existing data)
const userCreatedAt = user?.created_at ?? null;
const isNewUser = userCreatedAt
  ? Date.now() - new Date(userCreatedAt).getTime() < 7 * 24 * 60 * 60 * 1000
  : false;

const onboardingTelegram = inboxLinked || xLinked;
const onboardingTracked = (topicsRes.data?.topics as string[] ?? []).length > 0;
const onboardingReviewed = (engageAllTimeRes.count ?? 0) > 0;
const onboardingPosted = (engageAllTimePostedRes.count ?? 0) > 0;
const onboardingCompleted = [onboardingTelegram, onboardingTracked, onboardingReviewed, onboardingPosted].filter(Boolean).length;
const showChecklist = isNewUser && onboardingCompleted < 4;
```

- [ ] **Step 3: Add new fields to the JSON response**

Add inside the `return NextResponse.json({` block:

```typescript
// Onboarding
created_at: user?.created_at ?? null,
has_seen_celebration: user?.has_seen_celebration ?? false,
trial_extended: user?.trial_extended ?? false,
onboarding: {
  show: showChecklist,
  telegram: onboardingTelegram,
  tracked: onboardingTracked,
  reviewed: onboardingReviewed,
  posted: onboardingPosted,
  completed: onboardingCompleted,
  total: 4,
},
```

- [ ] **Step 4: Update the user SELECT to include new columns**

Change the existing user query from:
```typescript
.select("name, email, plan, trial_ends_at, telegram_chat_id, x_bot_chat_id, sign_off")
```
To:
```typescript
.select("name, email, plan, trial_ends_at, telegram_chat_id, x_bot_chat_id, sign_off, has_seen_celebration, trial_extended, created_at")
```

- [ ] **Step 5: Verify and commit**

```bash
cd web && npx tsc --noEmit
git add web/src/app/api/dashboard-stats/route.ts
git commit -m "feat: add onboarding checklist computation to dashboard-stats API"
```

---

### Task 6: Dashboard UI — DashboardData Type + State

**Files:**
- Modify: `web/src/app/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Add new fields to the DashboardData interface**

Add after `recent_engage`:

```typescript
// Onboarding
created_at: string | null;
has_seen_celebration: boolean;
trial_extended: boolean;
onboarding: {
  show: boolean;
  telegram: boolean;
  tracked: boolean;
  reviewed: boolean;
  posted: boolean;
  completed: number;
  total: number;
};
```

- [ ] **Step 2: Verify and commit**

```bash
cd web && npx tsc --noEmit
git add web/src/app/dashboard/DashboardClient.tsx
git commit -m "feat: add onboarding fields to DashboardData type"
```

---

### Task 7: Dashboard UI — Celebration Banner

**Files:**
- Modify: `web/src/app/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Add celebration banner**

Insert right after the `<main>` tag opening (before the greeting section), inside the component's return:

```tsx
{/* Celebration banner */}
{data.onboarding.reviewed && !data.has_seen_celebration && (
  <div
    style={{
      ...cardStyle,
      padding: "16px 20px",
      background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(56,189,248,0.06))",
      border: `1px solid rgba(99,102,241,0.15)`,
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
    }}
  >
    <div style={{ flex: 1, fontSize: 14, color: T.ink, lineHeight: 1.5 }}>
      Your first reply draft was sent to Telegram. Early replies get 10x more visibility — this is the edge.
    </div>
    <button
      onClick={async () => {
        const { data: authData } = await getSupabaseBrowser().auth.getUser();
        if (authData.user) {
          await fetch("/api/dismiss-celebration", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: authData.user.id }),
          });
          window.location.reload();
        }
      }}
      style={{
        background: "none",
        border: "none",
        color: T.muted,
        fontSize: 18,
        cursor: "pointer",
        padding: 4,
        flexShrink: 0,
      }}
      aria-label="Dismiss"
    >
      &times;
    </button>
  </div>
)}
```

- [ ] **Step 2: Verify and commit**

```bash
cd web && npx tsc --noEmit
git add web/src/app/dashboard/DashboardClient.tsx
git commit -m "feat: add celebration banner to dashboard"
```

---

### Task 8: Dashboard UI — Trial Expiry Banner

**Files:**
- Modify: `web/src/app/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Add trial expiry computation**

Add inside the component, after the `data` check but before the return:

```typescript
const trialEndsAt = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
const trialHoursLeft = trialEndsAt
  ? Math.max(0, Math.round((trialEndsAt.getTime() - Date.now()) / (60 * 60 * 1000)))
  : null;
const showTrialBanner = data.plan === "trial" && trialHoursLeft !== null && trialHoursLeft <= 24;
```

- [ ] **Step 2: Add trial banner JSX**

Insert right after the celebration banner:

```tsx
{/* Trial expiry banner */}
{showTrialBanner && !(data.onboarding.reviewed && !data.has_seen_celebration) && (
  <div
    style={{
      ...cardStyle,
      padding: "14px 20px",
      background: T.amberSoft,
      border: `1px solid rgba(217,119,6,0.15)`,
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
      flexWrap: "wrap",
    }}
  >
    <div style={{ flex: 1, fontSize: 13, color: T.ink, minWidth: 200 }}>
      Your trial ends in <strong>{trialHoursLeft}h</strong> — upgrade to keep going.
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <a
        href="/pricing"
        style={{
          padding: "7px 16px",
          borderRadius: 8,
          background: T.accent,
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          textDecoration: "none",
          fontFamily: sans,
        }}
      >
        Upgrade
      </a>
      {!data.trial_extended && (
        <button
          onClick={async () => {
            const { data: authData } = await getSupabaseBrowser().auth.getUser();
            if (authData.user) {
              await fetch("/api/trial-extend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: authData.user.id }),
              });
              window.location.reload();
            }
          }}
          style={{
            padding: "7px 16px",
            borderRadius: 8,
            background: "#fff",
            border: `1px solid ${T.border}`,
            color: T.body,
            fontSize: 12,
            fontWeight: 500,
            fontFamily: sans,
            cursor: "pointer",
          }}
        >
          Extend 2 days
        </button>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify and commit**

```bash
cd web && npx tsc --noEmit
git add web/src/app/dashboard/DashboardClient.tsx
git commit -m "feat: add trial expiry banner with extension button"
```

---

### Task 9: Dashboard UI — Onboarding Checklist

**Files:**
- Modify: `web/src/app/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Add onboarding checklist JSX**

Insert after the trial banner, before the agent metrics section:

```tsx
{/* Onboarding checklist */}
{data.onboarding.show && (
  <section aria-label="Onboarding checklist" style={{ ...cardStyle, padding: "20px 24px", marginBottom: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
        Get started — {data.onboarding.completed} of {data.onboarding.total}
      </span>
    </div>
    {/* Progress bar */}
    <div style={{ height: 4, borderRadius: 2, background: T.surface, marginBottom: 16 }}>
      <div style={{
        height: 4,
        borderRadius: 2,
        background: T.accent,
        width: `${(data.onboarding.completed / data.onboarding.total) * 100}%`,
        transition: "width 0.3s",
      }} />
    </div>
    {/* Steps */}
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[
        { done: data.onboarding.telegram, label: "Connect Telegram", action: `https://t.me/${ENGAGE_BOT}`, actionLabel: "Connect" },
        { done: data.onboarding.tracked, label: "Track your first account", action: "#suggested-accounts", actionLabel: "Add" },
        { done: data.onboarding.reviewed, label: "Review your first draft", action: `https://t.me/${ENGAGE_BOT}`, actionLabel: "Open Telegram" },
        { done: data.onboarding.posted, label: "Post your first reply", action: `https://t.me/${ENGAGE_BOT}`, actionLabel: "Open Telegram" },
      ].map((step, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 10,
            border: step.done ? "none" : `2px solid ${T.border}`,
            background: step.done ? T.accent : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            {step.done && (
              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
            )}
          </div>
          <span style={{
            flex: 1, fontSize: 13, color: step.done ? T.muted : T.ink,
            textDecoration: step.done ? "line-through" : "none",
          }}>
            {step.label}
          </span>
          {!step.done && (
            <a
              href={step.action}
              target={step.action.startsWith("http") ? "_blank" : undefined}
              rel={step.action.startsWith("http") ? "noopener noreferrer" : undefined}
              style={{
                fontSize: 11, fontWeight: 600, color: T.accent,
                textDecoration: "none", fontFamily: sans,
              }}
            >
              {step.actionLabel}
            </a>
          )}
        </div>
      ))}
    </div>
  </section>
)}
```

- [ ] **Step 2: Verify and commit**

```bash
cd web && npx tsc --noEmit
git add web/src/app/dashboard/DashboardClient.tsx
git commit -m "feat: add onboarding checklist to dashboard"
```

---

### Task 10: Dashboard UI — Suggested Accounts

**Files:**
- Modify: `web/src/app/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Add suggested accounts data and state**

Add at the top of the component (inside `DashboardClient`, after data loads):

```typescript
const SUGGESTED_ACCOUNTS = [
  { handle: "paulg", name: "Paul Graham", desc: "Startup essays", gradient: "linear-gradient(135deg, #667eea, #764ba2)" },
  { handle: "naval", name: "Naval Ravikant", desc: "Philosophy & startups", gradient: "linear-gradient(135deg, #f093fb, #f5576c)" },
  { handle: "sama", name: "Sam Altman", desc: "AI & OpenAI", gradient: "linear-gradient(135deg, #4facfe, #00f2fe)" },
  { handle: "levelsio", name: "Pieter Levels", desc: "Indie hacking", gradient: "linear-gradient(135deg, #43e97b, #38f9d7)" },
  { handle: "dhh", name: "DHH", desc: "Rails, bootstrapping", gradient: "linear-gradient(135deg, #fa709a, #fee140)" },
  { handle: "patio11", name: "Patrick McKenzie", desc: "SaaS & strategy", gradient: "linear-gradient(135deg, #a18cd1, #fbc2eb)" },
  { handle: "asmartbear", name: "Jason Cohen", desc: "WP Engine founder", gradient: "linear-gradient(135deg, #fccb90, #d57eeb)" },
  { handle: "shreyas", name: "Shreyas Doshi", desc: "Product management", gradient: "linear-gradient(135deg, #89f7fe, #66a6ff)" },
];

const [trackedSet, setTrackedSet] = useState<Set<string>>(new Set(data.watched_accounts));
const [manualHandle, setManualHandle] = useState("");
const showSuggestions = data.watched_accounts.length === 0;
```

- [ ] **Step 2: Add the trackAccount helper function**

```typescript
async function trackAccount(handle: string) {
  const { data: authData } = await getSupabaseBrowser().auth.getUser();
  if (!authData.user) return;
  const res = await fetch("/api/track-account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: authData.user.id, handle }),
  });
  if (res.ok) {
    setTrackedSet((prev) => new Set([...prev, handle.replace(/^@/, "").toLowerCase()]));
  }
}
```

- [ ] **Step 3: Add suggested accounts JSX**

Insert after the onboarding checklist, before agent metrics:

```tsx
{/* Suggested accounts */}
{showSuggestions && (
  <section id="suggested-accounts" aria-label="Suggested accounts to track" style={{ ...cardStyle, padding: "20px 24px", marginBottom: 16 }}>
    <h2 style={{ fontSize: 14, fontWeight: 600, color: T.ink, margin: "0 0 4px" }}>
      Track accounts to get started
    </h2>
    <p style={{ fontSize: 12, color: T.muted, margin: "0 0 14px" }}>
      Add accounts you want to engage with. Pingi will watch their posts and draft replies.
    </p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8, marginBottom: 12 }}>
      {SUGGESTED_ACCOUNTS.map((a) => {
        const isTracked = trackedSet.has(a.handle);
        return (
          <button
            key={a.handle}
            onClick={() => !isTracked && trackAccount(a.handle)}
            disabled={isTracked}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 12px", borderRadius: 10,
              border: `1px solid ${isTracked ? T.accent : T.border}`,
              background: isTracked ? "rgba(99,102,241,0.04)" : "#fff",
              cursor: isTracked ? "default" : "pointer",
              textAlign: "left", fontFamily: sans,
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 14,
              background: a.gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0,
            }}>
              {a.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                @{a.handle}
              </div>
              <div style={{ fontSize: 10, color: T.muted }}>{a.desc}</div>
            </div>
            {isTracked ? (
              <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="7" fill={T.accent}/><path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
            ) : (
              <span style={{ fontSize: 16, color: T.accent, fontWeight: 300, flexShrink: 0 }}>+</span>
            )}
          </button>
        );
      })}
    </div>
    {/* Manual input */}
    <div style={{ display: "flex", gap: 6 }}>
      <input
        type="text"
        value={manualHandle}
        onChange={(e) => setManualHandle(e.target.value)}
        placeholder="or enter any @handle"
        style={{
          flex: 1, padding: "8px 12px", borderRadius: 8,
          border: `1px solid ${T.border}`, fontSize: 13,
          fontFamily: sans, color: T.ink, outline: "none",
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && manualHandle.trim()) {
            trackAccount(manualHandle.trim());
            setManualHandle("");
          }
        }}
      />
      <button
        onClick={() => {
          if (manualHandle.trim()) {
            trackAccount(manualHandle.trim());
            setManualHandle("");
          }
        }}
        style={{
          padding: "8px 16px", borderRadius: 8,
          background: T.accent, color: "#fff",
          border: "none", fontSize: 12, fontWeight: 600,
          fontFamily: sans, cursor: "pointer",
        }}
      >
        Add
      </button>
    </div>
  </section>
)}
```

- [ ] **Step 4: Verify and commit**

```bash
cd web && npx tsc --noEmit
git add web/src/app/dashboard/DashboardClient.tsx
git commit -m "feat: add suggested accounts section with one-click tracking"
```

---

### Task 11: Final Typecheck, Build, Deploy

- [ ] **Step 1: Full typecheck**

```bash
cd /Users/harukamorimori/pingi-ai/web && npx tsc --noEmit
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit all remaining changes**

```bash
cd /Users/harukamorimori/pingi-ai
git add -A
git commit -m "feat: complete onboarding aha moment — checklist, suggested accounts, banners"
```

- [ ] **Step 4: Push and deploy**

```bash
git push origin main
cd web && npx vercel --prod
```

- [ ] **Step 5: Run migration on Supabase**

Execute in SQL Editor:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_celebration BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_extended BOOLEAN NOT NULL DEFAULT false;
```
