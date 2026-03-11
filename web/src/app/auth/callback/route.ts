import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAILS = ["shiki4709@gmail.com"];

/**
 * Supabase Auth callback handler.
 * After Google OAuth (or email magic link), Supabase redirects here with
 * a ?code= param. We exchange it for a session, ensure a users row exists
 * with a 3-day free trial, then redirect to /onboarding.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error, data: sessionData } =
      await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Supabase code exchange failed:", error.message);
      return NextResponse.redirect(
        new URL(`/auth?error=${encodeURIComponent(error.message)}`, request.url)
      );
    }

    // Ensure a users row exists with auto free trial
    const user = sessionData?.session?.user;
    if (user) {
      const serviceClient = createClient(
        process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );

      const email = user.email?.toLowerCase() ?? "";
      const isAdmin = ADMIN_EMAILS.includes(email);

      // Check if user row already exists
      const { data: existing } = await serviceClient
        .from("users")
        .select("id, plan")
        .eq("id", user.id)
        .single();

      if (!existing) {
        // New user — create row with trial (or pro for admin)
        const trialEndsAt = new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000
        ).toISOString();

        await serviceClient.from("users").insert({
          id: user.id,
          email,
          name: user.user_metadata?.full_name ?? null,
          plan: isAdmin ? "pro" : "trial",
          trial_ends_at: isAdmin ? null : trialEndsAt,
        });
        console.log(
          `[auth/callback] Created user ${user.id} (${email}) plan=${isAdmin ? "pro" : "trial"}`
        );
      } else {
        // Existing user — redirect to dashboard instead of onboarding
        if (isAdmin && existing.plan !== "pro") {
          await serviceClient
            .from("users")
            .update({ plan: "pro" })
            .eq("id", user.id);
          console.log(`[auth/callback] Admin bypass: upgraded ${email} to pro`);
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
