# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pingi AI is an AI engagement agent that monitors Gmail, Twitter/X, and LinkedIn for messages/mentions/comments needing replies. It generates urgency-prioritized digests with AI-drafted responses using Claude. The primary interface is a Telegram bot (chat-first architecture). Phase 0 CLI digest script still exists in root `src/`.

## Design Reference
- See docs/design/dashboard-reference.jsx for the full UI/UX flow
- Design system: Liquid glass morphism (frosted translucent cards, backdrop-blur, warm neutral backgrounds)
- Fonts: DM Sans (body), Instrument Serif (display)
- No emoji anywhere in the UI
- See docs/TONE_SYSTEM.md for AI draft voice rules and anti-AI writing guidelines

## Commands

### Telegram Bot (`/bot`)
```bash
cd bot
npm run dev                 # Start bot server with hot reload (tsx watch)
npm run build               # Compile TypeScript (tsc → dist/)
npm run typecheck           # Type-check without emitting (tsc --noEmit)
npm run webhook:set         # Register webhook URL with Telegram
```

### CLI Digest (root)
```bash
npm run digest              # Full digest with AI-drafted replies
npm run digest:no-drafts    # Fetch-only scan, no Claude API calls
npm run digest:save         # Save digest output to digest-YYYY-MM-DD.txt
npm run auth:gmail          # One-time OAuth helper to generate Gmail refresh token
npm run build               # Compile TypeScript (tsc → dist/)
npm run typecheck           # Type-check without emitting (tsc --noEmit)
```

No test framework is configured yet. No linter or formatter is configured.

## Architecture

### Telegram Bot (`bot/`)

Push-only notification bot. No slash commands except /start. Each engagement item is pushed as its own message with inline buttons (Send, Edit, Skip). Editing happens conversationally: user taps Edit, bot asks how to adjust, user types instruction, bot updates draft and re-shows buttons.

**Entry point**: `bot/src/index.ts` — Fastify server, webhook/polling mode, periodic push of new items (30s interval).

#### Key modules (`bot/src/`)
- `handlers.ts` — /start handler, callback query handler (send/edit/skip buttons), free-text edit flow with per-chat edit state, `pushItemCard()` for sending item notifications
- `telegram.ts` — Telegram Bot API client (sendMessage, editMessageText, answerCallbackQuery, getUpdates, setWebhook, deleteWebhook) via fetch
- `formatter.ts` — Renders items as Telegram MarkdownV2: item card, sent/skipped confirmation, edit prompt, updated draft
- `mock-data.ts` — In-memory store with 7 mock items matching dashboard-reference.jsx. Will be replaced with Supabase.
- `types.ts` — Telegram update types + EngagementItem, TrackedItem
- `config.ts` — Environment config with `dotenv/config`. `usePolling` auto-detects: no WEBHOOK_URL = polling mode.

**Interaction model**: Push-only with inline keyboards. /start is the only command. All actions via button taps.

**Polling vs webhook**: When WEBHOOK_URL is empty (local dev), bot uses long polling via getUpdates. When set (production), uses webhook POST endpoint.

### CLI Digest (root `src/`)

The app follows a linear pipeline: **Fetch → Classify → Draft → Format**.

**Entry point**: `src/index.ts` — orchestrates the entire pipeline, parses CLI flags (`--no-drafts`, `--save`).

### Connectors (`src/connectors/`)

Each connector fetches from one platform and returns `ConnectorResult` (items + non-fatal errors). All three run in parallel via `Promise.all`:
- `gmail.ts` — Gmail API v1 via OAuth2 refresh token; filters out noreply/automated emails
- `twitter.ts` — Twitter API v2 user mention timeline; handles rate limits gracefully
- `linkedin.ts` — LinkedIn Community Management API; fetches posts then scans comments

### Services (`src/services/`)
- `drafter.ts` — Calls Claude Sonnet 4 serially (300ms delay between calls) with platform-specific system prompts. Failures are non-blocking.
- `digest.ts` — Formats items into a human-readable console digest sorted by urgency (red → amber → green).

### Core modules
- `types.ts` — Shared interfaces: `EngagementItem`, `ConnectorResult`, `DigestResult`. This is the data contract.
- `urgency.ts` — Pure functions for urgency calculation. Thresholds: green < 4h, amber 4–12h, red > 12h. Platform-specific boosts (Twitter mentions decay faster, Gmail follow-ups bump to amber).

## Key Design Patterns

- **Non-blocking errors**: Connectors collect errors in `ConnectorResult.errors[]` — partial failures don't crash the digest.
- **Graceful degradation**: Missing API keys or failed connectors skip that platform. Missing drafts still show the item.
- **Environment-driven config**: All API credentials and settings come from `.env` (see `.env.example`). `LOOKBACK_HOURS` controls fetch window (default 24).

## TypeScript

- Root CLI: Strict mode, target ES2022, CommonJS output, run via `tsx`
- Bot: Strict mode, target ES2022, ESM output (`"type": "module"`), run via `tsx watch`
- Node.js >=18 required
