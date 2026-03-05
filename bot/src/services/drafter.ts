/**
 * Claude-powered context classification and draft generation.
 * Uses the tone system from docs/TONE_SYSTEM.md.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ContextCategory } from "../types.js";

const MODEL = "claude-sonnet-4-20250514";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[drafter] ANTHROPIC_API_KEY not set, drafts will be empty");
    return null;
  }
  client = new Anthropic({ apiKey });
  return client;
}

// ─── Anti-AI rules (from TONE_SYSTEM.md) ───

const ANTI_AI_RULES = `RULES (non-negotiable):
- NEVER use: delve, embark, leverage, utilize, game-changer, unlock, cutting-edge, groundbreaking, remarkable, revolutionary, tapestry, illuminate, unveil, pivotal, intricate, hence, furthermore, moreover, realm, landscape, testament, harness, exciting, ever-evolving, foster, elevate, streamline, robust, seamless, synergy, holistic, paradigm, innovative, optimize, empower, curate, ecosystem, stakeholder, scalable, deep dive, double down, circle back, move the needle, at the end of the day, craft, navigate, supercharge, boost, powerful, inquiries, stark
- NEVER use em dashes. Use commas or periods.
- NEVER use semicolons.
- NEVER start with "Great question!" or "Thanks for sharing!" or "I'm excited to..."
- NEVER use "Not just X, but also Y" constructions
- NEVER use "Let me know if you have any questions" or "Happy to help" or "Feel free to reach out"
- Maximum ONE exclamation mark per reply
- No lists in conversational replies
- No markdown formatting (bold, headers) in replies
- DO use contractions (don't, can't, won't, I'd, we're, that's)
- DO use sentence fragments when natural ("Works for me." "Totally.")
- DO vary sentence lengths. Mix short punchy with longer ones.
- DO use active voice, not passive
- DO use specific details over generic praise
- Match the formality level of the incoming message. Never be more formal than the person who wrote to you.`;

// ─── Context category descriptions for the classifier ───

const CONTEXT_DESCRIPTIONS: Record<ContextCategory, { tone: string; goal: string; length: string }> = {
  BUSINESS_OPPORTUNITY: {
    tone: "Professional, responsive, creates next step",
    goal: "Move to a call or meeting",
    length: "2-3 sentences",
  },
  PROFESSIONAL_NETWORK: {
    tone: "Warm but not overeager, peer-to-peer",
    goal: "Build relationship, keep door open",
    length: "2-3 sentences",
  },
  AUDIENCE_ENGAGEMENT: {
    tone: "Grateful but brief, match their energy",
    goal: "Acknowledge, encourage further engagement",
    length: "1-2 sentences",
  },
  KNOWLEDGE_EXCHANGE: {
    tone: "Helpful, direct, share real insight",
    goal: "Give useful answer, show expertise without lecturing",
    length: "2-4 sentences",
  },
  OPERATIONAL: {
    tone: "Clear, efficient, action-oriented",
    goal: "Resolve or advance the task",
    length: "1-3 sentences",
  },
  PERSONAL: {
    tone: "Casual, real, match their vibe",
    goal: "Be human",
    length: "Whatever feels natural",
  },
};

// ─── Classify context ───

const VALID_CATEGORIES = new Set<ContextCategory>([
  "BUSINESS_OPPORTUNITY", "PROFESSIONAL_NETWORK", "AUDIENCE_ENGAGEMENT",
  "KNOWLEDGE_EXCHANGE", "OPERATIONAL", "PERSONAL",
]);

export async function classifyContext(
  platform: string,
  authorName: string,
  subject: string,
  snippet: string
): Promise<ContextCategory> {
  const anthropic = getClient();
  if (!anthropic) return "OPERATIONAL";

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: `Classify this message into exactly one category:
BUSINESS_OPPORTUNITY, PROFESSIONAL_NETWORK, AUDIENCE_ENGAGEMENT,
KNOWLEDGE_EXCHANGE, OPERATIONAL, PERSONAL

Message: ${snippet}
From: ${authorName} on ${platform}
Subject/Context: ${subject}

Respond with just the category name, nothing else.`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const category = text.toUpperCase().replace(/\s+/g, "_") as ContextCategory;
    if (VALID_CATEGORIES.has(category)) return category;

    console.warn(`[drafter] Unexpected classification: "${text}", defaulting to OPERATIONAL`);
    return "OPERATIONAL";
  } catch (e: any) {
    console.error(`[drafter] Classification failed: ${e.message}`);
    return "OPERATIONAL";
  }
}

// ─── Generate draft reply ───

export async function generateDraft(
  platform: string,
  authorName: string,
  subject: string,
  snippet: string,
  context: ContextCategory
): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) return "";

  const ctx = CONTEXT_DESCRIPTIONS[context];

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are drafting a short email reply on behalf of the user.

CONTEXT: ${context}
PLATFORM: ${platform}
FROM: ${authorName}
SUBJECT: ${subject}
INCOMING MESSAGE: ${snippet}

TONE FOR THIS CONTEXT:
${ctx.tone}
Reply goal: ${ctx.goal}
Target length: ${ctx.length}

${ANTI_AI_RULES}

Write a reply that sounds like a real person typed it on their phone. Keep it to ${ctx.length}. Match the sender's formality level. If the incoming message is casual, be casual. If it's formal, be slightly less formal than them.

Do not include a subject line. Do not include a greeting like "Dear X". Just the reply body. No sign-off unless the context is formal email.`,
        },
      ],
    });

    const draft = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    return draft;
  } catch (e: any) {
    console.error(`[drafter] Draft generation failed: ${e.message}`);
    return "";
  }
}

// ─── Rewrite draft based on user instruction ───

export async function rewriteDraft(
  originalMessage: string,
  currentDraft: string,
  instruction: string
): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) return currentDraft;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are helping a user edit a draft reply to an email.

ORIGINAL EMAIL THEY RECEIVED:
${originalMessage}

CURRENT DRAFT REPLY:
${currentDraft}

USER'S EDIT INSTRUCTION:
${instruction}

${ANTI_AI_RULES}

Rewrite the draft according to the user's instruction. Keep the same general intent but apply their requested change. The result should still sound like a real person typed it.

Return ONLY the new draft text. No explanation, no quotes, no "Here's the updated draft:" prefix. Just the reply itself.`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    if (!text) return currentDraft;
    console.log(`[drafter] Rewrite: "${instruction}" → ${text.length} chars`);
    return text;
  } catch (e: any) {
    console.error(`[drafter] Rewrite failed: ${e.message}`);
    return currentDraft;
  }
}

// ─── Combined: classify + draft in one call ───

export async function classifyAndDraft(
  platform: string,
  authorName: string,
  subject: string,
  snippet: string
): Promise<{ context: ContextCategory; draftText: string }> {
  const context = await classifyContext(platform, authorName, subject, snippet);
  const draftText = await generateDraft(platform, authorName, subject, snippet, context);
  console.log(`[drafter] ${authorName}: context=${context}, draft=${draftText.length} chars`);
  return { context, draftText };
}
