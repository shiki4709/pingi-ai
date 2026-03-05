import { NextRequest, NextResponse } from "next/server";
import type { PublishRequest, PublishEntry } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: PublishRequest = await request.json();
    const { content, platform, campaign } = body;

    if (!content || !platform) {
      return NextResponse.json(
        { error: "content and platform are required" },
        { status: 400 }
      );
    }

    // Direct publish for LinkedIn/X
    if (platform === "linkedin") {
      const token = process.env.LINKEDIN_ACCESS_TOKEN;
      const urn = process.env.LINKEDIN_PERSON_URN;
      if (!token || !urn) {
        return NextResponse.json(
          { error: "LinkedIn credentials not configured", missingVars: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_PERSON_URN"] },
          { status: 503 }
        );
      }

      const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: `urn:li:person:${urn}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: content },
              shareMediaCategory: "NONE",
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
          },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json(
          { error: `LinkedIn API error: ${err}` },
          { status: res.status }
        );
      }

      const entry: PublishEntry = {
        id: crypto.randomUUID(),
        platform: "linkedin",
        status: "published",
        content,
        campaign,
        publishedAt: new Date(),
      };
      return NextResponse.json(entry);
    }

    if (platform === "twitter") {
      const bearerToken = process.env.TWITTER_BEARER_TOKEN;
      const apiKey = process.env.TWITTER_API_KEY;
      const apiSecret = process.env.TWITTER_API_SECRET;
      const accessToken = process.env.TWITTER_ACCESS_TOKEN;
      const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

      if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
        return NextResponse.json(
          {
            error: "Twitter/X credentials not configured",
            missingVars: [
              "TWITTER_API_KEY",
              "TWITTER_API_SECRET",
              "TWITTER_ACCESS_TOKEN",
              "TWITTER_ACCESS_TOKEN_SECRET",
            ],
          },
          { status: 503 }
        );
      }

      // Twitter OAuth 1.0a would be used here in production
      // For now, return a structured error indicating setup needed
      return NextResponse.json(
        { error: "Twitter OAuth 1.0a posting not yet implemented" },
        { status: 501 }
      );
    }

    // Copy-only platforms don't publish via this route
    return NextResponse.json(
      { error: `${platform} does not support direct publishing. Use copy or OpenClaw.` },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
