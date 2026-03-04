import { apiUrl, config } from "./config.js";
import type { TelegramUpdate } from "./types.js";

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

async function call(method: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`Telegram API error [${method}]:`, data.description);
  }
  return data;
}

export async function sendMessage(opts: SendMessageOptions): Promise<number | undefined> {
  const data = (await call("sendMessage", {
    ...opts,
    disable_web_page_preview: opts.disable_web_page_preview ?? true,
  })) as { ok: boolean; result?: { message_id: number } };
  return data.result?.message_id;
}

export async function editMessageText(opts: EditMessageTextOptions): Promise<void> {
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

export async function setWebhook(url: string, secret: string): Promise<void> {
  await call("setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
  });
  console.log(`Webhook set to ${url}`);
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
    updates.length > 0
      ? updates[updates.length - 1].update_id + 1
      : offset;

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
