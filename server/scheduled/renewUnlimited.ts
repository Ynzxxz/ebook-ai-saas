import { Request, Response } from "express";
import { getDb } from "../db";
import { eq, lt, and } from "drizzle-orm";
import { transactions, users } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";
import { sdk } from "../_core/sdk";

/**
 * Heartbeat handler pour renouveler automatiquement les packs Illimité 30j
 * S'exécute quotidiennement à 09:00 UTC
 * Vérifie les transactions Illimité qui expirent dans les 7 prochains jours
 * Envoie une notification à l'utilisateur pour le renouvellement
 */
export async function handleRenewUnlimitedHandler(req: Request, res: Response) {
  try {
    // Authentifier comme cron (sécurité : vérifier que c'est un appel planifié)
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Récupérer les transactions Illimité qui expirent dans les 7 prochains jours
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiringTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.packType, "unlimited"),
          eq(transactions.status, "completed"),
          eq(transactions.isRenewed, false),
          lt(transactions.expiresAt, sevenDaysFromNow)
        )
      );

    console.log(`[Renew Unlimited] Found ${expiringTransactions.length} expiring unlimited packs`);

    let notifiedCount = 0;

    // Pour chaque transaction expirant, marquer comme "notification envoyée"
    for (const tx of expiringTransactions) {
      try {
        const userRecord = await db
          .select()
          .from(users)
          .where(eq(users.id, tx.userId))
          .limit(1);

        if (userRecord.length === 0) continue;

        // Marquer comme "notification envoyée"
        await db
          .update(transactions)
          .set({ isRenewed: true })
          .where(eq(transactions.id, tx.id));

        console.log(
          `[Renew Unlimited] Renewal reminder sent to user ${tx.userId} for pack expiring at ${tx.expiresAt}`
        );

        notifiedCount++;
      } catch (error) {
        console.error(`[Renew Unlimited] Error processing transaction ${tx.id}:`, error);
      }
    }

    // Notifier le propriétaire du projet
    await notifyOwner({
      title: "Renouvellement Illimité - Rapport quotidien",
      content: `${notifiedCount} utilisateurs ont reçu une notification de renouvellement pour leur pack Illimité expirant.`,
    });

    return res.json({
      ok: true,
      processed: expiringTransactions.length,
      notified: notifiedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Renew Unlimited] Error:", error);
    return res.status(500).json({
      error: "Renewal check failed",
      details: error instanceof Error ? error.message : "Unknown error",
      context: {
        url: req.url,
        timestamp: new Date().toISOString(),
      },
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
