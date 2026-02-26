import Anthropic from "@anthropic-ai/sdk";
import { EngagementItem } from "../types";

const client = new Anthropic();

const PLATFORM_RULES: Record<string, string> = {
  twitter: "Keep under 280 characters. Be concise, witty, and engaging.",
  linkedin: "Professional but warm. 1-3 sentences. Can end with a question to continue engagement.",
  gmail: "Appropriate email reply length. Match the formality of the original email.",
};

export async function generateDraft(
  item: EngagementItem,
  toneDescription?: string,
  toneSamples?: string[]
): Promise<string> {
  const tone = toneDescription || process.env.TONE_DESCRIPTION || "Professional but friendly.";
  const samples = toneSamples || [];

  const samplesBlock =
    samples.length > 0
      ? `\n\nEXAMPLE REPLIES BY THIS USER (match this voice):\n${samples.map((s, i) => `${i + 1}. "${s}"`).join("\n")}`
      : "";

  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: `You are Pingi, an AI reply assistant. Generate a reply that sounds exactly like the user.

TONE: ${tone}${samplesBlock}

PLATFORM RULES: ${PLATFORM_RULES[item.platform] || "Be helpful and engaging."}

IMPORTANT:
- Match the user's voice — never sound robotic or generic
- Be helpful, warm, and engaging
- If the message is negative or trolling, be graceful
- Output ONLY the reply text, nothing else — no quotes, no labels, no explanation`,
    messages: [
      {
        role: "user",
        content: `Platform: ${item.platform}
From: ${item.authorName}${item.authorHandle ? ` (${item.authorHandle})` : ""}
${item.contextText ? `Context (my original post): "${item.contextText}"` : ""}
Their message: "${item.originalText}"

Draft a reply:`,
      },
    ],
  });

  const text =
    msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  return text;
}

export async function generateDraftsForItems(
  items: EngagementItem[]
): Promise<EngagementItem[]> {
  console.log(`\n🧠 Generating AI drafts for ${items.length} items...`);

  const results: EngagementItem[] = [];

  for (const item of items) {
    try {
      const draft = await generateDraft(item);
      results.push({ ...item, draftText: draft });
      console.log(`  ✅ Draft for ${item.authorName} (${item.platform})`);
    } catch (e: any) {
      console.error(`  ❌ Draft failed for ${item.authorName}: ${e.message}`);
      results.push(item); // keep item without draft
    }

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 300));
  }

  return results;
}
