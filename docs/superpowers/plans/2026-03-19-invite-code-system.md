# Invite Code System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow free testers to redeem unique invite codes during onboarding for 14-day full access, with expiry notifications via Telegram bot linking to a feedback call booking page.

**Architecture:** New `invite_codes` table + `/api/invite-code/redeem` endpoint + modified onboarding screen 3 with code input + periodic bot check for expiry messaging. Existing `hasPro()` handles access gating — no changes needed there.

**Tech Stack:** Next.js API routes, Supabase (Postgres), Telegram Bot API, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-18-invite-code-system-design.md`

---

### Task 1: Database migration — `invite_codes` table + `users` columns

**Files:**
- Create: `supabase/migrations/010_invite_codes.sql`

- [ ] **Step 1: Write the migration**

```sql
-- invite_codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  used_by UUID REFERENCES users(id),
  used_at TIMESTAMPTZ
);

CREATE INDEX idx_invite_codes_code ON invite_codes(code);

-- users table additions
ALTER TABLE users ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'organic';
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code_id UUID REFERENCES invite_codes(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS sent_expiry_warning BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sent_expiry_notice BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase db push` or apply via Supabase dashboard SQL editor.
Expected: Tables and columns created without errors.

- [ ] **Step 3: Generate a test invite code**

Run in Supabase SQL editor:
```sql
INSERT INTO invite_codes (code) VALUES ('TEST01') RETURNING *;
```
Expected: Row created with id, code='TEST01', created_at set, used_by NULL.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/010_invite_codes.sql
git commit -m "migration: add invite_codes table and user tracking columns"
```

---

### Task 2: API endpoint — `POST /api/invite-code/redeem`

**Files:**
- Create: `web/src/app/api/invite-code/redeem/route.ts`

- [ ] **Step 1: Create the redeem endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const { code, userId } = await request.json();
    if (!code || !userId) {
      return NextResponse.json({ error: "Missing code or userId" }, { status: 400 });
    }

    const supabase = getSupabase();
    const normalizedCode = code.trim().toUpperCase();

    // Atomic redemption: only succeeds if code exists, is unused, and not expired
    const { data: redeemed, error: redeemError } = await supabase
      .from("invite_codes")
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq("code", normalizedCode)
      .is("used_by", null)
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .select("id")
      .single();

    if (redeemError || !redeemed) {
      // Determine specific error for better UX
      const { data: existing } = await supabase
        .from("invite_codes")
        .select("used_by, expires_at")
        .eq("code", normalizedCode)
        .single();

      if (!existing) {
        return NextResponse.json({ error: "Code not found" }, { status: 400 });
      }
      if (existing.used_by) {
        return NextResponse.json({ error: "Code already used" }, { status: 400 });
      }
      if (existing.expires_at && new Date(existing.expires_at) <= new Date()) {
        return NextResponse.json({ error: "Code expired" }, { status: 400 });
      }
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // Update user: 14-day trial, source, link to invite code
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { error: userError } = await supabase
      .from("users")
      .update({
        plan: "trial",
        trial_ends_at: trialEndsAt,
        source: "invite_code",
        invite_code_id: redeemed.id,
      })
      .eq("id", userId);

    if (userError) {
      console.error("[invite-code/redeem] Failed to update user:", userError);
      return NextResponse.json({ error: "Failed to activate trial" }, { status: 500 });
    }

    console.log(`[invite-code/redeem] Code ${normalizedCode} redeemed by user ${userId}, trial until ${trialEndsAt}`);
    return NextResponse.json({ success: true, trial_ends_at: trialEndsAt });
  } catch (err) {
    console.error("[invite-code/redeem] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test manually**

1. Start dev server: `cd web && npm run dev`
2. Use curl or browser console:
```bash
curl -X POST http://localhost:3000/api/invite-code/redeem \
  -H "Content-Type: application/json" \
  -d '{"code":"TEST01","userId":"<your-user-id>"}'
```
Expected: `{"success":true,"trial_ends_at":"2026-04-02T..."}`

3. Try the same code again:
Expected: `{"error":"Code already used"}`

4. Try a non-existent code:
Expected: `{"error":"Code not found"}`

- [ ] **Step 3: Commit**

```bash
git add web/src/app/api/invite-code/redeem/route.ts
git commit -m "feat: add invite code redemption API endpoint"
```

---

### Task 3: Onboarding screen 3 — invite code input UI

**Files:**
- Modify: `web/src/app/onboarding/OnboardingClient.tsx`

The current screen 3 (lines 612-733) shows "Start your free trial" with Stripe checkout. We need to add an invite code section above the Stripe button.

- [ ] **Step 1: Add invite code state variables**

After line 70 (`const [userPlan, setUserPlan] = useState<string | null>(null);`), add:

```typescript
// Invite code
const [inviteCode, setInviteCode] = useState("");
const [inviteError, setInviteError] = useState<string | null>(null);
const [redeemingCode, setRedeemingCode] = useState(false);
```

- [ ] **Step 2: Add the invite code handler**

After the `handleSubscribe` function (after line 261), add:

```typescript
const handleRedeemCode = async () => {
  if (!user || !inviteCode.trim()) return;
  setRedeemingCode(true);
  setInviteError(null);

  try {
    const res = await fetch("/api/invite-code/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: inviteCode.trim(), userId: user.id }),
    });
    const data = await res.json();

    if (data.success) {
      setUserPlan("trial");
      setScreen(4);
      return;
    }
    setInviteError(data.error ?? "Invalid code");
  } catch {
    setInviteError("Network error. Please try again.");
  }
  setRedeemingCode(false);
};
```

- [ ] **Step 3: Replace screen 3 content**

Replace the screen 3 block (lines 612-733) with a version that shows the invite code input first, then the Stripe option below. The full replacement:

```tsx
{/* ─── Screen 3: Start subscription ─── */}
{screen === 3 && (
  <div
    style={{
      textAlign: "center",
      maxWidth: 420,
      animation: "fadeIn 0.3s ease",
    }}
  >
    <h1
      style={{
        fontFamily: serif,
        fontSize: 28,
        fontWeight: 400,
        color: T.ink,
        margin: "0 0 6px",
      }}
    >
      Have an invite code?
    </h1>
    <p
      style={{
        fontSize: 14,
        color: T.body,
        margin: "0 0 28px",
        lineHeight: 1.6,
      }}
    >
      Enter your code to start your 14-day free trial.
    </p>

    <div
      style={{
        ...card,
        padding: "28px 24px",
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", gap: 10, marginBottom: inviteError ? 12 : 0 }}>
        <input
          type="text"
          value={inviteCode}
          onChange={(e) => {
            setInviteCode(e.target.value.toUpperCase());
            setInviteError(null);
          }}
          placeholder="e.g. A3F1B2"
          maxLength={6}
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 10,
            border: `1px solid ${inviteError ? "#EF4444" : T.border}`,
            fontSize: 16,
            fontFamily: "monospace",
            letterSpacing: 3,
            textAlign: "center",
            outline: "none",
            textTransform: "uppercase",
            background: T.bg,
            color: T.ink,
          }}
        />
        <button
          onClick={handleRedeemCode}
          disabled={redeemingCode || inviteCode.trim().length === 0}
          style={{
            padding: "12px 24px",
            borderRadius: 10,
            border: "none",
            background: T.ink,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: redeemingCode || !inviteCode.trim() ? "not-allowed" : "pointer",
            fontFamily: sans,
            opacity: redeemingCode || !inviteCode.trim() ? 0.5 : 1,
          }}
        >
          {redeemingCode ? "..." : "Redeem"}
        </button>
      </div>
      {inviteError && (
        <p style={{ fontSize: 13, color: "#EF4444", margin: 0 }}>
          {inviteError}
        </p>
      )}
    </div>

    <div
      style={{
        borderTop: `1px solid ${T.border}`,
        paddingTop: 20,
        marginBottom: 16,
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: T.muted,
          margin: "0 0 16px",
        }}
      >
        No invite code? Start a free trial instead.
      </p>

      <div
        style={{
          ...card,
          padding: "28px 24px",
          textAlign: "left",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: T.ink,
            marginBottom: 16,
          }}
        >
          What you get
        </div>
        {[
          "AI-drafted replies to emails and tweets",
          "Smart urgency detection and prioritization",
          "Review and send from Telegram with one tap",
          "Unlimited agents and connected accounts",
          "3-day free trial, no charge today",
        ].map((item) => (
          <div
            key={item}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              marginBottom: 10,
              fontSize: 13,
              color: T.body,
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                color: T.green,
                fontWeight: 700,
                fontSize: 14,
                lineHeight: "20px",
                flexShrink: 0,
              }}
            >
              {"\u2713"}
            </span>
            {item}
          </div>
        ))}
      </div>

      {subscribeError && (
        <p
          style={{
            fontSize: 13,
            color: T.muted,
            margin: "0 0 16px",
          }}
        >
          {subscribeError}
        </p>
      )}

      <button
        onClick={handleSubscribe}
        disabled={subscribing}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 12,
          border: "none",
          background: T.ink,
          color: "#fff",
          fontSize: 15,
          fontWeight: 600,
          cursor: subscribing ? "wait" : "pointer",
          fontFamily: sans,
          marginBottom: 12,
        }}
      >
        {subscribing ? "Redirecting..." : "Start free trial"}
      </button>

      <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>
        You won&apos;t be charged during the trial. Cancel in one
        click.
      </p>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify in browser**

1. Run: `cd web && npm run dev`
2. Navigate to `/onboarding` and advance to screen 3
3. Verify: invite code input is shown at the top with "Redeem" button
4. Verify: Stripe "Start free trial" section appears below the divider
5. Test: enter `TEST01` → should advance to screen 4
6. Test: enter `BADCODE` → should show "Code not found" error

- [ ] **Step 5: Commit**

```bash
git add web/src/app/onboarding/OnboardingClient.tsx
git commit -m "feat: add invite code input to onboarding screen 3"
```

---

### Task 4: Set `source` on new user creation in auth callback

**Files:**
- Modify: `web/src/app/auth/callback/route.ts` (lines 74-80)

- [ ] **Step 1: Add `source` to the user insert**

In `web/src/app/auth/callback/route.ts`, change the insert at lines 74-80 from:

```typescript
await serviceClient.from("users").insert({
  id: user.id,
  email,
  name: user.user_metadata?.full_name ?? null,
  plan: isAdmin ? "pro" : "trial",
  trial_ends_at: isAdmin ? null : trialEndsAt,
});
```

To:

```typescript
await serviceClient.from("users").insert({
  id: user.id,
  email,
  name: user.user_metadata?.full_name ?? null,
  plan: isAdmin ? "pro" : "trial",
  trial_ends_at: isAdmin ? null : trialEndsAt,
  source: isAdmin ? "admin" : "organic",
});
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/auth/callback/route.ts
git commit -m "feat: set source column on new user creation"
```

---

### Task 5: Telegram bot expiry notifications

**Files:**
- Modify: `bot/src/store.ts` — add query function for expiring testers
- Modify: `bot/src/index.ts` — add periodic expiry check loop
- Modify: `bot/src/config.ts` — add `FEEDBACK_CALL_URL` env var

- [ ] **Step 1: Add `FEEDBACK_CALL_URL` to bot config**

In `bot/src/config.ts`, add to the config object:

```typescript
feedbackCallUrl: process.env.FEEDBACK_CALL_URL ?? "https://calendar.app.google/VMnMCm36vaHv5LPr6",
```

- [ ] **Step 2: Add expiry query functions to store.ts**

At the end of `bot/src/store.ts` (before any closing exports), add:

```typescript
// ─── Invite code expiry notifications ───

interface ExpiringTester {
  id: string;
  telegram_chat_id: number;
  trial_ends_at: string;
  sent_expiry_warning: boolean;
  sent_expiry_notice: boolean;
}

/**
 * Find invite-code testers whose trial is expiring soon or has expired,
 * and who haven't been notified yet.
 */
export async function getExpiringTesters(): Promise<ExpiringTester[]> {
  const { data } = await getSupabase()
    .from("users")
    .select("id, telegram_chat_id, trial_ends_at, sent_expiry_warning, sent_expiry_notice")
    .eq("source", "invite_code")
    .eq("plan", "trial")
    .not("telegram_chat_id", "is", null)
    .not("trial_ends_at", "is", null);

  return (data ?? []).filter(
    (u): u is ExpiringTester =>
      u.telegram_chat_id != null &&
      u.trial_ends_at != null &&
      (!u.sent_expiry_warning || !u.sent_expiry_notice)
  );
}

export async function markExpiryWarning(userId: string): Promise<void> {
  await getSupabase()
    .from("users")
    .update({ sent_expiry_warning: true })
    .eq("id", userId);
}

export async function markExpiryNotice(userId: string): Promise<void> {
  await getSupabase()
    .from("users")
    .update({ sent_expiry_notice: true })
    .eq("id", userId);
}
```

- [ ] **Step 3: Add periodic expiry check to index.ts**

In `bot/src/index.ts`, merge the new imports into the **existing** import on line 11-16. Change:

```typescript
import {
  getPendingItemsForUser,
  getUserIdForChat,
  getItemsSince,
  getAllChatIds,
} from "./store.js";
```

To:

```typescript
import {
  getPendingItemsForUser,
  getUserIdForChat,
  getItemsSince,
  getAllChatIds,
  getExpiringTesters,
  markExpiryWarning,
  markExpiryNotice,
} from "./store.js";
```

Note: `config` (line 3) and `sendMessage` (line 18) are already imported — no changes needed for those.

Add the expiry check function and timer before the `start()` function (around line 276):

```typescript
// ─── Tester expiry notifications ───
const EXPIRY_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let expiryCheckTimer: ReturnType<typeof setInterval> | null = null;

async function checkExpiringTesters(): Promise<void> {
  try {
    const testers = await getExpiringTesters();
    const now = new Date();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

    for (const tester of testers) {
      const expiresAt = new Date(tester.trial_ends_at);
      const msUntilExpiry = expiresAt.getTime() - now.getTime();

      // Day 14: trial has expired
      if (msUntilExpiry <= 0 && !tester.sent_expiry_notice) {
        await sendMessage({
          chat_id: tester.telegram_chat_id,
          text: `Your test access has ended\\. Thanks for trying Pingi\\!\n\nIf you haven\\'t already \u2014 [book a quick chat](${config.feedbackCallUrl})`,
          parse_mode: "MarkdownV2",
        });
        await markExpiryNotice(tester.id);
        console.log(`[expiry] Sent expiry notice to user ${tester.id}`);
      }
      // Day 12: 2 days before expiry
      else if (msUntilExpiry <= twoDaysMs && msUntilExpiry > 0 && !tester.sent_expiry_warning) {
        await sendMessage({
          chat_id: tester.telegram_chat_id,
          text: `Your test access ends in 2 days\\. We\\'d love to hear how it went \u2014 [schedule a call](${config.feedbackCallUrl})`,
          parse_mode: "MarkdownV2",
        });
        await markExpiryWarning(tester.id);
        console.log(`[expiry] Sent expiry warning to user ${tester.id}`);
      }
    }
  } catch (err) {
    console.error("[expiry] Failed to check expiring testers:", err);
  }
}

function startExpiryCheckTimer(): void {
  // Run once immediately, then every hour
  checkExpiringTesters();
  expiryCheckTimer = setInterval(() => {
    checkExpiringTesters().catch((err) =>
      console.error("[expiry] Expiry check failed:", err)
    );
  }, EXPIRY_CHECK_INTERVAL_MS);
}

function stopExpiryCheckTimer(): void {
  if (expiryCheckTimer) {
    clearInterval(expiryCheckTimer);
    expiryCheckTimer = null;
  }
}
```

- [ ] **Step 4: Wire up the timer in start() and shutdown**

In the `start()` function (around line 297), after `startWeeklyReportTimer();`, add:

```typescript
// Start tester expiry notification checker
startExpiryCheckTimer();
```

In the shutdown handler (lines 307-316), add `stopExpiryCheckTimer()` before `app.close()`:

```typescript
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    stopPolling();
    stopDrips();
    stopWeeklyReportTimer();
    stopEngagementWorker();
    stopExpiryCheckTimer();
    pollWorker.stop();
    app.close();
  });
}
```

- [ ] **Step 5: Test manually**

1. Create a test invite code user in Supabase with `trial_ends_at` set to 1 hour from now, `source = 'invite_code'`, and your `telegram_chat_id`
2. Run the bot: `cd bot && npm run dev`
3. Expected: within a few seconds (initial check), you receive the day-12 warning message in Telegram
4. Verify the message contains the booking link
5. Update `trial_ends_at` to the past, reset `sent_expiry_notice = false`
6. Wait for next check (or restart bot): should receive day-14 message

- [ ] **Step 6: Commit**

```bash
git add bot/src/config.ts bot/src/store.ts bot/src/index.ts
git commit -m "feat: add tester expiry notifications via Telegram bot"
```

---

### Task 6: Add `FEEDBACK_CALL_URL` to environment files

**Files:**
- Modify: `bot/.env.example` (if it exists)
- Modify: `bot/.env` (local)

- [ ] **Step 1: Add to .env.example**

```bash
# Invite code tester feedback
FEEDBACK_CALL_URL=https://calendar.app.google/VMnMCm36vaHv5LPr6
```

- [ ] **Step 2: Add to local .env**

Same value. This is the production default anyway (hardcoded in config.ts as fallback), but good to have explicit.

- [ ] **Step 3: Commit**

```bash
git add bot/.env.example
git commit -m "chore: add FEEDBACK_CALL_URL to env example"
```

---

### Task 7: End-to-end verification

- [ ] **Step 1: Generate invite codes in Supabase**

Run in SQL editor:
```sql
INSERT INTO invite_codes (code)
SELECT upper(encode(gen_random_bytes(3), 'hex'))
FROM generate_series(1, 5)
ON CONFLICT (code) DO NOTHING
RETURNING code;
```

- [ ] **Step 2: Full flow test**

1. Sign up with a new account (or clear onboarding state for existing)
2. Go through onboarding screens 1 and 2
3. On screen 3, enter one of the generated codes
4. Verify: advances to screen 4
5. Check Supabase: user has `plan = 'trial'`, `trial_ends_at` = 14 days out, `source = 'invite_code'`, `invite_code_id` set
6. Check Supabase: invite code has `used_by` and `used_at` set

- [ ] **Step 3: Verify error cases**

1. Try using the same code with another account → "Code already used"
2. Try a non-existent code → "Code not found"
3. Try an empty input → button disabled

- [ ] **Step 4: Verify Stripe flow still works**

1. On screen 3, ignore invite code input, click "Start free trial" below
2. Verify: Stripe checkout flow works as before

- [ ] **Step 5: Verify tracking query**

Run in Supabase:
```sql
SELECT u.email, u.created_at, u.onboarding_completed,
       u.trial_ends_at, ic.code
FROM users u
JOIN invite_codes ic ON ic.id = u.invite_code_id
WHERE u.source = 'invite_code'
ORDER BY u.created_at DESC;
```

Expected: your test user appears with correct data.
