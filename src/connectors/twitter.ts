import { TwitterApi } from "twitter-api-v2";
import { ConnectorResult, EngagementItem } from "../types";
import { calculateUrgency, adjustForPlatform } from "../urgency";

function getClient(): TwitterApi {
  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
  });
}

export async function fetchTwitterItems(
  lookbackHours: number = 24
): Promise<ConnectorResult> {
  const items: EngagementItem[] = [];
  const errors: string[] = [];

  if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_USER_ID) {
    return { items, errors: ["Twitter not configured — missing API keys or TWITTER_USER_ID"] };
  }

  try {
    const client = getClient();
    const userId = process.env.TWITTER_USER_ID;

    const startTime = new Date(
      Date.now() - lookbackHours * 60 * 60 * 1000
    ).toISOString();

    // Fetch mentions
    const mentions = await client.v2.userMentionTimeline(userId, {
      start_time: startTime,
      max_results: 20,
      "tweet.fields": ["created_at", "author_id", "in_reply_to_user_id", "conversation_id"],
      "user.fields": ["name", "username"],
      expansions: ["author_id"],
    });

    const users = new Map(
      (mentions.includes?.users || []).map((u) => [u.id, u])
    );

    console.log(
      `  🐦 Twitter: found ${mentions.data?.data?.length || 0} mentions`
    );

    for (const tweet of mentions.data?.data || []) {
      const author = users.get(tweet.author_id || "");
      const date = tweet.created_at
        ? new Date(tweet.created_at)
        : new Date();

      const urgency = adjustForPlatform(
        calculateUrgency(date),
        "twitter",
        "mention"
      );

      items.push({
        id: `twitter-${tweet.id}`,
        platform: "twitter",
        itemType: "mention",
        authorName: author?.name || "Unknown",
        authorHandle: `@${author?.username || "unknown"}`,
        originalText: tweet.text,
        itemUrl: `https://x.com/${author?.username}/status/${tweet.id}`,
        detectedAt: date,
        urgency,
      });
    }
  } catch (e: any) {
    // Handle rate limits gracefully
    if (e.code === 429) {
      errors.push("Twitter rate limited — try again later");
    } else {
      errors.push(`Twitter API error: ${e.message}`);
    }
  }

  return { items, errors };
}
