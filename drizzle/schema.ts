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

  // Personnalisation
  primaryColor: varchar("primaryColor", { length: 7 }).default("#7c3aed").notNull(), // Hex color
  fontFamily: varchar("fontFamily", { length: 64 }).default("inter").notNull(), // inter, playfair, merriweather
  coverImageUrl: varchar("coverImageUrl", { length: 1024 }), // URL de l'image de couverture
  autoStyle: boolean("autoStyle").default(true).notNull(), // Mode automatique activé?

  // Styles de couverture
  coverStyle: varchar("coverStyle", { length: 64 }).default("modern").notNull(),
  coverBackgroundColor: varchar("coverBackgroundColor", { length: 7 }).default("#1a1a2e").notNull(),

  // Arriere-plans
  pageBackgroundStyle: varchar("pageBackgroundStyle", { length: 64 }).default("solid").notNull(),
  pageBackgroundColor: varchar("pageBackgroundColor", { length: 7 }).default("#ffffff").notNull(),
  pageAccentColor: varchar("pageAccentColor", { length: 7 }).default("#7c3aed").notNull(),

  // Mise en page
  pageLayout: varchar("pageLayout", { length: 64 }).default("single").notNull(),
  marginSize: varchar("marginSize", { length: 64 }).default("normal").notNull(),
  lineHeight: varchar("lineHeight", { length: 64 }).default("1.5").notNull(),

  // Watermark
  watermarkText: varchar("watermarkText", { length: 256 }),
  watermarkOpacity: int("watermarkOpacity").default(20).notNull(),

  // Numerotation
  pageNumberingStyle: varchar("pageNumberingStyle", { length: 64 }).default("arabic").notNull(),
  pageNumberingPosition: varchar("pageNumberingPosition", { length: 64 }).default("bottom-center").notNull(),

  // En-tetes et pieds de page
  headerText: varchar("headerText", { length: 256 }),
  footerText: varchar("footerText", { length: 256 }),
  showChapterTitlesInHeader: boolean("showChapterTitlesInHeader").default(false).notNull(),

  // Favoris et partage
  isFavorite: boolean("isFavorite").default(false).notNull(),
  shareToken: varchar("shareToken", { length: 64 }).unique(), // Token unique pour partage public
  isPublic: boolean("isPublic").default(false).notNull(), // Ebook public via lien de partage

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

// ─── PayPal Config ────────────────────────────────────────────────────────────
export const paypalConfig = mysqlTable("paypalConfig", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // Un seul config par utilisateur (owner)
  
  // PayPal API credentials (chiffrées en base)
  clientId: text("clientId").notNull(),
  clientSecret: text("clientSecret").notNull(),
  
  // Mode (sandbox ou live)
  mode: mysqlEnum("mode", ["sandbox", "live"]).notNull().default("sandbox"),
  
  // Webhook ID
  webhookId: varchar("webhookId", { length: 256 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaypalConfig = typeof paypalConfig.$inferSelect;
export type InsertPaypalConfig = typeof paypalConfig.$inferInsert;
