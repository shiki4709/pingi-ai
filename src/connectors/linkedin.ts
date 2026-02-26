import { ConnectorResult, EngagementItem } from "../types";
import { calculateUrgency, adjustForPlatform } from "../urgency";

// LinkedIn API is more restrictive — using the Community Management API
// Requires Marketing Developer Platform access

interface LinkedInComment {
  id: string;
  message: { text: string };
  actor: string; // URN
  created: { time: number };
}

async function linkedInFetch(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202401",
    },
  });

  if (!res.ok) {
    throw new Error(`LinkedIn API ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

export async function fetchLinkedInItems(
  lookbackHours: number = 24
): Promise<ConnectorResult> {
  const items: EngagementItem[] = [];
  const errors: string[] = [];

  if (!process.env.LINKEDIN_ACCESS_TOKEN || !process.env.LINKEDIN_PERSON_URN) {
    return {
      items,
      errors: ["LinkedIn not configured — missing access token or person URN"],
    };
  }

  try {
    const personUrn = process.env.LINKEDIN_PERSON_URN;
    const cutoff = Date.now() - lookbackHours * 60 * 60 * 1000;

    // Step 1: Get your recent posts
    const postsUrl = `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${encodeURIComponent(personUrn)})&count=10`;
    const postsRes = await linkedInFetch(postsUrl);
    const posts = postsRes.elements || [];

    console.log(`  💼 LinkedIn: checking ${posts.length} recent posts for comments`);

    // Step 2: For each post, get comments
    for (const post of posts) {
      const postUrn = post.id || post["$URN"];
      if (!postUrn) continue;

      try {
        const commentsUrl = `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments?count=20`;
        const commentsRes = await linkedInFetch(commentsUrl);

        for (const comment of commentsRes.elements || []) {
          const createdAt = new Date(comment.created?.time || Date.now());

          // Skip if outside lookback window
          if (createdAt.getTime() < cutoff) continue;

          // Skip your own comments
          if (comment.actor === personUrn) continue;

          const urgency = adjustForPlatform(
            calculateUrgency(createdAt),
            "linkedin",
            "comment"
          );

          // Extract post title/text for context
          const postText =
            post.specificContent?.["com.linkedin.ugc.ShareContent"]
              ?.shareCommentary?.text || "(your post)";

          items.push({
            id: `linkedin-${comment.id || comment["$URN"]}`,
            platform: "linkedin",
            itemType: "comment",
            authorName: comment.actor || "LinkedIn User",
            originalText: comment.message?.text || "",
            contextText: postText.slice(0, 200),
            detectedAt: createdAt,
            urgency,
          });
        }
      } catch (e: any) {
        errors.push(`LinkedIn comments for post: ${e.message}`);
      }
    }
  } catch (e: any) {
    errors.push(`LinkedIn API error: ${e.message}`);
  }

  return { items, errors };
}
