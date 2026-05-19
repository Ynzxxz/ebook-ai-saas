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
});
