import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import {
  BookOpen, Sparkles, Zap, Shield, Download, Globe,
  Check, ArrowRight, Layers, Brain
} from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.23, 1, 0.32, 1] as const },
  }),
};

const FEATURES = [
  { icon: Brain, title: "IA Claude Sonnet", desc: "Génération de contenu de haute qualité chapitre par chapitre avec Claude, le modèle le plus avancé d Anthropic." },
  { icon: Layers, title: "Structure intelligente", desc: "Plan automatique, table des matières, chapitres cohérents et bien structurés pour chaque ebook." },
  { icon: Globe, title: "Multilingue", desc: "Générez vos ebooks en français, anglais, espagnol, allemand et bien d autres langues." },
  { icon: Download, title: "Export PDF", desc: "Téléchargez votre ebook en PDF avec une mise en page professionnelle et soignée." },
  { icon: Zap, title: "Génération rapide", desc: "Un ebook complet en quelques minutes. Définissez le sujet, le ton et laissez l IA faire le reste." },
  { icon: Shield, title: "Sécurisé et privé", desc: "Vos ebooks sont stockés de manière sécurisée et ne sont accessibles qu à vous." },
];

const PLANS = [
  { key: "free", name: "Gratuit", price: "0€", period: "", desc: "Pour découvrir la plateforme", features: ["3 ebooks au total", "Export PDF avec filigrane", "Tous les chapitres", "Toutes les langues"], cta: "Commencer gratuitement", highlight: false, badge: null },
  { key: "starter", name: "Starter", price: "5€", period: "", desc: "5 générations d'ebook", features: ["5 ebooks", "Export PDF sans filigrane", "Tous les chapitres", "Paiement unique"], cta: "Acheter Starter", highlight: true, badge: "Populaire" },
  { key: "pro", name: "Pro", price: "15€", period: "", desc: "20 générations d'ebook", features: ["20 ebooks", "Export PDF sans filigrane", "Tous les chapitres", "Paiement unique"], cta: "Acheter Pro", highlight: false, badge: null },
  { key: "unlimited", name: "Illimité", price: "25€", period: "/30j", desc: "Générations illimitées pendant 30 jours", features: ["Ebooks illimités", "Export PDF sans filigrane", "Tous les chapitres", "Valide 30 jours"], cta: "Acheter Illimité", highlight: false, badge: "Meilleur rapport" },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/10 blur-[120px]" />
        </div>
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
              <Badge className="mb-6 bg-primary/15 text-primary border-primary/30 px-4 py-1.5 text-sm">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Propulsé par Claude Sonnet
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1} className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight">
              Créez des ebooks <span className="gradient-text">professionnels</span><br />en quelques minutes
            </motion.h1>
            <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={2} className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Entrez un sujet, choisissez le nombre de chapitres et laissez notre IA générer un ebook complet, structuré et prêt à télécharger.
            </motion.p>
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Button size="lg" className="bg-primary hover:bg-primary/90 glow-violet text-lg px-8 h-14 gap-2" onClick={() => navigate("/generate")}>
                  <Sparkles className="w-5 h-5" />Créer mon premier ebook<ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button size="lg" className="bg-primary hover:bg-primary/90 glow-violet text-lg px-8 h-14 gap-2" asChild>
                  <a href={getLoginUrl()}><Sparkles className="w-5 h-5" />Commencer gratuitement<ArrowRight className="w-4 h-4" /></a>
                </Button>
              )}
              <Button size="lg" variant="outline" className="text-lg px-8 h-14 border-border/60" onClick={() => navigate("/pricing")}>Voir les tarifs</Button>
            </motion.div>
            <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={4} className="mt-6 text-sm text-muted-foreground">
              3 ebooks gratuits — Aucune carte bancaire requise
            </motion.p>
          </div>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5} className="mt-16 max-w-3xl mx-auto">
            <div className="glass-card p-6 gradient-border">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/70" /><div className="w-3 h-3 rounded-full bg-yellow-500/70" /><div className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="ml-2 text-xs text-muted-foreground font-mono">EbookAI Studio</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                  <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center"><BookOpen className="w-4 h-4 text-primary" /></div>
                  <div className="flex-1"><div className="text-sm font-medium">Le Guide Complet du Marketing Digital</div><div className="text-xs text-muted-foreground">10 chapitres · Français · Professionnel</div></div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Complété</Badge>
                </div>
                <div className="flex gap-2">
                  {["Introduction", "Stratégie SEO", "Réseaux sociaux", "Email"].map((ch, i) => (
                    <div key={ch} className="flex-1 p-2 rounded-md bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Ch. {i + 1}</div><div className="text-xs font-medium mt-0.5 truncate">{ch}</div></div>
                  ))}
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-xs text-primary">Génération en cours... Chapitre 5/10</span>
                  <div className="flex-1 h-1.5 bg-primary/20 rounded-full overflow-hidden ml-2"><div className="h-full w-1/2 bg-primary rounded-full" /></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-16">
            <Badge className="mb-4 bg-primary/15 text-primary border-primary/30">Fonctionnalités</Badge>
            <h2 className="text-4xl font-display font-bold mb-4">Tout ce dont vous avez besoin</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Une plateforme complète pour créer, personnaliser et exporter vos ebooks professionnels.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.5 }} className="glass-card p-6 hover:border-primary/30 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors"><f.icon className="w-5 h-5 text-primary" /></div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 relative" id="pricing">
        <div className="container relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-16">
            <Badge className="mb-4 bg-primary/15 text-primary border-primary/30">Tarifs</Badge>
            <h2 className="text-4xl font-display font-bold mb-4">Simple et transparent</h2>
            <p className="text-muted-foreground text-lg">Commencez gratuitement, évoluez selon vos besoins.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {PLANS.map((plan, i) => (
              <motion.div key={plan.key} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }} className={"relative glass-card p-8 flex flex-col " + (plan.highlight ? "border-primary/50 glow-violet" : "")}>
                {plan.badge && (<div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge className="bg-primary text-primary-foreground px-3 py-1">{plan.badge}</Badge></div>)}
                <div className="mb-6">
                  <h3 className="font-display font-bold text-xl mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.desc}</p>
                  <div className="flex items-baseline gap-1"><span className="text-4xl font-display font-bold">{plan.price}</span><span className="text-muted-foreground">{plan.period}</span></div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat) => (<li key={feat} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary flex-shrink-0" /><span className="text-foreground/80">{feat}</span></li>))}
                </ul>
                <Button className={"w-full " + (plan.highlight ? "bg-primary hover:bg-primary/90 glow-violet" : "")} variant={plan.highlight ? "default" : "outline"} asChild>
                  <a href={isAuthenticated ? "/dashboard" : getLoginUrl()}>{plan.cta}</a>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="glass-card gradient-border p-12 text-center max-w-3xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6 animate-pulse-glow"><Sparkles className="w-8 h-8 text-primary" /></div>
            <h2 className="text-4xl font-display font-bold mb-4">Prêt à créer votre premier ebook ?</h2>
            <p className="text-muted-foreground text-lg mb-8">Rejoignez des créateurs qui utilisent EbookAI Studio pour produire du contenu de qualité.</p>
            <Button size="lg" className="bg-primary hover:bg-primary/90 glow-violet text-lg px-10 h-14 gap-2" asChild>
              <a href={isAuthenticated ? "/generate" : getLoginUrl()}><Sparkles className="w-5 h-5" />Commencer maintenant — C est gratuit<ArrowRight className="w-4 h-4" /></a>
            </Button>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-12">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center"><BookOpen className="w-3 h-3 text-primary-foreground" /></div><span className="font-display font-bold text-sm">EbookAI Studio</span></div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} EbookAI Studio. Tous droits réservés.</p>
          <div className="flex gap-4 text-sm text-muted-foreground"><a href="/pricing" className="hover:text-foreground transition-colors">Tarifs</a><a href={getLoginUrl()} className="hover:text-foreground transition-colors">Connexion</a></div>
        </div>
      </footer>
    </div>
  );
}
