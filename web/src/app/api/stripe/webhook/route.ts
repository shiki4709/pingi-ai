import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

/**
 * Extract current_period_end from the first subscription item.
 * In the 2026-02 Stripe API, current_period_end lives on SubscriptionItem,
 * not on Subscription itself.
 */
function getPeriodEnd(sub: Stripe.Subscription): string | null {
  const firstItem = sub.items?.data?.[0];
  if (!firstItem) return null;
  return new Date(firstItem.current_period_end * 1000).toISOString();
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId || !session.subscription || !session.customer) break;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer.id;

        const sub = await getStripe().subscriptions.retrieve(subscriptionId);
        const periodEnd = getPeriodEnd(sub);

        await getSupabase().from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan: "pro",
            status: sub.status,
            current_period_end: periodEnd,
          },
          { onConflict: "user_id" }
        );

        // Also update plan on users table
        await getSupabase()
          .from("users")
          .update({ plan: "pro" })
          .eq("id", userId);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const subscriptionId = sub.id;
        const periodEnd = getPeriodEnd(sub);

        const { data } = await getSupabase()
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        if (data) {
          await getSupabase()
            .from("subscriptions")
            .update({
              status: sub.status,
              current_period_end: periodEnd,
            })
            .eq("stripe_subscription_id", subscriptionId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        // Get user_id before updating
        const { data: subRow } = await getSupabase()
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", sub.id)
          .single();

        await getSupabase()
          .from("subscriptions")
          .update({ status: "canceled", plan: "free" })
          .eq("stripe_subscription_id", sub.id);

        // Revert plan on users table
        if (subRow?.user_id) {
          await getSupabase()
            .from("users")
            .update({ plan: "free" })
            .eq("id", subRow.user_id);
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
