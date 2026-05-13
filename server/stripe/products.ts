// Stripe Products & Prices configuration
// Prix en centimes EUR

export const PLANS = {
  free: {
    name: "Gratuit",
    priceId: null,
    monthlyEbooks: 3,
    unlimited: false,
    watermark: true,
    features: [
      "3 ebooks gratuits",
      "Export PDF avec filigrane",
      "5 chapitres max",
    ],
  },
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_STARTER_PRICE_ID || "",
    monthlyEbooks: 20,
    unlimited: false,
    watermark: false,
    features: [
      "20 ebooks par mois",
      "Export PDF sans filigrane",
      "Jusqu'à 15 chapitres",
      "Support email",
    ],
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID || "",
    monthlyEbooks: Infinity,
    unlimited: true,
    watermark: false,
    features: [
      "Ebooks illimités",
      "Export PDF + EPUB",
      "Chapitres personnalisables",
      "Support prioritaire",
      "Accès anticipé aux nouvelles fonctionnalités",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export const PLAN_LIMITS = {
  free: { max: 3, maxChapters: 5 },
  starter: { max: 20, maxChapters: 15 },
  pro: { max: Infinity, maxChapters: 30 },
};
