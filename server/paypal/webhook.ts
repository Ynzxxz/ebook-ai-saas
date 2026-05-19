import { Request, Response } from "express";
import { addUserCredits, createTransaction, getTransactionByPayPalId, updateTransaction } from "../db";

/**
 * PayPal IPN webhook handler
 * Reçoit les notifications de paiement PayPal
 * Ajoute les crédits à l'utilisateur après confirmation du paiement
 */
export async function handlePayPalWebhook(req: Request, res: Response) {
  try {
    const body = req.body;

    console.log("[PayPal Webhook] Received event:", body.txn_id);

    // Vérifier que c'est un paiement complété
    if (body.payment_status !== "Completed") {
      console.log("[PayPal Webhook] Payment not completed, ignoring");
      return res.json({ verified: true });
    }

    // Vérifier que c'est un paiement pour notre application
    if (body.receiver_email !== process.env.PAYPAL_RECEIVER_EMAIL) {
      console.log("[PayPal Webhook] Wrong receiver email");
      return res.json({ verified: true });
    }

    // Récupérer les infos du paiement
    const txnId = body.txn_id;
    const customData = body.custom ? JSON.parse(body.custom) : {};
    const userId = customData.userId;
    const packType = customData.packType; // 'starter', 'pro', 'unlimited'
    const amount = body.mc_gross;

    if (!userId || !packType) {
      console.error("[PayPal Webhook] Missing userId or packType");
      return res.json({ verified: true });
    }

    // Vérifier que la transaction n'a pas déjà été traitée
    const existingTx = await getTransactionByPayPalId(txnId);
    if (existingTx && existingTx.status === "completed") {
      console.log("[PayPal Webhook] Transaction already processed");
      return res.json({ verified: true });
    }

    // Déterminer les crédits à ajouter
    let creditsAdded = 0;
    let expiresAt: Date | null = null;

    if (packType === "starter") {
      creditsAdded = 5;
    } else if (packType === "pro") {
      creditsAdded = 20;
    } else if (packType === "unlimited") {
      creditsAdded = 999999; // Illimité
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours
    }

    // Créer ou mettre à jour la transaction
    if (existingTx) {
      await updateTransaction(existingTx.id, {
        status: "completed",
        paypalTransactionId: txnId,
      });
    } else {
      await createTransaction({
        userId,
        paypalTransactionId: txnId,
        packType: packType as "starter" | "pro" | "unlimited",
        amount,
        creditsAdded,
        status: "completed",
        expiresAt,
        isRenewed: false,
      });
    }

    // Ajouter les crédits à l'utilisateur
    await addUserCredits(userId, creditsAdded);

    console.log(`[PayPal Webhook] Credits added: ${creditsAdded} for user ${userId}`);

    return res.json({ verified: true });
  } catch (error) {
    console.error("[PayPal Webhook] Error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}
