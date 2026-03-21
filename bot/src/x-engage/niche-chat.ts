/**
 * Goal-based niche onboarding chat.
 * After email linking, asks the user about their goals and generates
 * a niche profile using Claude.
 */

import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import { upsertNicheProfile } from "./store.js";
import { getSupabase } from "./supabase.js";

const MODEL = "claude-sonnet-4-20250514";

// ─── Chat session state ───

interface NicheChatSession {
  chatId: number;
  userId: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  stage: "awaiting_goals" | "awaiting_followup" | "awaiting_account_confirm" | "awaiting_voice_examples";
  profile?: {
    target_icp: string;
    niche_keywords: string[];
    trending_queries: string[];
    suggested_accounts: string[];
  };
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

  // If we're waiting for voice examples
  if (session.stage === "awaiting_voice_examples") {
    // User pastes example tweets/replies (one or more, separated by newlines)
    const examples = userText.split("\n").map((e) => e.trim()).filter((e) => e.length > 10);

    if (examples.length === 0) {
      return { type: "message", text: "I need at least one example tweet or reply. Paste a few things you've written on X (one per line)." };
    }

    // Generate voice description from examples using Claude
    const voiceDesc = await generateVoiceDescription(examples);

    // Save to voice_profiles table
    await getSupabase()
      .from("voice_profiles")
      .upsert({
        user_id: session.userId,
        context: "twitter_reply",
        description: voiceDesc,
        examples,
      }, { onConflict: "user_id,context" });

    endNicheChat(chatId);
    return {
      type: "profile_complete",
      text: "voice_saved",
      profile: session.profile,
    };
  }

  // If we're waiting for account confirmation
  if (session.stage === "awaiting_account_confirm") {
    const yes = /^(y|yes|sure|ok|yep|yeah|yea)/i.test(userText.trim());
    // Transition to voice collection instead of ending
    session.stage = "awaiting_voice_examples";
    if (yes) {
      return {
        type: "message",
        text: "Great, added them. One more thing -- paste 3-5 example tweets or replies you've written before (one per line). This helps me match your voice when drafting.",
        profile: session.profile,
      };
    }
    return {
      type: "message",
      text: "No problem. One more thing -- paste 3-5 example tweets or replies you've written before (one per line). This helps me match your voice when drafting.",
      profile: session.profile,
    };
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

        // Store profile on session and move to account confirmation
        session.profile = profile;
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

// ─── Voice profile generation ───

async function generateVoiceDescription(examples: string[]): Promise<string> {
  const client = getAnthropic();
  if (!client) return "Conversational, direct, uses contractions.";

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: `Analyze these example tweets/replies and describe the writing voice in 2-3 sentences. Focus on: formality level, humor style, sentence length, use of contractions, directness, and any distinctive patterns. Return ONLY the voice description, nothing else.`,
      messages: [
        { role: "user", content: examples.map((e, i) => `${i + 1}. "${e}"`).join("\n") },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return text.trim() || "Conversational, direct, uses contractions.";
  } catch (err: any) {
    console.error("[niche-chat] Voice generation failed:", err.message);
    return "Conversational, direct, uses contractions.";
  }
}
