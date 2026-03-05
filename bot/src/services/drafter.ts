/**
 * Claude-powered context classification and draft generation.
 * Uses the tone system from docs/TONE_SYSTEM.md.
 * Platform-aware: adapts length, tone, and formatting per platform.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ContextCategory, Platform } from "../types.js";

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

// ─── Helper: extract first name from author_name ───

function extractFirstName(authorName: string): string {
  // "John Smith" → "John", "Dr. Jane Doe" → "Jane", "alice" → "alice"
  const cleaned = authorName
    .replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "")
    .trim();
  return cleaned.split(/\s+/)[0] || authorName;
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

// ─── Platform-specific instructions ───

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  gmail: `PLATFORM: Email (Gmail)
- Write 2-5 sentences. Emails can be a bit longer than social replies.
- If the sender used a greeting ("Hi [name]"), use one too. Address them by first name.
- If the sender used a sign-off, you can use a brief one (e.g., "Best," or "Cheers,"). If they didn't, skip it.
- If the sender asked specific questions, address each one.
- If they proposed a meeting time, respond to it specifically.
- If they shared a link or attachment, acknowledge it.
- Mirror the sender's level of formality. Use their first name if they used yours.`,

  twitter: `PLATFORM: Twitter/X
- Keep under 280 characters total.
- No greeting, no sign-off. Jump straight to the point.
- Snappy and direct. Match the casual tone of the platform.
- Sentence fragments are fine. Be conversational.`,

  linkedin: `PLATFORM: LinkedIn
- 1-3 sentences. Slightly more professional than Twitter but less formal than email.
- No "Dear" or overly formal greeting. First name is fine.
- No sign-off needed unless the context is very formal.
- Professional but still sounds human, not corporate.`,
};

function getPlatformInstructions(platform: string): string {
  return PLATFORM_INSTRUCTIONS[platform] ?? PLATFORM_INSTRUCTIONS.gmail;
}

// ─── Context category descriptions ───

interface ContextConfig {
  tone: string;
  goal: string;
  length: string;
  extraInstructions?: string;
}

const CONTEXT_DESCRIPTIONS: Record<ContextCategory, ContextConfig> = {
  BUSINESS_OPPORTUNITY: {
    tone: "Professional, responsive, engaged, proactive",
    goal: "Move to a call or meeting. Propose a concrete next step.",
    length: "2-4 sentences",
    extraInstructions: "Sound genuinely interested, not just polite. Propose a specific next step (a call, a meeting, sharing a calendar link). Show you've read what they sent. Don't be passive.",
  },
  PROFESSIONAL_NETWORK: {
    tone: "Warm, peer-to-peer, proactive",
    goal: "Build relationship, keep door open, suggest something concrete",
    length: "2-4 sentences",
    extraInstructions: "Sound like you actually want to connect, not just being polite. If relevant, suggest a specific way to continue the conversation (coffee, a call, an event). Reference something specific they said.",
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
  context: ContextCategory,
  signOff?: string | null
): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) return "";

  const ctx = CONTEXT_DESCRIPTIONS[context];
  const firstName = extractFirstName(authorName);
  const platformGuide = getPlatformInstructions(platform);

  const extraBlock = ctx.extraInstructions
    ? `\nADDITIONAL INSTRUCTIONS FOR THIS CONTEXT:\n${ctx.extraInstructions}\n`
    : "";

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `You are drafting a reply on ${platform} on behalf of the user.

${platformGuide}

CONTEXT CATEGORY: ${context}
SENDER: ${authorName} (first name: ${firstName})
SUBJECT: ${subject}
FULL INCOMING MESSAGE:
${snippet}

TONE FOR THIS CONTEXT:
${ctx.tone}
Reply goal: ${ctx.goal}
Target length: ${ctx.length}
${extraBlock}
${ANTI_AI_RULES}

Write a reply that sounds like a real person typed it. Adapt your length and tone for ${platform}.

If the sender asked specific questions, address each one. If they proposed a meeting time, respond to it. If they shared a link, acknowledge it. Mirror the sender's level of formality. Use their first name (${firstName}) if they used yours.

Do not include a subject line. Do not include a sign-off or signature. Return only the reply body.`,
        },
      ],
    });

    let draft = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    // Append sign-off for email platforms only
    if (draft && signOff && platform === "gmail") {
      draft = draft + "\n\n" + signOff;
    }

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
      max_tokens: 400,
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
  snippet: string,
  signOff?: string | null
): Promise<{ context: ContextCategory; draftText: string }> {
  const context = await classifyContext(platform, authorName, subject, snippet);
  const draftText = await generateDraft(platform, authorName, subject, snippet, context, signOff);
  console.log(`[drafter] ${authorName}: context=${context}, draft=${draftText.length} chars`);
  return { context, draftText };
}
