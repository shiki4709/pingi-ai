# Invite Code System for Free Testers

## Overview

A trackable invite code system to onboard free testers for a 14-day trial. Each tester receives a unique single-use code. Testers enter the code during onboarding (replacing the Stripe payment screen). At expiry, the Telegram bot prompts testers to schedule a feedback call.

## Database

### New table: `invite_codes`

| Column       | Type        | Notes                                  |
|-------------|-------------|----------------------------------------|
| `id`        | UUID        | PK, default `gen_random_uuid()`        |
| `code`      | TEXT        | Unique, 6-char uppercase hex           |
| `created_at`| TIMESTAMPTZ | Default `now()`                        |
| `expires_at`| TIMESTAMPTZ | Optional expiry for the code itself    |
| `used_by`   | UUID        | FK to `users.id`, nullable             |
| `used_at`   | TIMESTAMPTZ | Nullable, set when redeemed            |

- Single-use: once `used_by` is set, the code cannot be reused.
- `code` column must have an explicit `UNIQUE` constraint.
- Codes are generated via SQL in Supabase dashboard (no admin UI needed).
- Code format: `crypto.randomBytes(3).toString("hex").toUpperCase()` (e.g., `A3F1B2`).
- Bulk generation should use `ON CONFLICT (code) DO NOTHING` to handle rare collisions.

### `users` table additions

| Column               | Type    | Notes                                      |
|-----------------------|---------|--------------------------------------------|
| `source`             | TEXT    | `"organic"`, `"invite_code"`, or `"admin"`. Default `"organic"`. Existing rows get `"organic"`. |
| `invite_code_id`     | UUID    | FK to `invite_codes.id`, nullable          |
| `sent_expiry_warning`| BOOLEAN | Default `false`, prevents duplicate day-12 msg |
| `sent_expiry_notice` | BOOLEAN | Default `false`, prevents duplicate day-14 msg |

- Auth callback (`/auth/callback/route.ts`) should set `source = "organic"` for new signups.
- Admin bypass in auth callback should set `source = "admin"`.

## Onboarding Flow (Screen 3)

Current behavior: screen 3 shows "Start free trial" with Stripe checkout (skipped for pro/admin users).

### New behavior

1. If user is admin or already pro: skip screen (unchanged).
2. Otherwise, show invite code input:
   - Heading: "Have an invite code?"
   - Text input field for the 6-character code
   - Submit button
   - Below: "No code? Start free trial" link to existing Stripe flow
3. On submit, call `POST /api/invite-code/redeem` with the code.
4. Valid code:
   - Set `users.plan = "trial"`
   - Set `users.trial_ends_at = now() + 14 days`
   - Set `users.source = "invite_code"`
   - Set `users.invite_code_id = invite_codes.id`
   - Set `invite_codes.used_by = user.id`
   - Set `invite_codes.used_at = now()`
   - Advance to screen 4 (completion)
5. Invalid, expired, or already-used code: show inline error message.

### API endpoint: `POST /api/invite-code/redeem`

Request body: `{ code: string, userId: string }`

Note: `userId` comes from the client (consistent with existing `/api/stripe/checkout` and `/api/trial-extend` patterns). Accepted risk for now — no user can gain access they shouldn't have since codes are single-use and pre-generated.

Validation and redemption must be atomic — use a single conditional UPDATE:
```sql
UPDATE invite_codes SET used_by = $userId, used_at = now()
WHERE code = $code AND used_by IS NULL
  AND (expires_at IS NULL OR expires_at > now())
RETURNING id;
```
If no rows returned, the code is invalid/used/expired. This prevents race conditions.

Response:
- `200`: code redeemed, user updated
- `400`: invalid code, with distinct messages: `"Code not found"`, `"Code already used"`, `"Code expired"`

## Expiry Messaging (Telegram Bot)

Two timed messages sent via a new periodic check in `bot/src/index.ts` (alongside existing drip interval). Runs every 60 minutes. Only targets users where `source = 'invite_code'` — organic Stripe trial users do not receive these messages.

Invite code testers are still eligible for the existing trial extension (`/api/trial-extend`). This is intentional — if a tester extends, they get a few extra days, which is fine for beta.

### Day 12 (2 days before expiry)

Trigger: `trial_ends_at - now() <= 2 days` AND `sent_expiry_warning = false`

Message:
> Your test access ends in 2 days. We'd love to hear how it went -- schedule a call: {FEEDBACK_CALL_URL}

After sending: set `sent_expiry_warning = true`.

### Day 14 (expiry day)

Trigger: `trial_ends_at <= now()` AND `sent_expiry_notice = false`

Message:
> Your test access has ended. Thanks for trying Pingi! If you haven't already -- book a quick chat: {FEEDBACK_CALL_URL}

After sending: set `sent_expiry_notice = true`.

### Environment variable

`FEEDBACK_CALL_URL=https://calendar.app.google/VMnMCm36vaHv5LPr6`

Stored as env var so the link can be updated without redeploying.

## What does NOT change

- `hasPro()` logic: already returns `false` when `trial_ends_at` is in the past. Testers naturally lose access after 14 days.
- Auth/signup screen: stays open, no code required to create an account.
- Stripe flow: still available for organic users via "Start free trial" link.
- Existing `/api/link-code` route: this is for Telegram linking, unrelated. The new endpoint is `/api/invite-code/redeem`.

## Code Management (Manual via SQL)

### Generate a code

```sql
INSERT INTO invite_codes (code)
VALUES ('A3F1B2')
RETURNING code;
```

### Generate 10 codes at once

```sql
INSERT INTO invite_codes (code)
SELECT upper(encode(gen_random_bytes(3), 'hex'))
FROM generate_series(1, 10)
ON CONFLICT (code) DO NOTHING
RETURNING code;
```

### Check tester status

```sql
SELECT u.email, u.created_at, u.onboarding_completed,
       u.trial_ends_at, ic.code
FROM users u
JOIN invite_codes ic ON ic.id = u.invite_code_id
WHERE u.source = 'invite_code'
ORDER BY u.created_at DESC;
```

### Check unused codes

```sql
SELECT code, created_at FROM invite_codes
WHERE used_by IS NULL
ORDER BY created_at DESC;
```
