import { NextRequest, NextResponse } from "next/server";
import type { OpenClawRequest, PublishEntry } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENCLAW_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENCLAW_API_KEY not configured" },
        { status: 503 }
      );
    }

    const body: OpenClawRequest = await request.json();
    const { content, platform, campaign } = body;

    if (!content || !platform) {
      return NextResponse.json(
        { error: "content and platform are required" },
        { status: 400 }
      );
    }

    // Call OpenClaw browser automation API
    const res = await fetch("https://api.openclaw.com/v1/draft", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform,
        content,
        action: "draft", // open app/site and paste into compose
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `OpenClaw API error: ${err}` },
        { status: res.status }
      );
    }

    const result = await res.json();

    const entry: PublishEntry = {
      id: crypto.randomUUID(),
      platform,
      status: "auto-drafted",
      content,
      campaign,
      publishedAt: new Date(),
    };

    return NextResponse.json(entry);
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** Check if OpenClaw is configured */
export async function GET() {
  const configured = !!process.env.OPENCLAW_API_KEY;
  return NextResponse.json({ configured });
}
