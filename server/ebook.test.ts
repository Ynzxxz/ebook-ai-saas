import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ─────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getUserById: vi.fn(),
  createEbook: vi.fn().mockResolvedValue(42),
  getEbookById: vi.fn(),
  getEbooksByUserId: vi.fn().mockResolvedValue([]),
  getEbookWithChapters: vi.fn(),
  updateEbook: vi.fn(),
  createChapter: vi.fn(),
  incrementUserCredits: vi.fn(),
}));

vi.mock("./pdfService", () => ({
  generateEbookPdf: vi.fn().mockResolvedValue({ key: "ebooks/42/ebook-42.pdf", url: "/manus-storage/ebooks/42/ebook-42.pdf" }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { appRouter } from "./routers";
import { getUserById, createEbook } from "./db";

function makeCtx(user: Partial<TrpcContext["user"]> = {}): TrpcContext {
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
      ...user,
    } as any,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

describe("ebook.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crée un ebook pour un utilisateur free avec crédits disponibles", async () => {
    (getUserById as any).mockResolvedValue({
      id: 1,
      plan: "free",
      creditsUsed: 0,
      creditsReset: null,
    });

    const caller = appRouter.createCaller(makeCtx({ plan: "free" } as any));
    const result = await caller.ebook.create({
      title: "Test Ebook",
      subject: "Test subject",
      chapterCount: 3,
      language: "Français",
      tone: "professional",
    });

    expect(result).toEqual({ ebookId: 42 });
    expect(createEbook).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Test Ebook",
        hasWatermark: true, // plan free → filigrane
      })
    );
  });

  it("rejette la création si l'utilisateur free a atteint sa limite de 3 ebooks", async () => {
    (getUserById as any).mockResolvedValue({
      id: 1,
      plan: "free",
      creditsUsed: 3,
      creditsReset: null,
    });

    const caller = appRouter.createCaller(makeCtx({ plan: "free" } as any));

    await expect(
      caller.ebook.create({
        title: "Test Ebook",
        subject: "Test subject",
        chapterCount: 3,
        language: "Français",
        tone: "professional",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("rejette si le nombre de chapitres dépasse la limite du plan", async () => {
    (getUserById as any).mockResolvedValue({
      id: 1,
      plan: "free",
      creditsUsed: 0,
      creditsReset: null,
    });

    const caller = appRouter.createCaller(makeCtx({ plan: "free" } as any));

    await expect(
      caller.ebook.create({
        title: "Test Ebook",
        subject: "Test subject",
        chapterCount: 10, // free max = 5
        language: "Français",
        tone: "professional",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("crée un ebook sans filigrane pour un utilisateur starter", async () => {
    (getUserById as any).mockResolvedValue({
      id: 1,
      plan: "starter",
      creditsUsed: 5,
      creditsReset: new Date(Date.now() + 86400000), // tomorrow
    });

    const caller = appRouter.createCaller(makeCtx({ plan: "starter" } as any));
    const result = await caller.ebook.create({
      title: "Starter Ebook",
      subject: "Test subject",
      chapterCount: 10,
      language: "Français",
      tone: "casual",
    });

    expect(result).toEqual({ ebookId: 42 });
    expect(createEbook).toHaveBeenCalledWith(
      expect.objectContaining({
        hasWatermark: false, // plan starter → pas de filigrane
      })
    );
  });

  it("crée un ebook sans filigrane pour un utilisateur pro avec chapitres max", async () => {
    (getUserById as any).mockResolvedValue({
      id: 1,
      plan: "pro",
      creditsUsed: 100,
      creditsReset: null,
    });

    const caller = appRouter.createCaller(makeCtx({ plan: "pro" } as any));
    const result = await caller.ebook.create({
      title: "Pro Ebook",
      subject: "Test subject",
      chapterCount: 30, // pro max = 30
      language: "English",
      tone: "academic",
    });

    expect(result).toEqual({ ebookId: 42 });
    expect(createEbook).toHaveBeenCalledWith(
      expect.objectContaining({
        hasWatermark: false,
        chapterCount: 30,
      })
    );
  });

  it("rejette si l'utilisateur starter a atteint sa limite mensuelle", async () => {
    (getUserById as any).mockResolvedValue({
      id: 1,
      plan: "starter",
      creditsUsed: 20,
      creditsReset: new Date(Date.now() + 86400000), // tomorrow — not reset yet
    });

    const caller = appRouter.createCaller(makeCtx({ plan: "starter" } as any));

    await expect(
      caller.ebook.create({
        title: "Test Ebook",
        subject: "Test subject",
        chapterCount: 5,
        language: "Français",
        tone: "professional",
      })
    ).rejects.toThrow(TRPCError);
  });
});

describe("ebook.list", () => {
  it("retourne la liste des ebooks de l'utilisateur", async () => {
    const mockEbooks = [
      { id: 1, userId: 1, title: "Ebook 1", status: "completed" },
      { id: 2, userId: 1, title: "Ebook 2", status: "generating" },
    ];
    const { getEbooksByUserId } = await import("./db");
    (getEbooksByUserId as any).mockResolvedValue(mockEbooks);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.ebook.list();

    expect(result).toEqual(mockEbooks);
  });
});
