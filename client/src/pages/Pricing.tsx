import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { Check, Sparkles, Zap, Crown, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

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
  },
];

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const createCheckoutMutation = trpc.paypal.createCheckoutLink.useMutation();

  const handlePackClick = async (packKey: string) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    setLoadingPack(packKey);
    try {
      const returnUrl = `${window.location.origin}/payment-success`;
      const result = await createCheckoutMutation.mutateAsync({
        pack: packKey as "starter" | "pro" | "unlimited",
        returnUrl,
      });

      if (result.url) {
        toast.info("Redirection vers PayPal...");
        // Rediriger vers PayPal dans la même fenêtre
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Erreur lors de la création du lien PayPal:", error);
      toast.error("Erreur lors de la création du lien de paiement. Veuillez réessayer.");
    } finally {
      setLoadingPack(null);
    }
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PACKS.map((pack, i) => (
              <motion.div
                key={pack.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`relative glass-card p-8 flex flex-col ${
                  pack.highlight ? "border-primary/50 glow-violet" : ""
                }`}
              >
                {pack.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">
                      {pack.badge}
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <pack.icon className={`w-5 h-5 ${pack.color}`} />
                    <h3 className="font-display font-bold text-xl">{pack.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{pack.desc}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-display font-bold">{pack.price}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{pack.generations}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {pack.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-foreground/80">{feat}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${pack.highlight ? "bg-primary hover:bg-primary/90 glow-violet" : ""}`}
                  variant={pack.highlight ? "default" : "outline"}
                  onClick={() => handlePackClick(pack.key)}
                  disabled={loadingPack === pack.key}
                >
                  {loadingPack === pack.key ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    pack.cta
                  )}
                </Button>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-16 text-center"
          >
            <p className="text-muted-foreground">
              Vous avez déjà 3 ebooks gratuits pour commencer.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
