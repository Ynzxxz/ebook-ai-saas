import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getPaypalConfigByUserId, upsertPaypalConfig } from "../db";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";

export const paypalRouter = router({
  // ─── Get PayPal Config ────────────────────────────────────────────────────────
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    try {
      const config = await getPaypalConfigByUserId(ctx.user.id);
      if (!config) {
        return null;
      }
      // Retourner la config sans exposer le secret complet
      return {
        id: config.id,
        clientId: config.clientId,
        clientSecret: config.clientSecret ? "***" : "",
        mode: config.mode,
        webhookId: config.webhookId,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      };
    } catch (error) {
      console.error("[PayPal] Error getting config:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération de la configuration",
      });
    }
  }),

  // ─── Save PayPal Config ────────────────────────────────────────────────────────────
  saveConfig: protectedProcedure
    .input(
      z.object({
        clientId: z.string().min(1, "Client ID requis"),
        clientSecret: z.string().min(1, "Client Secret requis").optional(),
        mode: z.enum(["sandbox", "live"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Valider que l'utilisateur est admin (owner du projet)
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seul l'administrateur peut configurer PayPal",
          });
        }

        // Si clientSecret n'est pas fourni, on garde l'ancien
        let secretToSave = input.clientSecret;
        if (!secretToSave) {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          
          const existing = await getPaypalConfigByUserId(ctx.user.id);
          if (!existing) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Client Secret requis pour la première configuration",
            });
          }
          secretToSave = existing.clientSecret;
        }

        const config = await upsertPaypalConfig({
          userId: ctx.user.id,
          clientId: input.clientId,
          clientSecret: secretToSave,
          mode: input.mode,
        });

        if (!config) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erreur lors de la sauvegarde de la configuration",
          });
        }

        console.log(`[PayPal] Config saved for user ${ctx.user.id} in ${input.mode} mode`);

        return {
          success: true,
          message: "Configuration PayPal sauvegardée avec succès",
        };
      } catch (error) {
        console.error("[PayPal] Error saving config:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la sauvegarde de la configuration",
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

        // Définir les détails du pack
        const packDetails: Record<string, { amount: string; credits: number; description: string }> = {
          starter: { amount: "5.00", credits: 5, description: "Pack Starter - 5 générations" },
          pro: { amount: "15.00", credits: 20, description: "Pack Pro - 20 générations" },
          unlimited: { amount: "25.00", credits: 999, description: "Pack Illimité - 30 jours" },
        };

        const pack = packDetails[input.pack];
        if (!pack) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Pack invalide" });
        }

        // Générer le lien PayPal Standard (PDT)
        const baseUrl = mode === "sandbox" 
          ? "https://www.sandbox.paypal.com/cgi-bin/webscr"
          : "https://www.paypal.com/cgi-bin/webscr";

        const params = new URLSearchParams({
          cmd: "_xclick",
          business: clientId,
          item_name: pack.description,
          amount: pack.amount,
          currency_code: "EUR",
          return: input.returnUrl,
          cancel_return: input.returnUrl,
          invoice: `${ctx.user.id}-${input.pack}-${Date.now()}`,
          custom: JSON.stringify({
            userId: ctx.user.id,
            pack: input.pack,
            credits: pack.credits,
          }),
        });

        const checkoutUrl = `${baseUrl}?${params.toString()}`;

        console.log(`[PayPal] Checkout link generated for user ${ctx.user.id}, pack: ${input.pack}`);

        return {
          url: checkoutUrl,
          success: true,
        };
      } catch (error) {
        console.error("[PayPal] Error creating checkout link:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création du lien de paiement",
        });
      }
    }),
});
