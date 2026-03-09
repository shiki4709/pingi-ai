/**
 * X Engagement Bot — separate process from the main inbox bot.
 * Runs on its own port with its own Telegram bot token (@pingi_x_bot).
 */

import Fastify from "fastify";
import { config } from "./config.js";
import {
  deleteWebhook,
  getUpdates,
  type TelegramUpdate,
} from "./telegram.js";
import { handleMessage, handleCallbackQuery } from "./handlers.js";
import { startScanner, stopScanner } from "./scanner.js";

const app = Fastify({ logger: false });

// ─── Process updates ───

async function processUpdate(update: TelegramUpdate): Promise<void> {
  console.log(`[x-bot] Update ${update.update_id}: ${
    update.message ? `message from ${update.message.from?.id}: "${update.message.text?.slice(0, 50)}"` :
    update.callback_query ? `callback_query id=${update.callback_query.id} data="${update.callback_query.data}" from=${update.callback_query.from.id}` :
    `unknown type (keys: ${Object.keys(update).join(", ")})`
  }`);

  try {
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }
  } catch (e: any) {
    console.error(`[x-bot] Error processing update ${update.update_id}:`, e.message, e.stack);
  }
}

// ─── Webhook mode ───

if (!config.usePolling) {
  app.post("/webhook", async (req) => {
    const update = req.body as TelegramUpdate;
    // Fire and forget
    processUpdate(update);
    return { ok: true };
  });
}

// ─── Health check ───

app.get("/health", async () => ({ status: "ok", bot: "x-engage" }));

// ─── Polling loop ───

async function pollLoop(): Promise<void> {
  console.log("[x-bot] Starting long polling...");
  await deleteWebhook();

  let offset = 0;
  while (true) {
    try {
      const { updates, nextOffset } = await getUpdates(offset);
      offset = nextOffset;

      for (const update of updates) {
        await processUpdate(update);
      }
    } catch (e: any) {
      console.error("[x-bot] Polling error:", e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

// ─── Boot ───

async function main(): Promise<void> {
  if (!config.botToken) {
    console.error("[x-bot] TELEGRAM_X_BOT_TOKEN is required");
    process.exit(1);
  }

  await app.listen({ port: config.port, host: config.host });
  console.log(`[x-bot] Server listening on ${config.host}:${config.port}`);
  console.log(`[x-bot] Mode: ${config.usePolling ? "polling" : "webhook"}`);

  // Start the tweet scanner
  startScanner();

  // Start polling if no webhook
  if (config.usePolling) {
    pollLoop();
  }
}

// ─── Graceful shutdown ───

function shutdown(signal: string): void {
  console.log(`[x-bot] ${signal} received, shutting down...`);
  stopScanner();
  app.close().then(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

main().catch((e) => {
  console.error("[x-bot] Fatal:", e);
  process.exit(1);
});
