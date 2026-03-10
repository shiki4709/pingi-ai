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
  getSearchTopics,
  setSearchTopics,
  addSearchTopics,
  removeSearchTopic,
  getRecentEngageItems,
  getEngageItem,
  markPosted,
  markSkipped,
  updateDraftComment,
} from "./store.js";
import { likeTweet, searchTwitterUsers } from "./scraper.js";
import { rewriteComment, chatWithAssistant } from "./drafter.js";
import { scanForUser } from "./scanner.js";

// ─── Session state ───

interface EditSession {
  itemId: string;
  chatId: number;
  messageId: number;
}

const editSessions = new Map<number, EditSession>();
const awaitingEmail = new Set<number>();

interface PendingConfirm {
  handle: string;
  name: string;
  followers: number;
}
const awaitingConfirm = new Map<number, PendingConfirm>();

// ─── Helpers ───

function escMd(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function userLink(handle: string): string {
  return `<a href="https://x.com/${handle}">@${handle}</a>`;
}

function escHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
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

  // Check if we're awaiting confirmation to add a handle
  const pending = awaitingConfirm.get(chatId);
  if (pending && text && !text.startsWith("/")) {
    await handleConfirmAdd(chatId, text, pending);
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
        text: [
          "You're already connected\\! Here's what you can do:",
          "",
          "`/watch @paulg @naval` \\- Watch accounts for new tweets",
          "`/topics AI agents, fintech, startups` \\- Track topics \\(finds popular tweets about these\\)",
          "`/scan` \\- Scan now instead of waiting 30 min",
          "",
          "Type `/watch` or `/topics` to get started\\.",
        ].join("\n"),
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

  // /topics — manage search topics
  const topicsMatch = text.match(/^\/topics(@\w+)?\s*(.*)/s);
  if (topicsMatch) {
    const userId = await getUserIdForChat(chatId);
    if (!userId) {
      await sendMessage({ chat_id: chatId, text: "Connect your account first with /start" });
      return;
    }

    const body = topicsMatch[2].trim();

    // /topics remove <topic>
    if (body.startsWith("remove ")) {
      const topic = body.slice(7).trim();
      if (!topic) {
        await sendMessage({
          chat_id: chatId,
          text: "Usage: `/topics remove AI agents`",
          parse_mode: "MarkdownV2",
        });
        return;
      }
      const ok = await removeSearchTopic(userId, topic);
      await sendMessage({
        chat_id: chatId,
        text: ok
          ? `Removed "${escMd(topic)}" from your topics\\.`
          : `"${escMd(topic)}" is not in your topics\\.`,
        parse_mode: "MarkdownV2",
      });
      return;
    }

    // /topics clear
    if (body === "clear") {
      await setSearchTopics(userId, []);
      await sendMessage({
        chat_id: chatId,
        text: "Topics cleared\\.",
        parse_mode: "MarkdownV2",
      });
      return;
    }

    // /topics (no args) → show current list
    if (!body) {
      const topics = await getSearchTopics(userId);
      if (topics.length === 0) {
        await sendMessage({
          chat_id: chatId,
          text: [
            "No topics tracked yet\\.",
            "",
            "Add topics to search for:",
            "`/topics AI agents, fintech, startups`",
            "",
            "I'll find popular tweets about these every 30 min and draft replies\\.",
          ].join("\n"),
          parse_mode: "MarkdownV2",
        });
      } else {
        await sendMessage({
          chat_id: chatId,
          text: [
            `*Tracking ${topics.length} topics:*`,
            topics.map((t) => `\\- ${escMd(t)}`).join("\n"),
            "",
            "`/topics AI agents, DeFi` to add more",
            "`/topics remove AI agents` to remove one",
            "`/topics clear` to remove all",
          ].join("\n"),
          parse_mode: "MarkdownV2",
        });
      }
      return;
    }

    // /topics AI agents, fintech, startups — add topics (comma-separated)
    const newTopics = body
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (newTopics.length === 0) {
      await sendMessage({
        chat_id: chatId,
        text: "No valid topics found\\. Use: `/topics AI agents, fintech, startups`",
        parse_mode: "MarkdownV2",
      });
      return;
    }

    const ok = await addSearchTopics(userId, newTopics);
    if (!ok) {
      await sendMessage({
        chat_id: chatId,
        text: "Failed to save topics. The database may need a migration. Please contact support.",
      });
      return;
    }
    const all = await getSearchTopics(userId);
    await sendMessage({
      chat_id: chatId,
      text: [
        `Added ${newTopics.length} topic${newTopics.length > 1 ? "s" : ""}\\. Now tracking:`,
        all.map((t) => `\\- ${escMd(t)}`).join("\n"),
        "",
        "I'll find popular tweets about these every 30 min\\.",
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
    const topics = await getSearchTopics(userId);

    if (accounts.length === 0 && topics.length === 0) {
      await sendMessage({
        chat_id: chatId,
        text: "Nothing to scan\\. Add accounts with `/watch @handle` or topics with `/topics AI agents`",
        parse_mode: "MarkdownV2",
      });
      return;
    }

    const parts: string[] = [];
    if (accounts.length > 0) parts.push(`${accounts.length} account${accounts.length > 1 ? "s" : ""}`);
    if (topics.length > 0) parts.push(`${topics.length} topic${topics.length > 1 ? "s" : ""}`);

    await sendMessage({
      chat_id: chatId,
      text: `Scanning ${parts.join(" and ")}\\.\\.\\. this may take a moment\\.`,
      parse_mode: "MarkdownV2",
    });

    const itemsSent = await scanForUser(userId, accounts, chatId, topics);

    if (itemsSent === 0) {
      await sendMessage({
        chat_id: chatId,
        text: "No new tweets to engage with right now\\. I'll check again in 30 min\\.",
        parse_mode: "MarkdownV2",
      });
    }
    return;
  }

  // /unwatch @handle — remove watched account
  const unwatchMatch = text.match(/^\/unwatch(@\w+)?\s*(.*)/s);
  if (unwatchMatch) {
    const userId = await getUserIdForChat(chatId);
    if (!userId) {
      await sendMessage({ chat_id: chatId, text: "Connect your account first with /start" });
      return;
    }

    const body = unwatchMatch[2].trim();
    if (!body) {
      await sendMessage({
        chat_id: chatId,
        text: "Usage: `/unwatch @paulg`",
        parse_mode: "MarkdownV2",
      });
      return;
    }

    const handles = body
      .split(/[\s,]+/)
      .map((h) => h.replace(/^@/, "").trim())
      .filter((h) => h.length > 0);

    for (const h of handles) {
      await removeWatchedAccount(userId, h);
    }

    const remaining = await getWatchedAccounts(userId);
    await sendMessage({
      chat_id: chatId,
      text: remaining.length > 0
        ? `Removed\\. Still watching: ${remaining.map((a) => `@${escMd(a)}`).join(", ")}`
        : "Removed\\. Watchlist is now empty\\.",
      parse_mode: "MarkdownV2",
    });
    return;
  }

  // /untopics <topic> — remove search topic
  const untopicsMatch = text.match(/^\/untopics(@\w+)?\s*(.*)/s);
  if (untopicsMatch) {
    const userId = await getUserIdForChat(chatId);
    if (!userId) {
      await sendMessage({ chat_id: chatId, text: "Connect your account first with /start" });
      return;
    }

    const body = untopicsMatch[2].trim();
    if (!body) {
      await sendMessage({
        chat_id: chatId,
        text: "Usage: `/untopics AI agents`",
        parse_mode: "MarkdownV2",
      });
      return;
    }

    // Comma-separated topics to remove
    const toRemove = body.split(",").map((t) => t.trim()).filter(Boolean);
    for (const t of toRemove) {
      await removeSearchTopic(userId, t);
    }

    const remaining = await getSearchTopics(userId);
    await sendMessage({
      chat_id: chatId,
      text: remaining.length > 0
        ? `Removed\\. Still tracking: ${remaining.map((t) => escMd(t)).join(", ")}`
        : "Removed\\. No topics tracked\\.",
      parse_mode: "MarkdownV2",
    });
    return;
  }

  // Unknown command
  if (text.startsWith("/")) {
    await sendMessage({
      chat_id: chatId,
      text: "Commands: `/start`, `/watch`, `/unwatch`, `/topics`, `/untopics`, `/scan`",
      parse_mode: "MarkdownV2",
    });
    return;
  }

  // ─── Conversational AI fallback (non-command free text) ───
  const userId = await getUserIdForChat(chatId);
  if (!userId) {
    await sendMessage({ chat_id: chatId, text: "Send /start to get connected first." });
    return;
  }

  if (!text) return;

  // Detect "add [name]" / "watch [name]" / "follow [name]" patterns → search and confirm
  const addMatch = text.match(/^(?:add|watch|follow|track)\s+(.+)/i);
  if (addMatch) {
    const name = addMatch[1].trim();

    // If it already looks like a @handle, search to confirm it's real
    if (/^@?[a-zA-Z0-9_]+$/.test(name)) {
      const handle = name.replace(/^@/, "");
      const users = await searchTwitterUsers(handle, 1);
      if (users.length > 0 && users[0].username.toLowerCase() === handle.toLowerCase()) {
        const u = users[0];
        awaitingConfirm.set(chatId, { handle: u.username, name: u.name, followers: u.followers });
        await sendMessage({
          chat_id: chatId,
          text: `Found ${userLink(u.username)} (${u.name}) - ${formatFollowers(u.followers)} followers.\n\nAdd to your watchlist? (yes/no)`,
          parse_mode: "HTML",
        });
      } else {
        awaitingConfirm.set(chatId, { handle, name: handle, followers: 0 });
        await sendMessage({
          chat_id: chatId,
          text: `Add ${userLink(handle)} to your watchlist? (yes/no)`,
          parse_mode: "HTML",
        });
      }
      return;
    }

    // Search for the user by name
    await sendMessage({ chat_id: chatId, text: `Searching for "${name}" on X...` });
    const users = await searchTwitterUsers(name, 5);

    if (users.length > 0) {
      // Auto-confirm the top result
      const top = users[0];
      awaitingConfirm.set(chatId, { handle: top.username, name: top.name, followers: top.followers });

      if (users.length === 1) {
        await sendMessage({
          chat_id: chatId,
          text: `Found ${userLink(top.username)} (${top.name}) - ${formatFollowers(top.followers)} followers.\n\nAdd to your watchlist? (yes/no)`,
          parse_mode: "HTML",
        });
      } else {
        const lines = users.map(
          (u, i) => `${i === 0 ? ">" : " "} ${userLink(u.username)} (${u.name}) - ${formatFollowers(u.followers)} followers`
        );
        await sendMessage({
          chat_id: chatId,
          text: [
            `Found these accounts for "${escHtml(name)}":`,
            "",
            ...lines,
            "",
            `Add ${userLink(top.username)}? (yes/no)`,
            `Or type another handle from the list.`,
          ].join("\n"),
          parse_mode: "HTML",
        });
      }
    } else {
      await sendMessage({
        chat_id: chatId,
        text: `Couldn't find anyone matching "${name}". Try their exact X handle, e.g. "add @theirhandle"`,
      });
    }
    return;
  }

  // Detect "remove [name]" / "unwatch [name]" / "unfollow [name]" patterns → remove directly
  const removeMatch = text.match(/^(?:remove|unwatch|unfollow|stop watching|stop tracking)\s+(.+)/i);
  if (removeMatch) {
    const name = removeMatch[1].trim().replace(/^@/, "");
    const accounts = await getWatchedAccounts(userId);
    const topics = await getSearchTopics(userId);

    // Check if it matches a watched account
    const accountMatch = accounts.find((a) => a.toLowerCase() === name.toLowerCase());
    if (accountMatch) {
      await removeWatchedAccount(userId, accountMatch);
      await sendMessage({ chat_id: chatId, text: `Removed @${accountMatch} from your watchlist.` });
      return;
    }

    // Check if it matches a topic
    const topicMatch = topics.find((t) => t.toLowerCase() === name.toLowerCase());
    if (topicMatch) {
      await removeSearchTopic(userId, topicMatch);
      await sendMessage({ chat_id: chatId, text: `Removed "${topicMatch}" from your topics.` });
      return;
    }

    await sendMessage({
      chat_id: chatId,
      text: `"${name}" isn't in your watchlist or topics. Check /watch or /topics to see what you're tracking.`,
    });
    return;
  }

  const [accounts, topics, recentItems] = await Promise.all([
    getWatchedAccounts(userId),
    getSearchTopics(userId),
    getRecentEngageItems(userId, 10),
  ]);

  const reply = await chatWithAssistant(text, {
    watchedAccounts: accounts,
    searchTopics: topics,
    recentItems: recentItems.map((i) => ({
      authorHandle: i.authorHandle,
      tweetText: i.tweetText,
      status: i.status,
    })),
  });

  if (reply) {
    await sendMessage({ chat_id: chatId, text: reply });
  } else {
    await sendMessage({
      chat_id: chatId,
      text: "Sorry, I couldn't process that. Try a command like /watch or /topics.",
    });
  }
}

// ─── Confirm add flow ───

async function handleConfirmAdd(
  chatId: number,
  text: string,
  pending: PendingConfirm
): Promise<void> {
  const lower = text.toLowerCase().trim();

  // User said yes → add the handle
  if (lower === "yes" || lower === "y" || lower === "yep" || lower === "yeah" || lower === "sure" || lower === "ok") {
    awaitingConfirm.delete(chatId);
    const userId = await getUserIdForChat(chatId);
    if (!userId) {
      await sendMessage({ chat_id: chatId, text: "Send /start to get connected first." });
      return;
    }
    await addWatchedAccount(userId, pending.handle);
    await sendMessage({
      chat_id: chatId,
      text: `Added @${pending.handle} to your watchlist. I'll check their tweets every 30 min.`,
    });
    return;
  }

  // User said no → cancel
  if (lower === "no" || lower === "n" || lower === "nah" || lower === "cancel" || lower === "nope") {
    awaitingConfirm.delete(chatId);
    await sendMessage({ chat_id: chatId, text: "OK, not added." });
    return;
  }

  // User typed a different handle from the list → confirm that one instead
  const handleMatch = text.match(/^@?([a-zA-Z0-9_]+)$/);
  if (handleMatch) {
    const newHandle = handleMatch[1];
    awaitingConfirm.delete(chatId);
    const userId = await getUserIdForChat(chatId);
    if (!userId) {
      await sendMessage({ chat_id: chatId, text: "Send /start to get connected first." });
      return;
    }
    await addWatchedAccount(userId, newHandle);
    await sendMessage({
      chat_id: chatId,
      text: `Added @${newHandle} to your watchlist. I'll check their tweets every 30 min.`,
    });
    return;
  }

  // Didn't understand
  awaitingConfirm.delete(chatId);
  await sendMessage({
    chat_id: chatId,
    text: "Cancelled. Try again with a name or handle.",
  });
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
    text: [
      "Connected\\! Here's what you can do:",
      "",
      "`/watch @paulg @naval` \\- Watch accounts for new tweets",
      "`/topics AI agents, fintech, startups` \\- Track topics \\(finds popular tweets about these\\)",
      "`/scan` \\- Scan now instead of waiting 30 min",
      "",
      "Type `/watch` or `/topics` to get started\\.",
    ].join("\n"),
    parse_mode: "MarkdownV2",
  });
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
