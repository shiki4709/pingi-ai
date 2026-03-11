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
  setSignOff,
  getSignOffForChat,
  linkByEmail,
  canGenerateDraft,
  getUserIdForChat,
  hasPro,
  isTrialExpired,
} from "./store.js";
import { rewriteDraft } from "./services/drafter.js";
import { sendGmailReply } from "./connectors/gmail-send.js";
import {
  getTopicsForUser,
  addTopicForUser,
  removeTopicForUser,
} from "./connectors/twitter-engage.js";
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
const awaitingEmail = new Set<number>();

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
  console.log(`[handlers] handleMessage: chatId=${chatId} text="${text}"`);

  if (text.startsWith("/start")) {
    endEditSession(chatId);

    // Check if already linked
    const existing = await getUserIdForChat(chatId);
    if (existing) {
      await sendMessage({
        chat_id: chatId,
        text:
          `*Pingi*\n\n` +
          `You're already connected\\. I'll send you notifications here when someone needs a reply\\.`,
        parse_mode: "MarkdownV2",
      });
      return;
    }

    awaitingEmail.add(chatId);
    await sendMessage({
      chat_id: chatId,
      text:
        `*Pingi*\n\n` +
        `Welcome\\. Pingi monitors your Gmail, X, and LinkedIn and sends you messages here when someone needs a reply\\.\n\n` +
        `What email did you sign up with on Pingi?`,
      parse_mode: "MarkdownV2",
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

  // /signoff — set custom email sign-off
  if (text.startsWith("/signoff")) {
    const rawSignOff = text.replace(/^\/signoff\s*/, "").trim();

    if (!rawSignOff) {
      // Show current sign-off
      const current = await getSignOffForChat(chatId);
      const display = current
        ? escapeExisting(current)
        : "Default \\(Best, \\+ your first name\\)";
      await sendMessage({
        chat_id: chatId,
        text:
          `*Current sign\\-off:*\n${display}\n\n` +
          `To change it, send:\n` +
          `/signoff Cheers, Name\n` +
          `/signoff Best regards,\\\\nName\n` +
          `/signoff Thanks,\\\\nName`,
        parse_mode: "MarkdownV2",
      });
      return;
    }

    // Support \n as literal newline in the sign-off
    const signOff = rawSignOff.replace(/\\n/g, "\n");
    const ok = await setSignOff(chatId, signOff);
    if (ok) {
      await sendMessage({
        chat_id: chatId,
        text: `Sign\\-off updated to:\n\n${escapeExisting(signOff)}`,
        parse_mode: "MarkdownV2",
      });
    } else {
      await sendMessage({
        chat_id: chatId,
        text: `Failed to update sign\\-off\\. Make sure you've sent /start first\\.`,
        parse_mode: "MarkdownV2",
      });
    }
    return;
  }

  // Email input — connect web account to this Telegram chat
  if (awaitingEmail.has(chatId) && !text.startsWith("/")) {
    if (!text.includes("@") || !text.includes(".")) {
      await sendMessage({
        chat_id: chatId,
        text: "That doesn't look like an email\\. Try again\\.",
        parse_mode: "MarkdownV2",
      });
      return;
    }

    try {
      const result = await linkByEmail(text, chatId);
      console.log(`[handlers] linkByEmail result:`, JSON.stringify(result));
      if ("error" in result) {
        // Keep awaiting — user can try another email
        await sendMessage({
          chat_id: chatId,
          text: escapeExisting(result.error),
          parse_mode: "MarkdownV2",
        });
      } else {
        awaitingEmail.delete(chatId);
        await sendMessage({
          chat_id: chatId,
          text: `Connected\\! You'll start receiving notifications here\\.`,
          parse_mode: "MarkdownV2",
        });
      }
    } catch (e: any) {
      console.error(`[handlers] linkByEmail EXCEPTION:`, e);
      await sendMessage({
        chat_id: chatId,
        text: escapeExisting(`Error: ${e.message}`),
        parse_mode: "MarkdownV2",
      });
    }
    return;
  }

  // /topics — manage engagement topics for proactive X outreach
  if (text.startsWith("/topics")) {
    const arg = text.replace(/^\/topics(@\w+)?\s*/, "").trim();
    const userId = await getUserIdForChat(chatId);

    if (!userId) {
      await sendMessage({
        chat_id: chatId,
        text: `Send /start first to set up your account\\.`,
        parse_mode: "MarkdownV2",
      });
      return;
    }

    // /topics add <topic>
    if (arg.startsWith("add ")) {
      const topic = arg.slice(4).trim();
      if (!topic) {
        await sendMessage({
          chat_id: chatId,
          text: `Usage: \`/topics add AI agents\``,
          parse_mode: "MarkdownV2",
        });
        return;
      }
      console.log(`[handlers] /topics add: userId=${userId} topic="${topic}"`);
      const ok = await addTopicForUser(userId, topic);
      await sendMessage({
        chat_id: chatId,
        text: ok
          ? `Added topic: *${escapeExisting(topic)}*\n\nPingi will search X for relevant tweets every 30 minutes and send you draft comments\\.`
          : `Failed to add topic\\. Try again\\.`,
        parse_mode: "MarkdownV2",
      });
      return;
    }

    // /topics remove <topic>
    if (arg.startsWith("remove ")) {
      const topic = arg.slice(7).trim();
      if (!topic) {
        await sendMessage({
          chat_id: chatId,
          text: `Usage: \`/topics remove AI agents\``,
          parse_mode: "MarkdownV2",
        });
        return;
      }
      console.log(`[handlers] /topics remove: userId=${userId} topic="${topic}"`);
      const ok = await removeTopicForUser(userId, topic);
      await sendMessage({
        chat_id: chatId,
        text: ok
          ? `Removed topic: *${escapeExisting(topic)}*`
          : `Failed to remove topic\\. Check the name and try again\\.`,
        parse_mode: "MarkdownV2",
      });
      return;
    }

    // /topics (list)
    console.log(`[handlers] /topics list: userId=${userId}`);
    const topics = await getTopicsForUser(userId);
    if (topics.length === 0) {
      await sendMessage({
        chat_id: chatId,
        text:
          `*Engagement topics*\n\n` +
          `No topics set\\. Add one to start getting proactive engagement suggestions:\n\n` +
          `\`/topics add AI agents\`\n` +
          `\`/topics add founder marketing\`\n` +
          `\`/topics add SaaS growth\``,
        parse_mode: "MarkdownV2",
      });
    } else {
      const list = topics
        .map((t, i) => `${i + 1}\\. ${escapeExisting(t.topic)}`)
        .join("\n");
      await sendMessage({
        chat_id: chatId,
        text:
          `*Engagement topics*\n\n${list}\n\n` +
          `Pingi searches X for these topics every 30 minutes\\.\n\n` +
          `\`/topics add <topic>\` to add\n` +
          `\`/topics remove <topic>\` to remove`,
        parse_mode: "MarkdownV2",
      });
    }
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
  const body = item.originalBody ?? item.originalText;
  const originalMessage = `${item.contextText ?? ""}\n\n${body}`;
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

      // Paywall: block sending if trial expired and not pro
      const sendUserId = await getUserIdForChat(chatId);
      if (sendUserId) {
        const pro = await hasPro(sendUserId);
        const expired = await isTrialExpired(sendUserId);
        if (!pro && expired) {
          await answerCallbackQuery(query.id, "Trial expired");
          await sendMessage({
            chat_id: chatId,
            text: "Your free trial has ended\\. Upgrade to Pro to send drafts:\nhttps://pingi\\-ai\\.vercel\\.app/pricing",
            parse_mode: "MarkdownV2",
          });
          break;
        }
      }

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

  let text = formatItemCard(item);

  // If no draft, check if this is because of the free plan limit
  if (!item.draftText) {
    const userId = await getUserIdForChat(chatId);
    if (userId) {
      const draftCheck = await canGenerateDraft(userId);
      if (!draftCheck.allowed) {
        text +=
          `\n\n_Free plan limit reached \\(${draftCheck.usage}/${draftCheck.limit} drafts this month\\)\\._` +
          `\n_Upgrade to Pro for unlimited drafts\\._`;
      }
    }
  }

  const buttons = item.draftText
    ? itemActions(itemId)
    : inlineButtons([
        [
          { text: "Skip", data: `skip:${itemId}` },
          { text: "Upgrade to Pro", url: "https://pingi.ai/pricing" },
        ],
      ]);

  await sendMessage({
    chat_id: chatId,
    text,
    parse_mode: "MarkdownV2",
    reply_markup: buttons,
  });
  console.log(`[push] Sent successfully: chatId=${chatId} itemId=${itemId}`);
}

function escapeExisting(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}
