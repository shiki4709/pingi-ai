/**
 * Claude-powered comment drafting for X engagement.
 * Generates thoughtful, non-generic comments that add value.
 * Follows anti-AI tone rules from TONE_SYSTEM.md.
 */

import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import type { Tweet } from "./scraper.js";

const MODEL = "claude-sonnet-4-20250514";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (client) return client;
  if (!config.anthropicApiKey) {
    console.warn("[drafter] ANTHROPIC_API_KEY not set, drafts disabled");
    return null;
  }
  client = new Anthropic({ apiKey: config.anthropicApiKey });
  return client;
}

const ANTI_AI_RULES = `STRICT RULES:
- NEVER use: delve, embark, leverage, utilize, game-changer, unlock, cutting-edge, groundbreaking, remarkable, revolutionary, tapestry, illuminate, unveil, pivotal, intricate, hence, furthermore, moreover, realm, landscape, testament, harness, exciting, ever-evolving, foster, elevate, streamline, robust, seamless, synergy, holistic, paradigm, innovative, optimize, empower, curate, ecosystem, stakeholder, scalable, deep dive, double down, circle back, move the needle, craft, navigate, supercharge, boost, powerful, inquiries, stark
- NEVER use em dashes. Use commas or periods.
- NEVER use semicolons.
- NEVER start with "Great point!", "So true!", "This!", "Thanks for sharing!", "Love this!", "100%", "Couldn't agree more", "I'm excited to..."
- NEVER just agree or praise. Add something the author didn't say.
- Maximum ONE exclamation mark total.
- No hashtags. No @mentions. No markdown.
- DO use contractions (don't, can't, won't, I'd, we're)
- DO use sentence fragments ("Works both ways though." "Totally.")
- DO vary sentence lengths.
- DO be specific. Reference actual details from the tweet.
- Keep it under 280 characters.`;

export async function draftComment(tweet: Tweet): Promise<string | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  const author = tweet.username ?? "unknown";
  const authorName = tweet.name ?? author;
  const text = tweet.text ?? "";

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Write a reply to this tweet. You are engaging authentically as a knowledgeable person in this space.

TWEET by @${author} (${authorName}):
"${text}"

Stats: ${tweet.likes ?? 0} likes, ${tweet.retweets ?? 0} RTs

Your reply MUST do one of these:
- Share a specific insight, data point, or experience related to the topic
- Ask a sharp follow-up question that deepens the discussion
- Offer a nuanced take the author didn't consider
- Connect their point to something adjacent and interesting

${ANTI_AI_RULES}

Output ONLY the reply text. Nothing else.`,
        },
      ],
    });

    const draft =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "";

    if (!draft) return null;

    // Enforce 280 char limit
    if (draft.length > 280) {
      console.log(
        `[drafter] Draft too long (${draft.length} chars), truncating`
      );
      // Try to cut at last sentence boundary
      const cut = draft.slice(0, 277);
      const lastPeriod = cut.lastIndexOf(".");
      if (lastPeriod > 200) return cut.slice(0, lastPeriod + 1);
      return cut + "...";
    }

    return draft;
  } catch (e: any) {
    console.error("[drafter] Draft failed:", e.message);
    return null;
  }
}

export async function chatWithAssistant(
  userMessage: string,
  context: {
    watchedAccounts: string[];
    searchTopics: string[];
    recentItems: { authorHandle: string; tweetText: string; status: string }[];
  }
): Promise<string | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  const accountsList = context.watchedAccounts.length > 0
    ? context.watchedAccounts.map((a) => `@${a}`).join(", ")
    : "none";
  const topicsList = context.searchTopics.length > 0
    ? context.searchTopics.join(", ")
    : "none";
  const itemsSummary = context.recentItems.length > 0
    ? context.recentItems
        .map((i) => `- @${i.authorHandle}: "${i.tweetText.slice(0, 80)}..." [${i.status}]`)
        .join("\n")
    : "No recent items.";

  const posted = context.recentItems.filter((i) => i.status === "posted").length;
  const skipped = context.recentItems.filter((i) => i.status === "skipped").length;
  const pending = context.recentItems.filter((i) => i.status === "pending").length;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: `You are Pingi, an X engagement assistant in a Telegram bot.

USER'S SETUP:
- Watched accounts: ${accountsList}
- Tracked topics: ${topicsList}

RECENT ENGAGEMENT ITEMS (${context.recentItems.length} total: ${posted} posted, ${skipped} skipped, ${pending} pending):
${itemsSummary}

RULES:
- Be specific. When the user asks about their engagement, reference actual tweet authors and content from the list above. Name names, quote snippets.
- When listing pending items, list each one: who tweeted it, what it's about.
- Never say vague things like "prioritize your pending items" or "review your queue". Instead say exactly which items are pending and what they're about.
- Keep responses concise but concrete. 2-5 sentences.
- No markdown formatting, no emojis. Plain text only.
- When suggesting commands, use ONLY these exact formats:
  /watch @paulg @naval — add accounts to watchlist
  /unwatch @paulg — remove account
  /topics AI agents, fintech — add topics (comma-separated)
  /untopics AI agents — remove a topic
  /scan — scan now
  /watch — show current watchlist
  /topics — show current topics
- Never invent subcommands like "add" or "list".`,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content[0].type === "text"
      ? response.content[0].text.trim()
      : "";
    return text || null;
  } catch (e: any) {
    console.error("[drafter] Chat failed:", e.message);
    return null;
  }
}

export async function rewriteComment(
  tweetText: string,
  currentDraft: string,
  instruction: string
): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) return currentDraft;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Rewrite this X/Twitter reply based on the user's instruction.

ORIGINAL TWEET:
"${tweetText}"

CURRENT DRAFT REPLY:
"${currentDraft}"

USER'S EDIT INSTRUCTION:
"${instruction}"

${ANTI_AI_RULES}

Return ONLY the rewritten reply. Nothing else. Keep under 280 characters.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "";
    if (!text) return currentDraft;

    if (text.length > 280) {
      const cut = text.slice(0, 277);
      const lastPeriod = cut.lastIndexOf(".");
      if (lastPeriod > 200) return cut.slice(0, lastPeriod + 1);
      return cut + "...";
    }

    return text;
  } catch (e: any) {
    console.error("[drafter] Rewrite failed:", e.message);
    return currentDraft;
  }
}
