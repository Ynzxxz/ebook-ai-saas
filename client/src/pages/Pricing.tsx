import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { Check, Sparkles, Zap, Crown, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const PLANS = [
  {
    key: "free" as const,
    name: "Gratuit",
    price: "0€",
    period: "",
    desc: "Pour découvrir la plateforme sans engagement",
    features: [
      "3 ebooks au total",
      "Export PDF avec filigrane",
      "5 chapitres maximum",
      "Toutes les langues",
      "Support communautaire",
    ],
    cta: "Commencer gratuitement",
    highlight: false,
    badge: null,
    icon: Sparkles,
    color: "text-muted-foreground",
  },
  {
    key: "starter" as const,
    name: "Starter",
    price: "9€",
    period: "/mois",
    desc: "Pour les créateurs de contenu réguliers",
    features: [
      "20 ebooks par mois",
      "Export PDF sans filigrane",
      "15 chapitres maximum",
      "Toutes les langues",
      "Support email",
      "Réinitialisation mensuelle",
    ],
    cta: "Choisir Starter",
    highlight: true,
    badge: "Populaire",
    icon: Zap,
    color: "text-blue-400",
  },
  {
    key: "pro" as const,
    name: "Pro",
    price: "29€",
    period: "/mois",
    desc: "Pour les professionnels et les équipes",
    features: [
      "Ebooks illimités",
      "Export PDF + EPUB",
      "30 chapitres maximum",
      "Toutes les langues",
      "Support prioritaire",
      "Accès anticipé aux nouvelles fonctionnalités",
    ],
    cta: "Choisir Pro",
    highlight: false,
    badge: null,
    icon: Crown,
    color: "text-yellow-400",
  },
];

export default function Pricing() {
  const { isAuthenticated } = useAuth();

  const checkoutMutation = trpc.subscription.createCheckout.useMutation({
    onSuccess: ({ url }) => {
      if (url) {
        toast.info("Redirection vers le paiement...");
        window.open(url, "_blank");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handlePlanClick = (planKey: "starter" | "pro") => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    checkoutMutation.mutate({ planKey });
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
            <Badge className="mb-4 bg-primary/15 text-primary border-primary/30 px-4 py-1.5">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Tarifs
            </Badge>
            <h1 className="text-5xl font-display font-bold mb-4">
              Choisissez votre plan
            </h1>
            <p className="text-muted-foreground text-xl max-w-xl mx-auto">
              Commencez gratuitement, évoluez selon vos besoins. Annulez à tout moment.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANS.map((plan, i) => {
              const PlanIcon = plan.icon;
              return (
                <motion.div
                  key={plan.key}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className={`relative glass-card p-8 flex flex-col ${plan.highlight ? "border-primary/50 glow-violet" : ""}`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-4 py-1">{plan.badge}</Badge>
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <PlanIcon className={`w-5 h-5 ${plan.color}`} />
                      <h3 className="font-display font-bold text-xl">{plan.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{plan.desc}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-display font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-lg">{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm">
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.key === "free" ? (
                    <Button
                      className={`w-full ${plan.highlight ? "bg-primary hover:bg-primary/90 glow-violet" : ""}`}
                      variant={plan.highlight ? "default" : "outline"}
                      asChild
                    >
                      <a href={isAuthenticated ? "/dashboard" : getLoginUrl()}>{plan.cta}</a>
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${plan.highlight ? "bg-primary hover:bg-primary/90 glow-violet" : ""}`}
                      variant={plan.highlight ? "default" : "outline"}
                      onClick={() => handlePlanClick(plan.key)}
                      disabled={checkoutMutation.isPending}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      {plan.cta}
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-20 max-w-2xl mx-auto"
          >
            <h2 className="text-2xl font-display font-bold text-center mb-8">Questions fréquentes</h2>
            <div className="space-y-4">
              {[
                { q: "Puis-je annuler mon abonnement ?", a: "Oui, vous pouvez annuler à tout moment depuis votre dashboard. Votre abonnement reste actif jusqu'à la fin de la période en cours." },
                { q: "Les ebooks générés m'appartiennent-ils ?", a: "Absolument. Tous les ebooks générés avec EbookAI Studio vous appartiennent entièrement." },
                { q: "Que se passe-t-il si je dépasse ma limite ?", a: "Vous serez notifié et pourrez passer à un plan supérieur pour continuer à générer des ebooks." },
                { q: "Quelle est la qualité du contenu généré ?", a: "Nous utilisons Claude Sonnet d'Anthropic, l'un des modèles les plus performants du marché, pour garantir un contenu de haute qualité." },
              ].map((item) => (
                <div key={item.q} className="glass-card p-5">
                  <h3 className="font-semibold mb-2">{item.q}</h3>
                  <p className="text-sm text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
