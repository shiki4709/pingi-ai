import Fastify from "fastify";
import { config } from "./config.js";
import {
  handleMessage,
  handleCallbackQuery,
  pushItemCard,
  isEditing,
  onEditEnd,
} from "./handlers.js";
import { getPendingItemsForUser, getUserIdForChat } from "./store.js";
import { deleteWebhook, getUpdates } from "./telegram.js";
import { createPollWorker } from "./workers/poll.js";
import type { TelegramUpdate } from "./types.js";

const app = Fastify({ logger: true });

// ─── Known chat IDs (local cache, seeded from Telegram updates) ───
const knownChats: Set<number> = new Set();

function trackChatId(update: TelegramUpdate): void {
  const chatId =
    update.message?.chat.id ?? update.callback_query?.message?.chat.id;
  if (chatId) knownChats.add(chatId);
}

// ─── Process a single Telegram update ───
async function processUpdate(update: TelegramUpdate): Promise<void> {
  trackChatId(update);

  if (update.message) {
    await handleMessage(update.message);

    // /start or /reset re-queues pending items for this chat
    const text = update.message.text ?? "";
    if (text.startsWith("/start") || text.startsWith("/reset")) {
      await startDrip(update.message.chat.id);
    }
  } else if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
  }
}

// ─── Drip queue: pushes one item at a time per chat ───

const DRIP_INTERVAL_MS = 30_000;
const RESUME_DELAY_MS = 3_000;

interface DripState {
  queue: string[];
  timer: ReturnType<typeof setTimeout> | null;
}

const drips = new Map<number, DripState>();

// When an edit session ends, resume dripping after a short pause
onEditEnd((chatId) => {
  const state = drips.get(chatId);
  if (state && state.queue.length > 0) {
    // Clear any stale timer before scheduling resume
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => drainNext(chatId), RESUME_DELAY_MS);
  }
});

async function startDrip(chatId: number): Promise<void> {
  const existing = drips.get(chatId);
  if (existing?.timer) clearTimeout(existing.timer);

  // Fetch pending items from Supabase for this user
  const userId = await getUserIdForChat(chatId);
  if (!userId) {
    console.log(`[drip] No user found for chat ${chatId}, skipping`);
    return;
  }

  const pending = await getPendingItemsForUser(userId);
  const queue = pending.map((i) => i.id);

  if (queue.length === 0) {
    console.log(`[drip] No pending items for user ${userId}`);
    return;
  }

  console.log(`[drip] Queuing ${queue.length} items for chat ${chatId}`);
  const state: DripState = { queue, timer: null };
  drips.set(chatId, state);

  drainNext(chatId);
}

function drainNext(chatId: number): void {
  // Pause while user is editing — the onEditEnd callback will resume
  if (isEditing(chatId)) {
    const state = drips.get(chatId);
    if (state) state.timer = null;
    return;
  }

  const state = drips.get(chatId);
  if (!state || state.queue.length === 0) {
    if (state?.timer) clearTimeout(state.timer);
    drips.delete(chatId);
    return;
  }

  const itemId = state.queue.shift()!;

  pushItemCard(chatId, itemId).catch((err) =>
    app.log.error(err, `Failed to push item ${itemId} to ${chatId}`)
  );

  if (state.queue.length > 0) {
    state.timer = setTimeout(() => drainNext(chatId), DRIP_INTERVAL_MS);
  } else {
    state.timer = null;
    drips.delete(chatId);
  }
}

// ─── Enqueue a single item to a specific chat ───
// Called by the poll worker when new reply_items are detected.
function enqueueItemForChat(chatId: number, itemId: string): void {
  let state = drips.get(chatId);
  if (!state) {
    state = { queue: [], timer: null };
    drips.set(chatId, state);
  }
  state.queue.push(itemId);
  // If nothing is currently dripping or waiting, kick off a drain
  if (!state.timer && state.queue.length === 1) {
    drainNext(chatId);
  }
}

// ─── Gmail poll worker ───
const gmailWorker = createPollWorker({
  onNewItem: enqueueItemForChat,
});

// ─── Health check ───
app.get("/health", async () => ({
  status: "ok",
  bot: "pingi",
  mode: config.usePolling ? "polling" : "webhook",
}));

// ─── Webhook endpoint (production) ───
app.post<{ Body: TelegramUpdate }>("/webhook", async (request, reply) => {
  if (config.webhookSecret) {
    const secret = request.headers["x-telegram-bot-api-secret-token"];
    if (secret !== config.webhookSecret) {
      return reply.code(401).send({ error: "unauthorized" });
    }
  }

  try {
    await processUpdate(request.body);
  } catch (err) {
    app.log.error(err, "Error handling update");
  }

  return { ok: true };
});

// ─── Long polling (local dev) ───
let polling = false;

async function pollLoop(): Promise<void> {
  polling = true;
  let offset = 0;

  await deleteWebhook();
  app.log.info("Polling started");

  while (polling) {
    try {
      const { updates, nextOffset } = await getUpdates(offset);
      offset = nextOffset;

      for (const update of updates) {
        try {
          await processUpdate(update);
        } catch (err) {
          app.log.error(err, "Error handling polled update");
        }
      }
    } catch (err) {
      app.log.error(err, "Polling error, retrying in 3s");
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

function stopPolling(): void {
  polling = false;
}

// ─── Cleanup all drip timers ───
function stopDrips(): void {
  for (const [, state] of drips) {
    if (state.timer) clearTimeout(state.timer);
  }
  drips.clear();
}

// ─── Start ───
async function start(): Promise<void> {
  if (!config.botToken) {
    console.error(
      "TELEGRAM_BOT_TOKEN is required. Copy .env.example to .env and fill it in."
    );
    process.exit(1);
  }

  await app.listen({ port: config.port, host: config.host });

  const mode = config.usePolling ? "polling" : "webhook";
  console.log(`Pingi bot running on ${config.host}:${config.port} [${mode}]`);

  // Start the Gmail poll worker (checks every 3 minutes)
  gmailWorker.start();

  if (config.usePolling) {
    pollLoop();
  } else {
    console.log(`Webhook endpoint: POST /webhook`);
  }
}

// Graceful shutdown
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    stopPolling();
    stopDrips();
    gmailWorker.stop();
    app.close();
  });
}

start();
