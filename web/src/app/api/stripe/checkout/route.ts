import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAILS = ["shiki4709@gmail.com"];

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email } = body as { userId?: string; email?: string };

    if (!userId || !email) {
      return NextResponse.json(
        { error: "userId and email are required" },
        { status: 400 }
      );
    }

    // Admin bypass — skip Stripe entirely
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      console.log(`[stripe/checkout] Admin bypass for ${email}, upgrading to pro`);

      const supabase = getSupabase();

      // Update plan on users table
      await supabase
        .from("users")
        .update({ plan: "pro" })
        .eq("id", userId);

      // Upsert subscriptions table
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

    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe Pro price not configured" },
        { status: 503 }
      );
    }

    const origin = request.headers.get("origin") || "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
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

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout] error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
