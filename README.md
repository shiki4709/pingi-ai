# 🔔 Pingi AI

**Your AI engagement agent — never miss a reply across Gmail, X, and LinkedIn.**

Pingi monitors your social platforms for comments, mentions, and emails that need your reply. It surfaces them with urgency-based priority and AI-drafted responses so you can respond in seconds.

## Phase 0: Personal Digest Script

This is the Phase 0 implementation — a CLI script that fetches your missed engagement across all three platforms, generates AI draft replies using Claude, and prints a prioritized digest.

### Quick Start

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/pingi-ai.git
cd pingi-ai
npm install

# 2. Set up environment
cp .env.example .env
# Fill in your API keys (see Setup below)

# 3. Run the digest
npm run digest
```

### Setup

#### Gmail
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Gmail API
3. Create OAuth 2.0 credentials (Web application)
4. Set redirect URI to `http://localhost:3000/auth/google/callback`
5. Run the auth helper:
```bash
npm run auth:gmail
# Opens a URL → sign in → paste the code back
npm run auth:gmail YOUR_CODE_HERE
# Prints your refresh token → add to .env
```

#### X / Twitter
1. Apply at [developer.x.com](https://developer.x.com)
2. Create a project + app with OAuth 1.0a (Read and Write)
3. Generate access tokens
4. Find your numeric user ID at [tweeterid.com](https://tweeterid.com)
5. Add all keys to `.env`

#### LinkedIn
1. Create an app at [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Request Community Management API access
3. Generate an OAuth access token with `r_organization_social` and `w_member_social` scopes
4. Find your person URN (format: `urn:li:person:ABC123`)
5. Add to `.env`

#### Claude API
1. Get an API key at [console.anthropic.com](https://console.anthropic.com/)
2. Add `ANTHROPIC_API_KEY` to `.env`

### Commands

```bash
# Full digest with AI drafts
npm run digest

# Quick scan without AI drafts (faster, no Claude API calls)
npm run digest:no-drafts

# Save digest to a file
npm run digest:save
```

### How It Works

```
📡 Fetch          🔍 Classify        🧠 Draft          📊 Digest
Gmail ──┐                                                 
Twitter ─┼──→ Filter noise ──→ Score urgency ──→ Claude AI ──→ Terminal
LinkedIn─┘    (skip noreply,     🔥 red (>12h)    drafts       output
               automated msgs)   ⚡ amber (4-12h)  replies
                                 💬 green (<4h)
```

### Urgency Levels

| Level | Emoji | Meaning | Default Threshold |
|-------|-------|---------|-------------------|
| Green | 💬 | Fresh, no rush | < 4 hours |
| Amber | ⚡ | Getting stale | 4–12 hours |
| Red | 🔥 | Overdue, reply ASAP | > 12 hours |

Twitter mentions get an urgency boost (they decay faster). Email follow-ups also get boosted.

### Roadmap

- [x] **Phase 0** — CLI digest script (this repo)
- [ ] **Phase 1** — Web dashboard with one-click reply posting
- [ ] **Phase 2** — React Native mobile app with push notifications
- [ ] **Phase 3** — Multi-user SaaS with billing

### Cost

Phase 0 runs for essentially free:
- Claude API: ~$0.005/draft × your daily volume
- Twitter API: Free tier (1,500 reads/month)
- Gmail API: Free
- LinkedIn API: Free

---

Built with [Claude](https://anthropic.com) 🤖
