import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getUserById, updateUserPlan } from "../db";
import { getStripe } from "../stripe/client";
import { PLANS } from "../stripe/products";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

export const subscriptionRouter = router({
  // Get current user plan info
  getMyPlan: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });

    const plan = user.plan ?? "free";
    const planInfo = PLANS[plan];

    let creditsRemaining: number | null = null;
    if (plan === "free") creditsRemaining = Math.max(0, 3 - user.creditsUsed);
    else if (plan === "starter") creditsRemaining = Math.max(0, 20 - user.creditsUsed);
    else creditsRemaining = null; // unlimited

    return {
      plan,
      planName: planInfo.name,
      creditsUsed: user.creditsUsed,
      creditsRemaining,
      unlimited: planInfo.unlimited,
      watermark: planInfo.watermark,
      stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd,
    };
  }),

  // Create Stripe Checkout session
  createCheckout: protectedProcedure
    .input(z.object({ planKey: z.enum(["starter", "pro"]) }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const plan = PLANS[input.planKey];
      if (!plan.priceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Le prix Stripe pour le plan ${input.planKey} n'est pas configuré. Veuillez définir STRIPE_${input.planKey.toUpperCase()}_PRICE_ID.`,
        });
      }

      // Create or retrieve Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: user.name || undefined,
          metadata: { userId: ctx.user.id.toString() },
        });
        customerId = customer.id;
        await updateUserPlan(ctx.user.id, { plan: user.plan ?? "free", stripeCustomerId: customerId });
      }

      const origin = ctx.req.headers.origin as string || "http://localhost:3000";

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: plan.priceId, quantity: 1 }],
        success_url: `${origin}/dashboard?checkout=success`,
        cancel_url: `${origin}/pricing?checkout=cancelled`,
        allow_promotion_codes: true,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          plan: input.planKey,
          customer_email: user.email || "",
          customer_name: user.name || "",
        },
      });

      return { url: session.url };
    }),

  // Create Stripe Customer Portal session
  createPortal: protectedProcedure.mutation(async ({ ctx }) => {
    const stripe = getStripe();
    const user = await getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    if (!user.stripeCustomerId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Aucun abonnement actif trouvé." });
    }

    const origin = ctx.req.headers.origin as string || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/dashboard`,
    });

    return { url: session.url };
  }),
});
