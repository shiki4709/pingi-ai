/**
 * Telegram Bot API client for the X engagement bot.
 * Uses TELEGRAM_X_BOT_TOKEN (separate from the inbox bot).
 */

import { apiUrl, config } from "./config.js";

// ─── Types ───

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  first_name?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

interface SendMessageOptions {
  chat_id: number;
  text: string;
  parse_mode?: "MarkdownV2" | "HTML";
  reply_markup?: InlineKeyboardMarkup;
  disable_web_page_preview?: boolean;
}

interface EditMessageTextOptions {
  chat_id: number;
  message_id: number;
  text: string;
  parse_mode?: "MarkdownV2" | "HTML";
  reply_markup?: InlineKeyboardMarkup;
  disable_web_page_preview?: boolean;
}

// ─── API call wrapper ───

async function call(
  method: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`[x-tg] API error [${method}]:`, data.description);
  }
  return data;
}

// ─── Public methods ───

export async function sendMessage(
  opts: SendMessageOptions
): Promise<number | undefined> {
  const data = (await call("sendMessage", {
    ...opts,
    disable_web_page_preview: opts.disable_web_page_preview ?? true,
  })) as { ok: boolean; result?: { message_id: number } };
  return data.result?.message_id;
}

export async function editMessageText(
  opts: EditMessageTextOptions
): Promise<void> {
  await call("editMessageText", {
    ...opts,
    disable_web_page_preview: opts.disable_web_page_preview ?? true,
  });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  await call("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function deleteWebhook(): Promise<void> {
  await call("deleteWebhook", { drop_pending_updates: true });
}

export async function getUpdates(
  offset: number,
  timeout: number = config.pollingTimeoutSec
): Promise<{ updates: TelegramUpdate[]; nextOffset: number }> {
  const data = (await call("getUpdates", {
    offset,
    timeout,
    allowed_updates: ["message", "callback_query"],
  })) as { ok: boolean; result?: TelegramUpdate[] };

  const updates = data.result ?? [];
  const nextOffset =
    updates.length > 0 ? updates[updates.length - 1].update_id + 1 : offset;
  return { updates, nextOffset };
}

export function inlineButtons(
  buttons: { text: string; data?: string; url?: string }[][]
): InlineKeyboardMarkup {
  return {
    inline_keyboard: buttons.map((row) =>
      row.map((b) => {
        if (b.url) return { text: b.text, url: b.url };
        return { text: b.text, callback_data: b.data };
      })
    ),
  };
}
