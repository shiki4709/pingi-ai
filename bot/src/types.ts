// ─── Telegram types (subset we need) ───

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
  entities?: TelegramMessageEntity[];
}

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
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

// ─── App types ───

export type Urgency = "red" | "amber" | "green";
export type Platform = "gmail" | "twitter" | "linkedin";
export type ContextCategory =
  | "BUSINESS_OPPORTUNITY"
  | "PROFESSIONAL_NETWORK"
  | "AUDIENCE_ENGAGEMENT"
  | "KNOWLEDGE_EXCHANGE"
  | "OPERATIONAL"
  | "PERSONAL";

export interface EngagementItem {
  id: string;
  platform: Platform;
  urgency: Urgency;
  context: ContextCategory;
  priorityScore: number;
  authorName: string;
  authorHandle?: string;
  originalText: string;
  contextText?: string;
  detectedAt: Date;
  draftText?: string;
  /** Which connected account this came from, e.g. "alice@gmail.com" */
  accountLabel?: string;
}

export type ItemStatus = "pending" | "sent" | "skipped";

export interface TrackedItem extends EngagementItem {
  status: ItemStatus;
  sentAt?: Date;
  finalDraft?: string;
}
