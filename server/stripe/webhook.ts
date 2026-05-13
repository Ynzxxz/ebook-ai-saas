import { Request, Response } from "express";
import Stripe from "stripe";
import { getUserByStripeCustomerId, updateUserByStripeCustomerId, updateUserPlan } from "../db";
import { getStripe } from "./client";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

function getPlanFromPriceId(priceId: string): "starter" | "pro" | "free" {
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return "starter";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  return "free";
}

export async function handleStripeWebhook(req: Request, res: Response) {
  const stripe = getStripe();
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Webhook] STRIPE_WEBHOOK_SECRET is not set");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Webhook] Signature verification failed:", message);
    return res.status(400).json({ error: `Webhook Error: ${message}` });
  }

  console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id || session.client_reference_id;
        const planKey = session.metadata?.plan as "starter" | "pro" | undefined;
        const customerId = session.customer as string;

        if (!userId || !planKey) {
          console.error("[Webhook] Missing userId or planKey in session metadata");
          break;
        }

        const db = await getDb();
        if (!db) break;

        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

        await db.update(users).set({
          plan: planKey,
          stripeCustomerId: customerId,
          stripeSubscriptionId: session.subscription as string,
          creditsUsed: 0,
          creditsReset: nextMonth,
        }).where(eq(users.id, parseInt(userId)));

        console.log(`[Webhook] User ${userId} upgraded to ${planKey}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id || "";
        const plan = getPlanFromPriceId(priceId);
        const periodEnd = new Date((subscription as any).current_period_end * 1000);

        await updateUserByStripeCustomerId(customerId, {
          plan,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          stripeCurrentPeriodEnd: periodEnd,
        });

        console.log(`[Webhook] Subscription updated for customer ${customerId}: plan=${plan}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await updateUserByStripeCustomerId(customerId, {
          plan: "free",
          stripeSubscriptionId: undefined,
          stripePriceId: undefined,
          stripeCurrentPeriodEnd: undefined,
          creditsUsed: 0,
        });

        console.log(`[Webhook] Subscription cancelled for customer ${customerId}`);
        break;
      }

      case "invoice.paid": {
        // Reset monthly credits on renewal
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const user = await getUserByStripeCustomerId(customerId);
        if (user && (user.plan === "starter" || user.plan === "pro")) {
          const now = new Date();
          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
          await updateUserByStripeCustomerId(customerId, {
            creditsUsed: 0,
            creditsReset: nextMonth,
          });
          console.log(`[Webhook] Credits reset for customer ${customerId}`);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("[Webhook] Error processing event:", err);
    return res.status(500).json({ error: "Internal server error" });
  }

  return res.json({ received: true });
}
