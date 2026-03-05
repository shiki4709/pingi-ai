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
import { rewriteDraft } from "./services/drafter.js";
import { sendGmailReply } from "./connectors/gmail-send.js";
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
      const userId = await ensureUser(chatId, msg.from?.first_name);
      console.log(`[handlers] /start: ensureUser OK — chatId=${chatId} → userId=${userId}`);
    } catch (e: any) {
      console.error(`[handlers] /start: ensureUser FAILED for chat ${chatId}:`, e.message);
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

  // Rewrite draft via Claude API using the user's instruction
  const originalMessage = `${item.contextText ?? ""}\n\n${item.originalText}`;
  const currentDraft = item.draftText ?? "";
  const newDraft = await rewriteDraft(originalMessage, currentDraft, instruction);

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
      endEditSession(chatId);
      const draft = item.draftText ?? "";

      // Send via Gmail if this is a Gmail item
      if (item.platform === "gmail") {
        await answerCallbackQuery(query.id, "Sending...");
        const sendResult = await sendGmailReply({ itemId, draftText: draft });
        if (!sendResult.ok) {
          console.error(`[handlers] Gmail send failed for ${itemId}: ${sendResult.error}`);
          await sendMessage({
            chat_id: chatId,
            text: `Failed to send: ${escapeExisting(sendResult.error ?? "unknown error")}`,
            parse_mode: "MarkdownV2",
          });
          break;
        }
      } else {
        await answerCallbackQuery(query.id, "Sent");
      }

      await markSent(itemId, draft);
      await editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: formatSentConfirmation(item),
        parse_mode: "MarkdownV2",
      });
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
  console.log(`[push] pushItemCard called: chatId=${chatId} itemId=${itemId}`);
  const item = await getItemById(itemId);
  if (!item) {
    console.log(`[push] SKIP: item ${itemId} not found in DB`);
    return;
  }
  if (item.status !== "pending") {
    console.log(`[push] SKIP: item ${itemId} status="${item.status}" (not pending)`);
    return;
  }

  console.log(`[push] Sending item card to chat ${chatId}: ${item.platform} from "${item.authorName}" — "${item.contextText ?? ""}"`);
  await sendMessage({
    chat_id: chatId,
    text: formatItemCard(item),
    parse_mode: "MarkdownV2",
    reply_markup: itemActions(itemId),
  });
  console.log(`[push] Sent successfully: chatId=${chatId} itemId=${itemId}`);
}

function escapeExisting(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}
