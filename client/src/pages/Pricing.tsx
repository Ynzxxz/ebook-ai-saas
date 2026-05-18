import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const PACKS = [
  {
    key: "starter" as const,
    name: "Pack Starter",
    price: "5€",
    generations: "5 générations",
    desc: "Parfait pour commencer",
    features: [
      "5 générations d'ebooks",
      "Export PDF de qualité",
      "Jusqu'à 30 chapitres par ebook",
      "Toutes les langues",
      "Valide 30 jours après achat",
    ],
    cta: "Acheter maintenant",
    highlight: false,
    badge: null,
    icon: Sparkles,
    color: "text-blue-400",
    paypalLink: "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=YOUR_PAYPAL_EMAIL&item_name=Pack%20Starter%205%20generations&amount=5.00&currency_code=EUR&return=https://ebookai.manus.space/dashboard&cancel_return=https://ebookai.manus.space/pricing",
  },
  {
    key: "pro" as const,
    name: "Pack Pro",
    price: "15€",
    generations: "20 générations",
    desc: "Pour les créateurs réguliers",
    features: [
      "20 générations d'ebooks",
      "Export PDF de qualité",
      "Jusqu'à 30 chapitres par ebook",
      "Toutes les langues",
      "Valide 30 jours après achat",
    ],
    cta: "Acheter maintenant",
    highlight: true,
    badge: "Populaire",
    icon: Zap,
    color: "text-yellow-400",
    paypalLink: "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=YOUR_PAYPAL_EMAIL&item_name=Pack%20Pro%2020%20generations&amount=15.00&currency_code=EUR&return=https://ebookai.manus.space/dashboard&cancel_return=https://ebookai.manus.space/pricing",
  },
  {
    key: "unlimited" as const,
    name: "Pack Illimité",
    price: "25€",
    generations: "Illimité 30j",
    desc: "Pour les professionnels",
    features: [
      "Générations illimitées pendant 30 jours",
      "Export PDF de qualité",
      "Jusqu'à 30 chapitres par ebook",
      "Toutes les langues",
      "Valide 30 jours après achat",
    ],
    cta: "Acheter maintenant",
    highlight: false,
    badge: null,
    icon: Crown,
    color: "text-purple-400",
    paypalLink: "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=YOUR_PAYPAL_EMAIL&item_name=Pack%20Illimite%2030%20jours&amount=25.00&currency_code=EUR&return=https://ebookai.manus.space/dashboard&cancel_return=https://ebookai.manus.space/pricing",
  },
];

export default function Pricing() {
  const { isAuthenticated } = useAuth();

  const handlePackClick = (paypalLink: string) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    toast.info("Redirection vers PayPal...");
    window.open(paypalLink, "_blank");
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-32 pb-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Packs de Générations</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choisissez le pack qui vous convient et commencez à générer vos ebooks dès maintenant.
            </p>
          </motion.div>

          {/* Free tier info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-12 p-6 bg-card rounded-lg border border-border text-center"
          >
            <p className="text-sm text-muted-foreground mb-2">Vous avez accès à</p>
            <p className="text-2xl font-bold text-accent">3 générations gratuites</p>
            <p className="text-sm text-muted-foreground mt-2">Pas de carte bancaire requise</p>
          </motion.div>

          {/* Pricing cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {PACKS.map((pack, idx) => {
              const Icon = pack.icon;
              return (
                <motion.div
                  key={pack.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + idx * 0.1 }}
                  className={`relative rounded-lg border transition-all duration-300 ${
                    pack.highlight
                      ? "border-accent bg-accent/5 md:scale-105 shadow-lg shadow-accent/20"
                      : "border-border bg-card hover:border-accent/50"
                  }`}
                >
                  {pack.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-accent text-white">{pack.badge}</Badge>
                    </div>
                  )}

                  <div className="p-8">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <Icon className={`w-6 h-6 ${pack.color}`} />
                      <h3 className="text-2xl font-bold">{pack.name}</h3>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-4xl font-bold">{pack.price}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{pack.generations}</p>
                      <p className="text-sm text-muted-foreground mt-1">{pack.desc}</p>
                    </div>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handlePackClick(pack.paypalLink)}
                      className={`w-full mb-8 ${
                        pack.highlight
                          ? "bg-accent hover:bg-accent/90 text-white"
                          : "bg-primary hover:bg-primary/90 text-white"
                      }`}
                    >
                      {pack.cta}
                    </Button>

                    {/* Features */}
                    <div className="space-y-3">
                      {pack.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="max-w-2xl mx-auto"
          >
            <h2 className="text-2xl font-bold mb-8 text-center">Questions fréquentes</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Comment fonctionne le système de crédits ?</h3>
                <p className="text-sm text-muted-foreground">
                  Chaque génération d'ebook consomme 1 crédit. Vous pouvez acheter des packs pour ajouter des crédits à votre compte.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Mes crédits expirent-ils ?</h3>
                <p className="text-sm text-muted-foreground">
                  Les crédits achetés restent valides pendant 30 jours après l'achat. Passé ce délai, ils sont supprimés.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Puis-je annuler mon achat ?</h3>
                <p className="text-sm text-muted-foreground">
                  Oui, vous pouvez demander un remboursement dans les 14 jours suivant votre achat. Contactez notre support.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Quels moyens de paiement acceptez-vous ?</h3>
                <p className="text-sm text-muted-foreground">
                  Nous acceptons PayPal, qui supporte les cartes de crédit, les portefeuilles numériques et les virements bancaires.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
