// ─── Publish Types ───

export type PublishPlatform =
  | "linkedin"
  | "twitter"
  | "rednote"
  | "substack"
  | "instagram";

export type PublishMethod = "direct" | "copy" | "auto-drafted";

export type PublishStatus =
  | "published"
  | "copied"
  | "auto-drafted"
  | "failed";

export interface PublishEntry {
  id: string;
  platform: PublishPlatform;
  status: PublishStatus;
  content: string;
  campaign?: string;
  publishedAt: Date;
  error?: string;
}

/** Platforms that support direct API publishing */
export const DIRECT_PLATFORMS: PublishPlatform[] = ["linkedin", "twitter"];

/** Platforms that require manual copy & paste */
export const COPY_PLATFORMS: PublishPlatform[] = [
  "rednote",
  "substack",
  "instagram",
];

export interface PublishRequest {
  content: string;
  platform: PublishPlatform;
  campaign?: string;
}

export interface OpenClawRequest {
  content: string;
  platform: PublishPlatform;
  campaign?: string;
}
