/**
 * Telegram message and callback query handlers for the X engagement bot.
 * /start → email prompt, /watch @handle, Post/Edit/Skip buttons, edit sessions.
 */

import {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  inlineButtons,
  type TelegramMessage,
  type TelegramCallbackQuery,
} from "./telegram.js";
import {
  getUserIdForChat,
  linkByEmail,
  getWatchedAccounts,
  setWatchedAccounts,
  addWatchedAccount,
  removeWatchedAccount,
  getEngageItem,
  markPosted,
  markSkipped,
  updateDraftComment,
  setXCookies,
  getXCookies,
} from "./store.js";
import { likeTweet, getScraperForUser, clearUserScraper } from "./scraper.js";
import { rewriteComment } from "./drafter.js";
import { scanForUser } from "./scanner.js";

// ─── Session state ───

interface EditSession {
  itemId: string;
  chatId: number;
  messageId: number;
}

const editSessions = new Map<number, EditSession>();
const awaitingEmail = new Set<number>();
const awaitingCookies = new Set<number>();

// ─── Helpers ───

function escMd(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function itemCard(item: {
  authorName: string;
  authorHandle: string;
  tweetText: string;
  tweetUrl: string;
  draftComment: string;
  id: string;
}): { text: string; markup: ReturnType<typeof inlineButtons> } {
  const text = [
    `*${escMd(item.authorName)}* \\(@${escMd(item.authorHandle)}\\)`,
    ``,
    escMd(item.tweetText.slice(0, 500)),
    ``,
    `\u2014\u2014\u2014`,
    `*Draft reply:*`,
    escMd(item.draftComment),
    ``,
    `_Tap Post to copy reply \\+ open tweet_`,
  ].join("\n");

  const markup = inlineButtons([
    [
      { text: "Post", data: `post:${item.id}` },
      { text: "Edit", data: `edit:${item.id}` },
      { text: "Skip", data: `skip:${item.id}` },
    ],
    [
      { text: "Like", data: `like:${item.id}` },
      { text: "View tweet", url: item.tweetUrl },
    ],
  ]);

  return { text, markup };
}

// ─── Message handler ───

export async function handleMessage(msg: TelegramMessage): Promise<void> {
  const chatId = msg.chat.id;
  const text = msg.text?.trim() ?? "";

  console.log(`[x-handlers] chatId=${chatId} text="${text}"`);

  // Edit sessions take priority over everything else for free-text input
  const session = editSessions.get(chatId);
  if (session && text && !text.startsWith("/")) {
    console.log(`[x-handlers] Edit session active for chatId=${chatId}, itemId=${session.itemId}, instruction="${text}"`);
    await handleEditReply(session, text);
    return;
  }

  // Check if we're awaiting cookies from this chat
  if (awaitingCookies.has(chatId) && text && !text.startsWith("/")) {
    await handleCookiesInput(chatId, text);
    return;
  }

  // Check if we're awaiting an email from this chat
  if (awaitingEmail.has(chatId) && text && !text.startsWith("/")) {
    await handleEmailInput(chatId, text);
    return;
  }

  // /start
  if (text === "/start" || text.match(/^\/start(@\w+)?$/)) {
    const existing = await getUserIdForChat(chatId);
    if (existing) {
      await sendMessage({
        chat_id: chatId,
        text: "You're already connected\\. Add accounts to watch with `/watch @paulg @naval @sama`",
        parse_mode: "MarkdownV2",
      });
      return;
    }

    awaitingEmail.add(chatId);
    await sendMessage({
      chat_id: chatId,
      text: [
        "Welcome to Pingi X Engagement\\!",
        "",
        "I monitor accounts you pick, draft smart replies to their tweets, and let you post with one tap\\.",
        "",
        "What email did you sign up with on Pingi?",
      ].join("\n"),
      parse_mode: "MarkdownV2",
    });
    return;
  }

  // /watch — manage watched accounts
  const watchMatch = text.match(/^\/watch(@\w+)?\s*(.*)/s);
  if (watchMatch) {
    const userId = await getUserIdForChat(chatId);
    if (!userId) {
      await sendMessage({
        chat_id: chatId,
        text: "Connect your account first with /start",
      });
      return;
    }

    const body = watchMatch[2].trim();

    // /watch remove @handle
    if (body.startsWith("remove ")) {
      const handle = body.slice(7).trim().replace(/^@/, "");
      if (!handle) {
        await sendMessage({
          chat_id: chatId,
          text: "Usage: `/watch remove @paulg`",
          parse_mode: "MarkdownV2",
        });
        return;
      }
      const ok = await removeWatchedAccount(userId, handle);
      await sendMessage({
        chat_id: chatId,
        text: ok
          ? `Removed @${escMd(handle)} from your watchlist\\.`
          : `@${escMd(handle)} is not on your watchlist\\.`,
        parse_mode: "MarkdownV2",
      });
      return;
    }

    // /watch clear
    if (body === "clear") {
      await setWatchedAccounts(userId, []);
      await sendMessage({
        chat_id: chatId,
        text: "Watchlist cleared\\.",
        parse_mode: "MarkdownV2",
      });
      return;
    }

    // /watch (no args) → show current list
    if (!body) {
      const accounts = await getWatchedAccounts(userId);
      if (accounts.length === 0) {
        await sendMessage({
          chat_id: chatId,
          text: [
            "No accounts watched yet\\.",
            "",
            "Add accounts to monitor:",
            "`/watch @paulg @naval @sama`",
            "",
            "I'll check their tweets every 30 min and draft replies for you\\.",
          ].join("\n"),
          parse_mode: "MarkdownV2",
        });
      } else {
        await sendMessage({
          chat_id: chatId,
          text: [
            `*Watching ${accounts.length} accounts:*`,
            accounts.map((a) => `\\- @${escMd(a)}`).join("\n"),
            "",
            "`/watch @handle` to add",
            "`/watch remove @handle` to remove",
            "`/watch clear` to remove all",
          ].join("\n"),
          parse_mode: "MarkdownV2",
        });
      }
      return;
    }

    // /watch @paulg @naval @sama — add accounts
    // Parse handles: split by spaces/commas, strip @
    const handles = body
      .split(/[\s,]+/)
      .map((h) => h.replace(/^@/, "").trim())
      .filter((h) => h.length > 0 && /^[a-zA-Z0-9_]+$/.test(h));

    if (handles.length === 0) {
      await sendMessage({
        chat_id: chatId,
        text: "No valid handles found\\. Use: `/watch @paulg @naval`",
        parse_mode: "MarkdownV2",
      });
      return;
    }

    for (const h of handles) {
      await addWatchedAccount(userId, h);
    }

    const all = await getWatchedAccounts(userId);
    await sendMessage({
      chat_id: chatId,
      text: [
        `Added ${handles.length} account${handles.length > 1 ? "s" : ""}\\. Now watching:`,
        all.map((a) => `\\- @${escMd(a)}`).join("\n"),
        "",
        "I'll check their tweets every 30 min and send you drafts\\.",
      ].join("\n"),
      parse_mode: "MarkdownV2",
    });
    return;
  }

  // /cookies — set X auth cookies for reading tweets
  if (text.match(/^\/cookies(@\w+)?$/)) {
    const userId = await getUserIdForChat(chatId);
    if (!userId) {
      await sendMessage({ chat_id: chatId, text: "Connect your account first with /start" });
      return;
    }

    const existing = await getXCookies(userId);

    awaitingCookies.add(chatId);
    await sendMessage({
      chat_id: chatId,
      text: [
        existing ? "Your X cookies are set\\. To update them:" : "*Set up X cookies*",
        "",
        "I need your `auth_token` and `ct0` cookies from X\\.com\\. Here's how to get them:",
        "",
        "1\\. Open x\\.com in Chrome and log in",
        "2\\. Press F12 to open DevTools",
        "3\\. Go to Application tab \\> Cookies \\> https://x\\.com",
        "4\\. Find `auth_token` and copy its Value",
        "5\\. Find `ct0` and copy its Value",
        "",
        "Paste them in this format:",
        "`auth_token=abc123 ct0=def456`",
        "",
        "Or on two lines:",
        "`auth_token=abc123`",
        "`ct0=def456`",
      ].join("\n"),
      parse_mode: "MarkdownV2",
    });
    return;
  }

  // /scan — trigger immediate scan
  if (text.match(/^\/scan(@\w+)?$/)) {
    const userId = await getUserIdForChat(chatId);
    if (!userId) {
      await sendMessage({ chat_id: chatId, text: "Connect your account first with /start" });
      return;
    }

    const accounts = await getWatchedAccounts(userId);
    if (accounts.length === 0) {
      await sendMessage({
        chat_id: chatId,
        text: "No accounts watched\\. Add some first with `/watch @handle`",
        parse_mode: "MarkdownV2",
      });
      return;
    }

    await sendMessage({
      chat_id: chatId,
      text: `Scanning ${accounts.length} account${accounts.length > 1 ? "s" : ""}\\.\\.\\. this may take a moment\\.`,
      parse_mode: "MarkdownV2",
    });

    const itemsSent = await scanForUser(userId, accounts, chatId);

    if (itemsSent === 0) {
      await sendMessage({
        chat_id: chatId,
        text: "No new tweets to engage with right now\\. I'll check again in 30 min\\.",
        parse_mode: "MarkdownV2",
      });
    }
    return;
  }

  // Unknown command
  if (text.startsWith("/")) {
    await sendMessage({
      chat_id: chatId,
      text: "Commands: `/start`, `/watch`, `/scan`, `/cookies`",
      parse_mode: "MarkdownV2",
    });
  }
}

// ─── Email linking flow ───

async function handleEmailInput(
  chatId: number,
  email: string
): Promise<void> {
  if (!email.includes("@") || !email.includes(".")) {
    await sendMessage({
      chat_id: chatId,
      text: "That doesn't look like an email. Try again.",
    });
    return;
  }

  const result = await linkByEmail(email, chatId);
  if ("error" in result) {
    await sendMessage({ chat_id: chatId, text: result.error });
    return;
  }

  awaitingEmail.delete(chatId);
  await sendMessage({
    chat_id: chatId,
    text: "Connected\\! Add accounts to watch with `/watch @paulg @naval @sama`",
    parse_mode: "MarkdownV2",
  });
}

// ─── Cookie input flow ───

async function handleCookiesInput(
  chatId: number,
  text: string
): Promise<void> {
  const userId = await getUserIdForChat(chatId);
  if (!userId) {
    awaitingCookies.delete(chatId);
    await sendMessage({ chat_id: chatId, text: "Connect your account first with /start" });
    return;
  }

  // Parse auth_token and ct0 from various formats:
  // "auth_token=abc ct0=def" or "auth_token=abc\nct0=def" or just pasted values
  let authToken = "";
  let ct0 = "";

  const authMatch = text.match(/auth_token[=:\s]+([a-f0-9]+)/i);
  const ct0Match = text.match(/ct0[=:\s]+([a-f0-9]+)/i);

  if (authMatch) authToken = authMatch[1];
  if (ct0Match) ct0 = ct0Match[1];

  if (!authToken || !ct0) {
    await sendMessage({
      chat_id: chatId,
      text: [
        "Couldn't find both values. Paste them like this:",
        "",
        "auth_token=abc123 ct0=def456",
      ].join("\n"),
    });
    return;
  }

  // Validate by trying to create a scraper
  await sendMessage({ chat_id: chatId, text: "Verifying cookies..." });

  const testScraper = await getScraperForUser(authToken, ct0);
  if (!testScraper) {
    await sendMessage({
      chat_id: chatId,
      text: "Those cookies didn't work. Make sure you copied the full values from Chrome DevTools. Try /cookies again.",
    });
    awaitingCookies.delete(chatId);
    return;
  }

  // Save to DB
  const ok = await setXCookies(userId, authToken, ct0);
  clearUserScraper(userId);

  awaitingCookies.delete(chatId);

  if (ok) {
    await sendMessage({
      chat_id: chatId,
      text: "X cookies saved\\. I'll use your account to read tweets now\\. Run `/scan` to test it\\.",
      parse_mode: "MarkdownV2",
    });
  } else {
    await sendMessage({
      chat_id: chatId,
      text: "Cookies verified but failed to save. Try again.",
    });
  }
}

// ─── Callback query handler ───

export async function handleCallbackQuery(
  cb: TelegramCallbackQuery
): Promise<void> {
  const chatId = cb.message?.chat.id;
  const messageId = cb.message?.message_id;
  const data = cb.data ?? "";

  console.log(`[x-handlers] callback data="${data}" chatId=${chatId}`);

  if (!chatId || !messageId) {
    await answerCallbackQuery(cb.id, "Error");
    return;
  }

  // post:<id> — copy-paste MVP: send draft as plain text + link to tweet
  if (data.startsWith("post:")) {
    const itemId = data.slice(5);
    console.log(`[x-handlers] POST: itemId=${itemId}`);

    const item = await getEngageItem(itemId);
    if (!item) {
      console.log(`[x-handlers] POST: item not found`);
      await answerCallbackQuery(cb.id, "Item not found");
      return;
    }

    if (item.status !== "pending") {
      console.log(`[x-handlers] POST: item already ${item.status}`);
      await answerCallbackQuery(cb.id, `Already ${item.status}`);
      return;
    }

    await answerCallbackQuery(cb.id);

    // 1) Send draft as plain text (easy to copy)
    await sendMessage({
      chat_id: chatId,
      text: item.draftComment,
    });

    // 2) Send clickable link to the tweet
    await sendMessage({
      chat_id: chatId,
      text: `Tap to open and reply: ${item.tweetUrl}`,
    });

    // 3) Mark as posted and update the original card
    await markPosted(itemId);
    await editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: `Posted to @${escMd(item.authorHandle)}\\.`,
      parse_mode: "MarkdownV2",
    });

    console.log(`[x-handlers] POST: sent draft + link for @${item.authorHandle}`);
    return;
  }

  // like:<id>
  if (data.startsWith("like:")) {
    const itemId = data.slice(5);
    console.log(`[x-handlers] LIKE: itemId=${itemId}`);

    const item = await getEngageItem(itemId);
    if (!item) {
      await answerCallbackQuery(cb.id, "Item not found");
      return;
    }

    await answerCallbackQuery(cb.id, "Liking...");

    const result = await likeTweet(item.tweetId);
    console.log(`[x-handlers] LIKE: result=${JSON.stringify(result)}`);

    if (result.ok) {
      await sendMessage({
        chat_id: chatId,
        text: `Liked @${escMd(item.authorHandle)}'s tweet\\.`,
        parse_mode: "MarkdownV2",
      });
    } else {
      await sendMessage({
        chat_id: chatId,
        text: `Failed to like: ${escMd(result.error ?? "unknown error")}`,
        parse_mode: "MarkdownV2",
      });
    }
    return;
  }

  // edit:<id>
  if (data.startsWith("edit:")) {
    const itemId = data.slice(5);
    console.log(`[x-handlers] EDIT: starting edit session for itemId=${itemId} chatId=${chatId} messageId=${messageId}`);
    editSessions.set(chatId, { itemId, chatId, messageId });

    await answerCallbackQuery(cb.id);
    await sendMessage({
      chat_id: chatId,
      text: "How should I change it? Type your instruction\\.",
      parse_mode: "MarkdownV2",
    });
    return;
  }

  // skip:<id>
  if (data.startsWith("skip:")) {
    const itemId = data.slice(5);
    console.log(`[x-handlers] SKIP: itemId=${itemId}`);
    await markSkipped(itemId);
    await editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: "Skipped\\.",
      parse_mode: "MarkdownV2",
    });
    await answerCallbackQuery(cb.id, "Skipped");
    return;
  }

  await answerCallbackQuery(cb.id);
}

// ─── Edit flow ───

async function handleEditReply(
  session: EditSession,
  instruction: string
): Promise<void> {
  const { itemId, chatId, messageId } = session;
  editSessions.delete(chatId);

  console.log(`[x-handlers] EDIT REPLY: itemId=${itemId} instruction="${instruction}"`);

  const item = await getEngageItem(itemId);
  if (!item) {
    console.log(`[x-handlers] EDIT REPLY: item not found`);
    await sendMessage({ chat_id: chatId, text: "Item not found." });
    return;
  }

  console.log(`[x-handlers] EDIT REPLY: current draft="${item.draftComment.slice(0, 80)}..."`);
  console.log(`[x-handlers] EDIT REPLY: tweet="${item.tweetText.slice(0, 80)}..."`);
  await sendMessage({ chat_id: chatId, text: "Rewriting..." });

  const newDraft = await rewriteComment(
    item.tweetText,
    item.draftComment,
    instruction
  );
  console.log(`[x-handlers] EDIT REPLY: new draft="${newDraft.slice(0, 80)}..."`);

  await updateDraftComment(itemId, newDraft);
  console.log(`[x-handlers] EDIT REPLY: saved to DB`);

  // Send updated card with fresh buttons
  const card = itemCard({
    ...item,
    tweetUrl: item.tweetUrl,
    draftComment: newDraft,
  });

  // Send as a new message (editing the original card may fail if it's too old)
  await sendMessage({
    chat_id: chatId,
    text: card.text,
    parse_mode: "MarkdownV2",
    reply_markup: card.markup,
  });
  console.log(`[x-handlers] EDIT REPLY: sent updated card`);
}

// ─── Push item card (used by scanner) ───

export async function pushItemCard(
  chatId: number,
  item: {
    id: string;
    authorName: string;
    authorHandle: string;
    tweetText: string;
    tweetUrl: string;
    draftComment: string;
  }
): Promise<void> {
  const card = itemCard(item);
  await sendMessage({
    chat_id: chatId,
    text: card.text,
    parse_mode: "MarkdownV2",
    reply_markup: card.markup,
  });
}
