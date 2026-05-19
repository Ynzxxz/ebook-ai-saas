import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getPaypalConfigByUserId, upsertPaypalConfig, addUserCredits, createTransaction } from "../db";

const PACK_DETAILS = {
  starter: { amount: "5.00", credits: 5, description: "Pack Starter - 5 générations" },
  pro: { amount: "15.00", credits: 20, description: "Pack Pro - 20 générations" },
  unlimited: { amount: "25.00", credits: 999, description: "Pack Illimité - 30 jours" },
} as const;

/**
 * Get PayPal Access Token
 */
async function getPayPalAccessToken(clientId: string, clientSecret: string, mode: string) {
  const baseUrl = mode === "sandbox" 
    ? "https://api.sandbox.paypal.com"
    : "https://api.paypal.com";

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[PayPal] Token error:", error);
    throw new Error("Failed to get PayPal access token");
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Create PayPal Order
 */
async function createPayPalOrder(
  accessToken: string,
  pack: keyof typeof PACK_DETAILS,
  returnUrl: string,
  mode: string,
  userId: number
) {
  const baseUrl = mode === "sandbox" 
    ? "https://api.sandbox.paypal.com"
    : "https://api.paypal.com";

  const packInfo = PACK_DETAILS[pack];

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "EUR",
            value: packInfo.amount,
          },
          description: packInfo.description,
          custom_id: `user-${userId}-pack-${pack}`,
        },
      ],
      application_context: {
        brand_name: "EbookAI Studio",
        locale: "fr-FR",
        user_action: "PAY_NOW",
        return_url: returnUrl,
        cancel_url: returnUrl,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[PayPal] Order creation error:", error);
    throw new Error("Failed to create PayPal order");
  }

  const data = (await response.json()) as { id: string; links: Array<{ rel: string; href: string }> };
  
  // Find the approval link
  const approvalLink = data.links.find((link) => link.rel === "approve");
  if (!approvalLink) {
    throw new Error("No approval link in PayPal response");
  }

  return {
    orderId: data.id,
    approvalUrl: approvalLink.href,
  };
}

/**
 * Capture PayPal Order
 */
async function capturePayPalOrder(
  accessToken: string,
  orderId: string,
  mode: string
) {
  const baseUrl = mode === "sandbox" 
    ? "https://api.sandbox.paypal.com"
    : "https://api.paypal.com";

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[PayPal] Order capture error:", error);
    throw new Error("Failed to capture PayPal order");
  }

  const data = (await response.json()) as {
    id: string;
    status: string;
    purchase_units: Array<{
      payments: {
        captures: Array<{
          id: string;
          status: string;
          amount: { value: string; currency_code: string };
        }>;
      };
    }>;
  };

  return data;
}

/**
 * Extract pack from custom_id
 */
function extractPackFromCustomId(customId: string): keyof typeof PACK_DETAILS | null {
  const match = customId.match(/pack-([a-z]+)$/);
  return match ? (match[1] as keyof typeof PACK_DETAILS) : null;
}

export const paypalRouter = router({
  // ─── Get PayPal Configuration ────────────────────────────────────────────────
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    try {
      const config = await getPaypalConfigByUserId(ctx.user.id);
      if (!config) {
        return null;
      }
      // Don't return the secret
      return {
        clientId: config.clientId,
        mode: config.mode,
      };
    } catch (error) {
      console.error("[PayPal] Error getting config:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération de la configuration PayPal",
      });
    }
  }),

  // ─── Save PayPal Configuration ────────────────────────────────────────────────
  saveConfig: protectedProcedure
    .input(
      z.object({
        clientId: z.string().min(1),
        clientSecret: z.string().optional(),
        mode: z.enum(["sandbox", "live"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await upsertPaypalConfig({
          userId: ctx.user.id,
          clientId: input.clientId,
          clientSecret: input.clientSecret || "",
          mode: input.mode,
        });

        return { success: true };
      } catch (error) {
        console.error("[PayPal] Error saving config:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la sauvegarde de la configuration PayPal",
        });
      }
    }),

  // ─── Generate PayPal Checkout Link ────────────────────────────────────────────────
  createCheckoutLink: protectedProcedure
    .input(
      z.object({
        pack: z.enum(["starter", "pro", "unlimited"]),
        returnUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Essayer de récupérer la config en DB d'abord
        let config = await getPaypalConfigByUserId(ctx.user.id);
        
        // Fallback aux variables d'environnement si pas de config en DB
        const clientId = config?.clientId || process.env.PAYPAL_CLIENT_ID;
        const clientSecret = config?.clientSecret || process.env.PAYPAL_CLIENT_SECRET;
        const mode = config?.mode || "sandbox";
        
        if (!clientId || !clientSecret) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Configuration PayPal manquante. Veuillez configurer vos identifiants PayPal.",
          });
        }

        // Get access token
        const accessToken = await getPayPalAccessToken(clientId, clientSecret, mode);

        // Create order
        const { orderId, approvalUrl } = await createPayPalOrder(
          accessToken,
          input.pack,
          input.returnUrl,
          mode,
          ctx.user.id
        );

        console.log(`[PayPal] Checkout link generated for user ${ctx.user.id}, pack: ${input.pack}, orderId: ${orderId}`);

        return {
          url: approvalUrl,
          orderId,
        };
      } catch (error) {
        console.error(`[PayPal] Error creating checkout link:`, error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création du lien de paiement PayPal",
        });
      }
    }),

  // ─── Capture PayPal Order ────────────────────────────────────────────────────
  captureOrder: protectedProcedure
    .input(
      z.object({
        orderId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Récupérer la config PayPal
        let config = await getPaypalConfigByUserId(ctx.user.id);
        
        const clientId = config?.clientId || process.env.PAYPAL_CLIENT_ID;
        const clientSecret = config?.clientSecret || process.env.PAYPAL_CLIENT_SECRET;
        const mode = config?.mode || "sandbox";
        
        if (!clientId || !clientSecret) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Configuration PayPal manquante",
          });
        }

        // Obtenir le token d'accès
        const accessToken = await getPayPalAccessToken(clientId, clientSecret, mode);

        // Capturer la commande
        const captureResult = await capturePayPalOrder(accessToken, input.orderId, mode);

        // Vérifier le statut
        if (captureResult.status !== "COMPLETED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Le paiement n'a pas pu être complété",
          });
        }

        // Extraire les informations de la capture
        const capture = captureResult.purchase_units[0]?.payments?.captures[0];
        if (!capture) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Impossible de récupérer les détails de la capture",
          });
        }

        // Extraire le pack depuis custom_id (défini lors de la création de la commande)
        // Pour simplifier, on utilise le pack fourni lors de la création de la commande
        // Ici on peut déterminer le pack par le montant
        let pack: keyof typeof PACK_DETAILS = "starter";
        const amount = parseFloat(capture.amount.value);
        if (amount >= 25) {
          pack = "unlimited";
        } else if (amount >= 15) {
          pack = "pro";
        } else {
          pack = "starter";
        }
        
        if (!pack) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Impossible de déterminer le pack acheté",
          });
        }

        const packInfo = PACK_DETAILS[pack];
        const credits = packInfo.credits;

        // Ajouter les crédits à l'utilisateur
        await addUserCredits(ctx.user.id, credits);

        // Créer une transaction
        await createTransaction({
          userId: ctx.user.id,
          packType: pack,
          amount: capture.amount.value,
          creditsAdded: credits,
          status: "completed",
          paypalOrderId: input.orderId,
          paypalTransactionId: capture.id,
          createdAt: new Date(),
        });

        console.log(`[PayPal] Order captured successfully for user ${ctx.user.id}, pack: ${pack}, credits: ${credits}`);

        return {
          success: true,
          creditsAdded: credits,
          packType: pack,
        };
      } catch (error) {
        console.error(`[PayPal] Error capturing order:`, error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la capture de la commande PayPal",
        });
      }
    }),
});
