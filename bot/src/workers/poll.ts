import { supabase } from "../supabase.js";
import { fetchGmailForUser } from "../connectors/gmail.js";
import { fetchTwitterForUser } from "../connectors/twitter.js";
import { getChatIdForUser } from "../store.js";

const DEFAULT_INTERVAL_MS = 3 * 60_000; // 3 minutes
const DEFAULT_LOOKBACK_HOURS = 24;

interface PollWorkerOptions {
  intervalMs?: number;
  lookbackHours?: number;
  /** Called for each newly inserted item with the user's chat ID. */
  onNewItem?: (chatId: number, itemId: string) => void;
}

/**
 * Poll worker: periodically checks all connected Gmail accounts
 * and fetches new unreplied emails for each.
 *
 * Usage:
 *   import { createPollWorker } from "./workers/poll.js";
 *   const worker = createPollWorker({
 *     onNewItem(chatId, itemId) { enqueueItemForChat(chatId, itemId); }
 *   });
 *   worker.start();
 */
export function createPollWorker(opts: PollWorkerOptions = {}) {
  const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS;
  const lookbackHours = opts.lookbackHours ?? DEFAULT_LOOKBACK_HOURS;
  const onNewItem = opts.onNewItem;
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;

  async function tick(): Promise<void> {
    if (running) return; // skip if previous tick is still running
    running = true;

    try {
      // Fetch all connected Gmail accounts
      const { data: accounts, error } = await supabase
        .from("connected_accounts")
        .select("user_id, access_token, refresh_token, platform_username")
        .eq("platform", "gmail");

      if (error) {
        console.error("[poll] Failed to fetch connected accounts:", error.message);
        return;
      }

      if (!accounts || accounts.length === 0) return;

      console.log(`[poll] Checking ${accounts.length} Gmail account(s)`);

      for (const account of accounts) {
        const label = `${account.user_id}/${account.platform_username}`;
        try {
          const result = await fetchGmailForUser(account, lookbackHours);

          if (result.inserted > 0 || result.filtered > 0 || result.errors.length > 0) {
            console.log(
              `[poll] ${label}: ` +
              `${result.inserted} new, ${result.filtered} filtered` +
              (result.errors.length > 0
                ? `, ${result.errors.length} error(s)`
                : "")
            );
          }

          if (result.errors.length > 0) {
            for (const err of result.errors) {
              console.error(`[poll] ${label}: ${err}`);
            }
          }

          // Push newly inserted items to the user's Telegram chat
          if (onNewItem && result.insertedIds.length > 0) {
            const chatId = await getChatIdForUser(account.user_id);
            console.log(`[poll] getChatIdForUser(${account.user_id}) → ${chatId ?? "NULL (no telegram_chat_id for this user!)"}`);
            if (chatId) {
              for (const itemId of result.insertedIds) {
                console.log(`[poll] Enqueuing item ${itemId} for chat ${chatId}`);
                onNewItem(chatId, itemId);
              }
            } else {
              console.warn(`[poll] WARNING: ${result.insertedIds.length} items inserted for user ${account.user_id} but no telegram_chat_id found — items will NOT be pushed`);
            }
          }
        } catch (e: any) {
          console.error(`[poll] ${label} error:`, e.message);
        }
      }

      // ─── Twitter polling ───
      // Twitter uses a single Bearer token (app-level), not per-user OAuth.
      // We check all users who have a connected Twitter account and fetch mentions for each.
      if (process.env.TWITTER_BEARER_TOKEN && process.env.TWITTER_USER_ID) {
        // Find users who have connected a Twitter account
        const { data: twitterAccounts, error: twError } = await supabase
          .from("connected_accounts")
          .select("user_id, platform_username")
          .eq("platform", "twitter");

        if (twError) {
          console.error("[poll] Failed to fetch Twitter accounts:", twError.message);
        } else if (twitterAccounts && twitterAccounts.length > 0) {
          console.log(`[poll] Checking ${twitterAccounts.length} Twitter account(s)`);

          for (const twAccount of twitterAccounts) {
            const twLabel = `${twAccount.user_id}/${twAccount.platform_username}`;
            try {
              const twResult = await fetchTwitterForUser(
                twAccount.user_id,
                lookbackHours
              );

              if (twResult.inserted > 0 || twResult.errors.length > 0) {
                console.log(
                  `[poll] twitter ${twLabel}: ${twResult.inserted} new` +
                  (twResult.errors.length > 0
                    ? `, ${twResult.errors.length} error(s)`
                    : "")
                );
              }

              if (twResult.errors.length > 0) {
                for (const err of twResult.errors) {
                  console.error(`[poll] twitter ${twLabel}: ${err}`);
                }
              }

              if (onNewItem && twResult.insertedIds.length > 0) {
                const chatId = await getChatIdForUser(twAccount.user_id);
                if (chatId) {
                  for (const itemId of twResult.insertedIds) {
                    console.log(`[poll] Enqueuing twitter item ${itemId} for chat ${chatId}`);
                    onNewItem(chatId, itemId);
                  }
                } else {
                  console.warn(
                    `[poll] WARNING: ${twResult.insertedIds.length} twitter items for user ${twAccount.user_id} but no telegram_chat_id`
                  );
                }
              }
            } catch (e: any) {
              console.error(`[poll] twitter ${twLabel} error:`, e.message);
            }
          }
        }
      }
    } finally {
      running = false;
    }
  }

  return {
    /** Run one poll cycle immediately (useful for testing). */
    tick,

    /** Start the periodic poll loop. */
    start(): void {
      if (timer) return;
      console.log(`[poll] Starting poll worker — Gmail + Twitter (interval: ${intervalMs / 1000}s)`);
      // Run immediately on start, then on interval
      tick();
      timer = setInterval(tick, intervalMs);
    },

    /** Stop the periodic poll loop. */
    stop(): void {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      console.log("[poll] Stopped");
    },
  };
}
