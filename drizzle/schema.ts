import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),

  // Credits PayPal
  creditsBalance: int("creditsBalance").default(3).notNull(), // 3 crédits gratuits au départ

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Ebooks ───────────────────────────────────────────────────────────────────
export const ebooks = mysqlTable("ebooks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  title: varchar("title", { length: 512 }).notNull(),
  subject: text("subject").notNull(),
  chapterCount: int("chapterCount").notNull().default(5),
  language: varchar("language", { length: 64 }).notNull().default("Français"),
  tone: mysqlEnum("tone", ["professional", "casual", "academic", "creative", "motivational"])
    .notNull()
    .default("professional"),

  status: mysqlEnum("status", ["pending", "generating", "completed", "error"])
    .notNull()
    .default("pending"),

  pdfKey: varchar("pdfKey", { length: 512 }), // clé S3
  pdfUrl: varchar("pdfUrl", { length: 1024 }), // URL publique

  hasWatermark: boolean("hasWatermark").default(false).notNull(),
  errorMessage: text("errorMessage"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Ebook = typeof ebooks.$inferSelect;
export type InsertEbook = typeof ebooks.$inferInsert;

// ─── Chapters ─────────────────────────────────────────────────────────────────
export const chapters = mysqlTable("chapters", {
  id: int("id").autoincrement().primaryKey(),
  ebookId: int("ebookId").notNull(),
  chapterNumber: int("chapterNumber").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = typeof chapters.$inferInsert;

// ─── Transactions (PayPal) ────────────────────────────────────────────────────
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  // PayPal info
  paypalTransactionId: varchar("paypalTransactionId", { length: 256 }).unique(),
  paypalOrderId: varchar("paypalOrderId", { length: 256 }),

  // Pack info
  packType: mysqlEnum("packType", ["starter", "pro", "unlimited"]).notNull(),
  amount: varchar("amount", { length: 10 }).notNull(),
  creditsAdded: int("creditsAdded").notNull(),

  // Status
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"])
    .notNull()
    .default("pending"),

  // Expiry (for unlimited pack)
  expiresAt: timestamp("expiresAt"),
  isRenewed: boolean("isRenewed").default(false).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
