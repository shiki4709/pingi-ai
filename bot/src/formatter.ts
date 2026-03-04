import type { TrackedItem, Urgency, Platform, ContextCategory } from "./types.js";

// Telegram MarkdownV2 requires escaping these characters
const SPECIAL = /([_*\[\]()~`>#+\-=|{}.!\\])/g;
function esc(text: string): string {
  return text.replace(SPECIAL, "\\$1");
}

const URGENCY_LABEL: Record<Urgency, string> = {
  red: "URGENT",
  amber: "Getting stale",
  green: "Fresh",
};

const PLATFORM_TAG: Record<Platform, string> = {
  gmail: "Gmail",
  twitter: "X",
  linkedin: "LinkedIn",
};

const CONTEXT_LABEL: Record<ContextCategory, string> = {
  BUSINESS_OPPORTUNITY: "Business",
  PROFESSIONAL_NETWORK: "Network",
  AUDIENCE_ENGAGEMENT: "Audience",
  KNOWLEDGE_EXCHANGE: "Question",
  OPERATIONAL: "Ops",
  PERSONAL: "Personal",
};

function formatAge(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

// ─── The one card format: pushed per-item with inline buttons ───

export function formatItemCard(item: TrackedItem): string {
  const urgencyTag =
    item.urgency === "red"
      ? `*${esc("!!!")} ${esc(URGENCY_LABEL.red)}*`
      : esc(URGENCY_LABEL[item.urgency]);

  const platformBase = PLATFORM_TAG[item.platform];
  const platform = item.accountLabel
    ? esc(`${platformBase} (${item.accountLabel})`)
    : esc(platformBase);
  const context = esc(CONTEXT_LABEL[item.context]);
  const author = esc(item.authorName);
  const handle = item.authorHandle ? ` ${esc(item.authorHandle)}` : "";
  const age = esc(formatAge(item.detectedAt));
  const ctxLine = item.contextText ? `Re: ${esc(item.contextText)}\n` : "";
  const original = esc(item.originalText);

  let msg =
    `${urgencyTag} \\| ${platform} \\| ${context}\n\n` +
    `*${author}*${handle}\n` +
    `${ctxLine}` +
    `${age}\n\n` +
    `_"${original}"_`;

  if (item.draftText) {
    msg +=
      `\n\n*Pingi draft:*\n` +
      `${esc(item.draftText)}`;
  }

  return msg;
}

export function formatSentConfirmation(item: TrackedItem): string {
  const author = esc(item.authorName);
  const platform = esc(PLATFORM_TAG[item.platform]);
  const draft = esc(item.finalDraft ?? item.draftText ?? "");

  return `Sent to *${author}* on ${platform}\\.\n\n_"${draft}"_`;
}

export function formatSkippedConfirmation(item: TrackedItem): string {
  const author = esc(item.authorName);
  return `Skipped *${author}*'s message\\.`;
}

export function formatEditPrompt(item: TrackedItem): string {
  const author = esc(item.authorName);
  const draft = esc(item.draftText ?? "");

  return (
    `How should I adjust the reply to *${author}*?\n\n` +
    `Current draft:\n${draft}\n\n` +
    `_Type your instruction, e\\.g\\. "make it shorter" or "mention we met at the conference"_`
  );
}

export function formatUpdatedDraft(item: TrackedItem): string {
  const author = esc(item.authorName);
  const draft = esc(item.draftText ?? "");

  return `Updated draft for *${author}*:\n\n${draft}`;
}

export function formatEditTimeout(item: TrackedItem): string {
  const author = esc(item.authorName);
  const draft = esc(item.draftText ?? "");

  return (
    `Edit timed out\\. Here's where you left off:\n\n` +
    `Reply to *${author}*:\n${draft}`
  );
}
