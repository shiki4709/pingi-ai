import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAILS = ["shiki4709@gmail.com"];

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_KEY not configured");
  }
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email } = body as { userId?: string; email?: string };

    console.log(`[stripe/checkout] POST: userId=${userId} email=${email}`);

    if (!userId || !email) {
      console.error("[stripe/checkout] Missing userId or email");
      return NextResponse.json(
        { error: "userId and email are required" },
        { status: 400 }
      );
    }

    // Admin bypass — skip Stripe entirely
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      console.log(`[stripe/checkout] Admin bypass for ${email}, upgrading to pro`);

      const supabase = getSupabase();

      await supabase
        .from("users")
        .update({ plan: "pro" })
        .eq("id", userId);

      await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          stripe_customer_id: "admin_bypass",
          stripe_subscription_id: "admin_bypass",
          plan: "pro",
          status: "active",
          current_period_end: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
        { onConflict: "user_id" }
      );

      const origin =
        request.headers.get("origin") || "http://localhost:3000";
      return NextResponse.json({
        upgraded: true,
        url: `${origin}/pricing?upgraded=true`,
      });
    }

    // Validate Stripe env vars
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error("[stripe/checkout] STRIPE_SECRET_KEY is not set");
      return NextResponse.json(
        { error: "Stripe is not configured. Set STRIPE_SECRET_KEY." },
        { status: 503 }
      );
    }

    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    if (!priceId) {
      console.error("[stripe/checkout] STRIPE_PRO_PRICE_ID is not set");
      return NextResponse.json(
        { error: "Stripe Pro price not configured. Set STRIPE_PRO_PRICE_ID." },
        { status: 503 }
      );
    }

    // Lazy-import stripe to avoid crashing if key is missing
    const { getStripe } = await import("@/lib/stripe");
    const stripe = getStripe();

    const origin = request.headers.get("origin") || "http://localhost:3000";

    console.log(`[stripe/checkout] Creating session: priceId=${priceId} email=${email}`);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      metadata: { userId },
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 3,
      },
      success_url: `${origin}/pricing?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
    });

    console.log(`[stripe/checkout] Session created: id=${session.id} url=${session.url?.slice(0, 60)}...`);
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[stripe/checkout] Error:", err.message ?? err);
    if (err.stack) console.error("[stripe/checkout] Stack:", err.stack);
    return NextResponse.json(
      { error: err.message ?? "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
