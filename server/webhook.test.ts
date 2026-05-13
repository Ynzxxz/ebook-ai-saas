import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

// ─── Mock Stripe ──────────────────────────────────────────────────────────────
const mockConstructEvent = vi.fn();
vi.mock("./stripe/client", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  }),
}));

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getUserByStripeCustomerId: vi.fn(),
  updateUserByStripeCustomerId: vi.fn(),
  getDb: vi.fn().mockResolvedValue({
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  }),
}));

import { handleStripeWebhook } from "./stripe/webhook";
import { getUserByStripeCustomerId, updateUserByStripeCustomerId } from "./db";

function makeReq(body: Buffer | string = Buffer.from("{}"), headers: Record<string, string> = {}): Request {
  return {
    body,
    headers: { "stripe-signature": "test-sig", ...headers },
  } as unknown as Request;
}

function makeRes(): { res: Response; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnValue({ json });
  const res = { json, status } as unknown as Response;
  return { res, json, status };
}

describe("handleStripeWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  it("retourne 500 si STRIPE_WEBHOOK_SECRET n'est pas configuré", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const { res, status } = makeRes();
    await handleStripeWebhook(makeReq(), res);
    expect(status).toHaveBeenCalledWith(500);
  });

  it("retourne 400 si la signature Stripe est invalide", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    const { res, status } = makeRes();
    await handleStripeWebhook(makeReq(), res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("retourne { verified: true } pour un test event Stripe", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_test_abc123",
      type: "checkout.session.completed",
      data: { object: {} },
    });
    const { res, json } = makeRes();
    await handleStripeWebhook(makeReq(), res);
    expect(json).toHaveBeenCalledWith({ verified: true });
  });

  it("traite customer.subscription.deleted et repasse l'utilisateur en free", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_real_sub_deleted",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_test123",
        },
      },
    });

    const { res, json } = makeRes();
    await handleStripeWebhook(makeReq(), res);

    expect(updateUserByStripeCustomerId).toHaveBeenCalledWith(
      "cus_test123",
      expect.objectContaining({ plan: "free" })
    );
    expect(json).toHaveBeenCalledWith({ received: true });
  });

  it("traite invoice.paid et réinitialise les crédits pour un utilisateur starter", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_real_invoice_paid",
      type: "invoice.paid",
      data: {
        object: {
          customer: "cus_starter123",
        },
      },
    });

    (getUserByStripeCustomerId as any).mockResolvedValue({
      id: 2,
      plan: "starter",
      creditsUsed: 15,
    });

    const { res, json } = makeRes();
    await handleStripeWebhook(makeReq(), res);

    expect(updateUserByStripeCustomerId).toHaveBeenCalledWith(
      "cus_starter123",
      expect.objectContaining({ creditsUsed: 0 })
    );
    expect(json).toHaveBeenCalledWith({ received: true });
  });

  it("retourne { received: true } pour un event non géré", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_real_unknown",
      type: "payment_method.attached",
      data: { object: {} },
    });

    const { res, json } = makeRes();
    await handleStripeWebhook(makeReq(), res);
    expect(json).toHaveBeenCalledWith({ received: true });
  });
});
