import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  getUserById: vi.fn(),
  updateUserPlan: vi.fn(),
}));

vi.mock("./stripe/client", () => ({
  getStripe: vi.fn(() => ({
    customers: { create: vi.fn().mockResolvedValue({ id: "cus_test123" }) },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/test" }),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/portal" }),
      },
    },
  })),
}));

import { appRouter } from "./routers";
import { getUserById } from "./db";

function makeCtx(userOverrides: Record<string, unknown> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      plan: "free",
      creditsUsed: 0,
      creditsReset: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...userOverrides,
    } as any,
    req: { protocol: "https", headers: { origin: "https://example.com" } } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

describe("subscription.getMyPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne le plan free avec 3 crédits restants pour un utilisateur neuf", async () => {
    (getUserById as any).mockResolvedValue({
      id: 1,
      plan: "free",
      creditsUsed: 0,
      creditsReset: null,
      stripeCurrentPeriodEnd: null,
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.subscription.getMyPlan();

    expect(result.plan).toBe("free");
    expect(result.planName).toBe("Gratuit");
    expect(result.creditsUsed).toBe(0);
    expect(result.creditsRemaining).toBe(3);
    expect(result.unlimited).toBe(false);
    expect(result.watermark).toBe(true);
  });

  it("retourne les crédits restants corrects après utilisation pour le plan free", async () => {
    (getUserById as any).mockResolvedValue({
      id: 1,
      plan: "free",
      creditsUsed: 2,
      creditsReset: null,
      stripeCurrentPeriodEnd: null,
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.subscription.getMyPlan();

    expect(result.creditsUsed).toBe(2);
    expect(result.creditsRemaining).toBe(1);
  });

  it("retourne le plan starter avec 20 crédits mensuels", async () => {
    (getUserById as any).mockResolvedValue({
      id: 1,
      plan: "starter",
      creditsUsed: 5,
      creditsReset: new Date(Date.now() + 86400000),
      stripeCurrentPeriodEnd: new Date(Date.now() + 2592000000),
    });

    const caller = appRouter.createCaller(makeCtx({ plan: "starter" } as any));
    const result = await caller.subscription.getMyPlan();

    expect(result.plan).toBe("starter");
    expect(result.planName).toBe("Starter");
    expect(result.creditsUsed).toBe(5);
    expect(result.creditsRemaining).toBe(15); // 20 - 5
    expect(result.unlimited).toBe(false);
    expect(result.watermark).toBe(false);
  });

  it("retourne le plan pro avec crédits illimités", async () => {
    (getUserById as any).mockResolvedValue({
      id: 1,
      plan: "pro",
      creditsUsed: 50,
      creditsReset: null,
      stripeCurrentPeriodEnd: new Date(Date.now() + 2592000000),
    });

    const caller = appRouter.createCaller(makeCtx({ plan: "pro" } as any));
    const result = await caller.subscription.getMyPlan();

    expect(result.plan).toBe("pro");
    expect(result.planName).toBe("Pro");
    expect(result.unlimited).toBe(true);
    expect(result.creditsRemaining).toBeNull();
    expect(result.watermark).toBe(false);
  });

  it("lève une erreur si l'utilisateur est introuvable en base", async () => {
    (getUserById as any).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.subscription.getMyPlan()).rejects.toThrow();
  });
});
