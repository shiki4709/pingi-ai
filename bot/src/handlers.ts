import type { TelegramMessage, TelegramCallbackQuery } from "./types.js";
import {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  inlineButtons,
} from "./telegram.js";
import {
  getItemById,
  markSent,
  markSkipped,
  updateDraft,
  ensureUser,
} from "./store.js";
import {
  formatItemCard,
  formatSentConfirmation,
  formatSkippedConfirmation,
  formatEditPrompt,
  formatUpdatedDraft,
  formatEditTimeout,
} from "./formatter.js";

// ─── Edit sessions ───

const EDIT_TIMEOUT_MS = 5 * 60_000;

interface EditSession {
  itemId: string;
  timeout: ReturnType<typeof setTimeout>;
}

const editSessions = new Map<number, EditSession>();

// Callback for index.ts to resume drip when edit ends
let editEndCallback: ((chatId: number) => void) | null = null;

export function onEditEnd(fn: (chatId: number) => void): void {
  editEndCallback = fn;
}

export function isEditing(chatId: number): boolean {
  return editSessions.has(chatId);
}

function startEditSession(chatId: number, itemId: string): void {
  // Cancel existing session if any (without resuming drip — we're starting a new one)
  const existing = editSessions.get(chatId);
  if (existing) clearTimeout(existing.timeout);

  const timeout = setTimeout(() => expireEditSession(chatId), EDIT_TIMEOUT_MS);
  editSessions.set(chatId, { itemId, timeout });
}

function endEditSession(chatId: number): void {
  const session = editSessions.get(chatId);
  if (!session) return;
  clearTimeout(session.timeout);
  editSessions.delete(chatId);
  editEndCallback?.(chatId);
}

async function expireEditSession(chatId: number): Promise<void> {
  const session = editSessions.get(chatId);
  if (!session) return;

  const { itemId } = session;
  editSessions.delete(chatId);

  const item = await getItemById(itemId);
  if (item && item.status === "pending") {
    await sendMessage({
      chat_id: chatId,
      text: formatEditTimeout(item),
      parse_mode: "MarkdownV2",
      reply_markup: itemActions(itemId),
    });
  }

  editEndCallback?.(chatId);
}

// ─── Buttons attached to every item card ───

function itemActions(itemId: string) {
  return inlineButtons([
    [
      { text: "Send", data: `send:${itemId}` },
      { text: "Edit", data: `edit:${itemId}` },
      { text: "Skip", data: `skip:${itemId}` },
    ],
  ]);
}

// ─── Message handler ───

export async function handleMessage(msg: TelegramMessage): Promise<void> {
  const chatId = msg.chat.id;
  const text = msg.text ?? "";

  if (text.startsWith("/start")) {
    endEditSession(chatId);

    // Ensure user exists in Supabase
    try {
      await ensureUser(chatId, msg.from?.first_name);
    } catch (e: any) {
      console.error(`[handlers] ensureUser failed for chat ${chatId}:`, e.message);
    }

    await sendMessage({
      chat_id: chatId,
      text:
        `*Pingi*\n\n` +
        `Welcome\\. Pingi monitors your Gmail, X, and LinkedIn and sends you messages here when someone needs a reply\\.\n\n` +
        `Each notification comes with a draft in your voice and three buttons: *Send*, *Edit*, or *Skip*\\.`,
      parse_mode: "MarkdownV2",
      reply_markup: inlineButtons([
        [{ text: "Set up your account", url: "https://pingi.ai/onboarding" }],
      ]),
    });
    return;
  }

  // Dev-only: reset drip queue and re-push pending items
  if (text.startsWith("/reset")) {
    endEditSession(chatId);
    await sendMessage({
      chat_id: chatId,
      text: `State reset\\. Pending items will re\\-arrive\\.`,
      parse_mode: "MarkdownV2",
    });
    return;
  }

  // If the user is in edit mode, treat any text as an edit instruction
  const session = editSessions.get(chatId);
  if (session) {
    await handleEditInstruction(chatId, session.itemId, text);
    return;
  }

  // Otherwise ignore (push-only bot, no other commands)
}

async function handleEditInstruction(
  chatId: number,
  itemId: string,
  instruction: string
): Promise<void> {
  const item = await getItemById(itemId);
  if (!item || item.status !== "pending") {
    endEditSession(chatId);
    return;
  }

  // Apply edit (mock: simple string transforms, same logic as dashboard reference)
  const oldDraft = item.draftText ?? "";
  let newDraft = oldDraft;
  const lower = instruction.toLowerCase();

  if (lower.includes("casual") || lower.includes("chill")) {
    newDraft = oldDraft.replace(/Thank you/g, "Thanks").replace(/\.$/, "");
  } else if (lower.includes("shorter") || lower.includes("brief")) {
    const sentences = oldDraft.split(/[.!?]+/).filter((s) => s.trim());
    newDraft =
      sentences.slice(0, Math.ceil(sentences.length / 2)).join(". ").trim() +
      ".";
  } else if (lower.includes("formal")) {
    newDraft = oldDraft.replace(/Hey /g, "Hi ").replace(/Thanks/g, "Thank you");
  } else if (
    lower.includes("mention") ||
    lower.includes("add") ||
    lower.includes("include")
  ) {
    const detail = instruction
      .replace(/^(mention|add|include|say)\s+(that\s+)?/i, "")
      .trim();
    newDraft =
      oldDraft.replace(/[.!?]\s*$/, "") +
      `. ${detail.charAt(0).toUpperCase() + detail.slice(1)}.`;
  } else if (lower.includes("question") || lower.includes("ask")) {
    newDraft = oldDraft.replace(/[.]\s*$/, "") + ". What's your take?";
  } else {
    newDraft =
      oldDraft.replace(/[.!?]\s*$/, "") +
      ". " +
      instruction.charAt(0).toUpperCase() +
      instruction.slice(1) +
      ".";
  }

  await updateDraft(itemId, newDraft);
  // Re-fetch to get updated draft
  const updated = await getItemById(itemId);

  // End session — free-text input window is over.
  // User sees updated draft with Send/Edit/Skip and can tap Edit to start a new round.
  endEditSession(chatId);

  if (updated) {
    await sendMessage({
      chat_id: chatId,
      text: formatUpdatedDraft(updated),
      parse_mode: "MarkdownV2",
      reply_markup: itemActions(itemId),
    });
  }
}

// ─── Callback query handler (inline button taps) ───

export async function handleCallbackQuery(
  query: TelegramCallbackQuery
): Promise<void> {
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  if (!chatId || !messageId || !query.data) {
    await answerCallbackQuery(query.id);
    return;
  }

  const [action, itemId] = query.data.split(":");
  if (!itemId) {
    await answerCallbackQuery(query.id);
    return;
  }

  const item = await getItemById(itemId);
  if (!item || item.status !== "pending") {
    await answerCallbackQuery(query.id, "Already handled");
    await editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: query.message?.text
        ? escapeExisting(query.message.text) + "\n\n_Already handled\\._"
        : "_Already handled\\._",
      parse_mode: "MarkdownV2",
    }).catch(() => {});
    return;
  }

  switch (action) {
    case "send": {
      await markSent(itemId, item.draftText);
      endEditSession(chatId);
      await editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: formatSentConfirmation(item),
        parse_mode: "MarkdownV2",
      });
      await answerCallbackQuery(query.id, "Sent");
      break;
    }

    case "edit": {
      startEditSession(chatId, itemId);
      await answerCallbackQuery(query.id);
      await sendMessage({
        chat_id: chatId,
        text: formatEditPrompt(item),
        parse_mode: "MarkdownV2",
      });
      break;
    }

    case "skip": {
      await markSkipped(itemId);
      endEditSession(chatId);
      await editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: formatSkippedConfirmation(item),
        parse_mode: "MarkdownV2",
      });
      await answerCallbackQuery(query.id, "Skipped");
      break;
    }

    default:
      await answerCallbackQuery(query.id);
  }
}

// ─── Push an item card to a chat (called by index.ts) ───

export async function pushItemCard(
  chatId: number,
  itemId: string
): Promise<void> {
  const item = await getItemById(itemId);
  if (!item || item.status !== "pending") return;

  await sendMessage({
    chat_id: chatId,
    text: formatItemCard(item),
    parse_mode: "MarkdownV2",
    reply_markup: itemActions(itemId),
  });
}

function escapeExisting(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}
