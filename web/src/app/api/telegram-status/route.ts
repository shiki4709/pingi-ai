import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { data } = await supabase
    .from("users")
    .select("telegram_chat_id, x_bot_chat_id")
    .eq("id", userId)
    .single();

  return NextResponse.json({
    inbox_linked: !!(data?.telegram_chat_id),
    x_linked: !!(data?.x_bot_chat_id),
    // Keep backward compat
    linked: !!(data?.telegram_chat_id),
  });
}
