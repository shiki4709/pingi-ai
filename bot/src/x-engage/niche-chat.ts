/**
 * Goal-based niche onboarding chat.
 * After email linking, asks the user about their goals and generates
 * a niche profile using Claude.
 */

import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import { upsertNicheProfile } from "./store.js";

const MODEL = "claude-sonnet-4-20250514";

// ─── Chat session state ───

interface NicheChatSession {
  chatId: number;
  userId: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  stage: "awaiting_goals" | "awaiting_followup" | "awaiting_account_confirm";
}

const sessions = new Map<number, NicheChatSession>();

export function startNicheChat(chatId: number, userId: string): void {
  sessions.set(chatId, {
    chatId,
    userId,
    messages: [],
    stage: "awaiting_goals",
  });
}

export function isInNicheChat(chatId: number): boolean {
  return sessions.has(chatId);
}

export function endNicheChat(chatId: number): void {
  sessions.delete(chatId);
}

// ─── LLM calls ───

function getAnthropic(): Anthropic | null {
  if (!config.anthropicApiKey) return null;
  return new Anthropic({ apiKey: config.anthropicApiKey });
}

const SYSTEM_PROMPT = `You are helping a user set up their X (Twitter) engagement strategy.

Your job:
1. Understand what the user does, what they're building, and who they want as followers on X.
2. If their first message is vague, ask 1-2 short follow-up questions. If it's clear enough, proceed directly.
3. When you have enough context, generate a niche profile as JSON.

When ready, respond with EXACTLY this format (no other text):
NICHE_PROFILE_JSON:
{
  "target_icp": "One sentence describing their ideal follower",
  "niche_keywords": ["keyword1", "keyword2", "keyword3"],
  "trending_queries": ["search query 1", "search query 2", "search query 3"],
  "suggested_accounts": ["handle1", "handle2", "handle3"]
}

Rules for generating the profile:
- niche_keywords: 3-5 specific topic keywords for their niche (not generic like "tech")
- trending_queries: 3-5 SocialData search queries that would find viral tweets in their niche. Use terms their target audience would use. Include "min_faves:50" in each query for quality filtering.
- suggested_accounts: 3-5 X accounts whose audience matches their ICP. Pick accounts with 10K-500K followers (sweet spot for engagement).
- Keep it specific to their stated goals, not generic.

If asking a follow-up, just ask naturally. Don't mention JSON or profiles to the user.`;

export interface NicheChatResult {
  type: "message" | "profile_complete" | "error";
  text: string;
  profile?: {
    target_icp: string;
    niche_keywords: string[];
    trending_queries: string[];
    suggested_accounts: string[];
  };
}

export async function handleNicheChatMessage(
  chatId: number,
  userText: string
): Promise<NicheChatResult> {
  const session = sessions.get(chatId);
  if (!session) return { type: "error", text: "No active session." };

  // If we're waiting for account confirmation
  if (session.stage === "awaiting_account_confirm") {
    const yes = /^(y|yes|sure|ok|yep|yeah|yea)/i.test(userText.trim());
    endNicheChat(chatId);
    if (yes) {
      return { type: "profile_complete", text: "accounts_accepted" };
    }
    return { type: "profile_complete", text: "accounts_declined" };
  }

  session.messages.push({ role: "user", content: userText });

  const client = getAnthropic();
  if (!client) return { type: "error", text: "AI not configured." };

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: session.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const assistantText =
      response.content[0].type === "text" ? response.content[0].text : "";
    session.messages.push({ role: "assistant", content: assistantText });

    // Check if LLM returned a profile
    const jsonMatch = assistantText.match(/NICHE_PROFILE_JSON:\s*(\{[\s\S]*\})/);
    if (jsonMatch) {
      try {
        const profile = JSON.parse(jsonMatch[1]);

        // Save to database
        await upsertNicheProfile(session.userId, {
          goal_text: session.messages
            .filter((m) => m.role === "user")
            .map((m) => m.content)
            .join(" | "),
          target_icp: profile.target_icp,
          niche_keywords: profile.niche_keywords,
          trending_queries: profile.trending_queries,
          suggested_accounts: profile.suggested_accounts,
        });

        // Move to account confirmation stage
        session.stage = "awaiting_account_confirm";

        const accountList = profile.suggested_accounts
          .map((h: string) => `@${h.replace(/^@/, "")}`)
          .join(", ");

        return {
          type: "message",
          text: `Got it. Based on your goals, I'd suggest watching these accounts: ${accountList}. Want me to add them?`,
          profile,
        };
      } catch {
        return { type: "error", text: "Failed to parse profile." };
      }
    }

    // LLM is asking a follow-up
    session.stage = "awaiting_followup";
    return { type: "message", text: assistantText };
  } catch (err: any) {
    console.error("[niche-chat] LLM error:", err.message);
    return { type: "error", text: "Something went wrong. Try again or type /goals later." };
  }
}
