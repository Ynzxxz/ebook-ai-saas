import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { chapters, ebooks, InsertChapter, InsertEbook, InsertUser, users, transactions, InsertTransaction, paypalConfig, InsertPaypalConfig, PaypalConfig } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function addUserCredits(userId: number, amount: number) {
  const db = await getDb();
  if (!db) return;
  const user = await getUserById(userId);
  if (!user) return;
  await db.update(users).set({ creditsBalance: user.creditsBalance + amount }).where(eq(users.id, userId));
}

export async function deductUserCredits(userId: number, amount: number) {
  const db = await getDb();
  if (!db) return;
  const user = await getUserById(userId);
  if (!user) return;
  const newBalance = Math.max(0, user.creditsBalance - amount);
  await db.update(users).set({ creditsBalance: newBalance }).where(eq(users.id, userId));
}

export async function getUserCreditsBalance(userId: number) {
  const user = await getUserById(userId);
  return user?.creditsBalance ?? 0;
}

// ─── Ebooks ───────────────────────────────────────────────────────────────────

export async function createEbook(data: InsertEbook) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(ebooks).values(data);
  return (result[0] as any).insertId as number;
}

export async function getEbookById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(ebooks).where(eq(ebooks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getEbooksByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ebooks).where(eq(ebooks.userId, userId)).orderBy(desc(ebooks.createdAt));
}

export async function updateEbook(id: number, data: Partial<{
  status: "pending" | "generating" | "completed" | "error";
  pdfKey: string;
  pdfUrl: string;
  errorMessage: string;
  hasWatermark: boolean;
  primaryColor: string;
  fontFamily: string;
  coverImageUrl: string;
  autoStyle: boolean;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(ebooks).set(data).where(eq(ebooks.id, id));
}

// ─── Chapters ─────────────────────────────────────────────────────────────────

export async function createChapter(data: InsertChapter) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(chapters).values(data);
}

export async function getChaptersByEbookId(ebookId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chapters).where(eq(chapters.ebookId, ebookId)).orderBy(chapters.chapterNumber);
}

export async function getEbookWithChapters(ebookId: number) {
  const ebook = await getEbookById(ebookId);
  if (!ebook) return null;
  const chapterList = await getChaptersByEbookId(ebookId);
  return { ...ebook, chapters: chapterList };
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(transactions).values(data);
  return (result[0] as any).insertId as number;
}

export async function getTransactionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
}

export async function getTransactionByPayPalId(paypalTransactionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(transactions).where(eq(transactions.paypalTransactionId, paypalTransactionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateTransaction(id: number, data: Partial<{
  status: "pending" | "completed" | "failed" | "refunded";
  paypalTransactionId: string;
  paypalOrderId: string;
  isRenewed: boolean;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(transactions).set(data).where(eq(transactions.id, id));
}


// ─── PayPal Config ────────────────────────────────────────────────────────────

export async function getPaypalConfigByUserId(userId: number): Promise<PaypalConfig | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(paypalConfig).where(eq(paypalConfig.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertPaypalConfig(data: InsertPaypalConfig): Promise<PaypalConfig | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!data.userId) throw new Error("userId is required");
  
  const existing = await getPaypalConfigByUserId(data.userId);
  
  if (existing) {
    await db.update(paypalConfig).set(data).where(eq(paypalConfig.userId, data.userId));
    return getPaypalConfigByUserId(data.userId);
  } else {
    await db.insert(paypalConfig).values(data);
    return getPaypalConfigByUserId(data.userId);
  }
}
