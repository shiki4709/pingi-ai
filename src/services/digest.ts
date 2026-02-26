import { EngagementItem, DigestResult } from "../types";
import { urgencyEmoji, urgencyLabel } from "../urgency";

const PLATFORM_ICON: Record<string, string> = {
  gmail: "📧",
  twitter: "🐦",
  linkedin: "💼",
};

function formatItem(item: EngagementItem, index: number): string {
  const icon = PLATFORM_ICON[item.platform] || "📩";
  const emoji = urgencyEmoji(item.urgency);
  const age = getAge(item.detectedAt);
  const label = urgencyLabel(item.urgency);

  let block = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${icon} #${index + 1}  ${item.platform.toUpperCase()}  ${emoji} ${label} (${age})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

From: ${item.authorName}${item.authorHandle ? ` (${item.authorHandle})` : ""}
${item.contextText ? `Re: ${item.contextText.slice(0, 100)}${item.contextText.length > 100 ? "..." : ""}` : ""}

"${item.originalText}"
${item.itemUrl ? `\n🔗 ${item.itemUrl}` : ""}`;

  if (item.draftText) {
    block += `

✨ PINGI DRAFT:
${item.draftText}`;
  }

  return block;
}

function getAge(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDigest(result: DigestResult): string {
  const { items, platforms, generatedAt } = result;

  if (items.length === 0) {
    return `
🔔 PINGI DIGEST — ${generatedAt.toLocaleString()}

✅ All clear! No pending items need your reply.

Gmail: ${platforms.gmail.fetched} checked | Twitter: ${platforms.twitter.fetched} checked | LinkedIn: ${platforms.linkedin.fetched} checked
`;
  }

  // Sort by urgency: red first, then amber, then green
  const urgencyOrder = { red: 0, amber: 1, green: 2 };
  const sorted = [...items].sort(
    (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
  );

  const red = sorted.filter((i) => i.urgency === "red").length;
  const amber = sorted.filter((i) => i.urgency === "amber").length;
  const green = sorted.filter((i) => i.urgency === "green").length;

  let output = `
🔔 PINGI DIGEST — ${generatedAt.toLocaleString()}
═══════════════════════════════════════════

📊 ${items.length} items need your reply:
   🔥 ${red} urgent  ⚡ ${amber} getting stale  💬 ${green} fresh

📧 Gmail: ${platforms.gmail.needsReply}/${platforms.gmail.fetched}
🐦 Twitter: ${platforms.twitter.needsReply}/${platforms.twitter.fetched}
💼 LinkedIn: ${platforms.linkedin.needsReply}/${platforms.linkedin.fetched}
`;

  for (let i = 0; i < sorted.length; i++) {
    output += formatItem(sorted[i], i);
  }

  output += `

═══════════════════════════════════════════
🔔 End of Pingi Digest — ${items.length} items awaiting reply
`;

  return output;
}
