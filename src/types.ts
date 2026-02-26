// ─── Pingi AI Types ───

export type Platform = "gmail" | "twitter" | "linkedin";
export type Urgency = "green" | "amber" | "red";
export type ItemType = "mention" | "reply" | "comment" | "email" | "dm";

export interface EngagementItem {
  id: string;
  platform: Platform;
  itemType: ItemType;

  // Who wrote it
  authorName: string;
  authorHandle?: string;

  // Content
  originalText: string;
  contextText?: string; // your post they're replying to
  itemUrl?: string;

  // Timing
  detectedAt: Date;
  urgency: Urgency;

  // AI draft (filled by drafter)
  draftText?: string;
}

export interface DigestResult {
  items: EngagementItem[];
  generatedAt: Date;
  platforms: {
    gmail: { fetched: number; needsReply: number };
    twitter: { fetched: number; needsReply: number };
    linkedin: { fetched: number; needsReply: number };
  };
}

export interface ConnectorResult {
  items: EngagementItem[];
  errors: string[];
}
