import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import {
  BookOpen, Sparkles, Download, Clock, CheckCircle2,
  AlertCircle, Loader2, Plus, Crown, Zap, ArrowRight, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useEffect } from "react";

const STATUS_CONFIG = {
  pending: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  generating: { label: "En cours", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Loader2 },
  completed: { label: "Complété", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle2 },
  error: { label: "Erreur", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertCircle },
};

const PLAN_ICONS = { free: Sparkles, starter: Zap, pro: Crown };
const PLAN_COLORS = { free: "text-muted-foreground", starter: "text-blue-400", pro: "text-yellow-400" };

export default function Dashboard() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: planInfo, isLoading: planLoading, refetch: refetchPlan } = trpc.subscription.getMyPlan.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: ebooks, isLoading: ebooksLoading, refetch: refetchEbooks } = trpc.ebook.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const checkoutMutation = trpc.subscription.createCheckout.useMutation({
    onSuccess: ({ url }) => {
      if (url) window.open(url, "_blank");
    },
    onError: (err) => toast.error(err.message),
  });

  const portalMutation = trpc.subscription.createPortal.useMutation({
    onSuccess: ({ url }) => { window.open(url, "_blank"); },
    onError: (err) => toast.error(err.message),
  });

  // Check for checkout success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast.success("Abonnement activé avec succès !");
      setTimeout(() => { refetchPlan(); refetchEbooks(); }, 2000);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connexion requise</h2>
          <Button asChild className="bg-primary"><a href={getLoginUrl()}>Se connecter</a></Button>
        </div>
      </div>
    );
  }

  const plan = planInfo?.plan ?? "free";
  const PlanIcon = PLAN_ICONS[plan] || Sparkles;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-12">
        <div className="container">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="text-3xl font-display font-bold">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Gérez vos ebooks et votre abonnement</p>
            </div>
            <Button
              className="bg-primary hover:bg-primary/90 glow-violet gap-2"
              onClick={() => navigate("/generate")}
            >
              <Plus className="w-4 h-4" />
              Nouvel ebook
            </Button>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          >
            {/* Plan Card */}
            <Card className="glass-card border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Plan actuel</span>
                  <PlanIcon className={`w-4 h-4 ${PLAN_COLORS[plan]}`} />
                </div>
                <div className="text-2xl font-display font-bold capitalize">{planInfo?.planName ?? "Gratuit"}</div>
                {plan !== "pro" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 p-0 h-auto text-primary hover:text-primary/80 text-xs gap-1"
                    onClick={() => checkoutMutation.mutate({ planKey: plan === "free" ? "starter" : "pro" })}
                    disabled={checkoutMutation.isPending}
                  >
                    {checkoutMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                    Passer au plan {plan === "free" ? "Starter" : "Pro"}
                  </Button>
                )}
                {plan !== "free" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 p-0 h-auto text-muted-foreground hover:text-foreground text-xs gap-1"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                  >
                    Gérer l'abonnement
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Credits Card */}
            <Card className="glass-card border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Ebooks générés</span>
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-display font-bold">{planInfo?.creditsUsed ?? 0}</div>
                {planInfo?.creditsRemaining !== null && planInfo?.creditsRemaining !== undefined ? (
                  <p className="text-xs text-muted-foreground mt-1">{planInfo.creditsRemaining} restant{planInfo.creditsRemaining > 1 ? "s" : ""}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Illimité</p>
                )}
              </CardContent>
            </Card>

            {/* Quick action */}
            <Card
              className="glass-card border-primary/20 cursor-pointer hover:border-primary/40 transition-all duration-200 group"
              onClick={() => navigate("/generate")}
            >
              <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full min-h-[100px]">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-3 group-hover:bg-primary/25 transition-colors">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium">Créer un ebook</span>
                <span className="text-xs text-muted-foreground mt-1">Nouveau projet</span>
              </CardContent>
            </Card>
          </motion.div>

          {/* Ebooks List */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-semibold">Mes ebooks</h2>
              <Button variant="ghost" size="sm" onClick={() => refetchEbooks()} className="gap-1 text-muted-foreground">
                <RefreshCw className="w-3.5 h-3.5" />
                Actualiser
              </Button>
            </div>

            {ebooksLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !ebooks || ebooks.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-primary/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Aucun ebook pour l'instant</h3>
                <p className="text-muted-foreground text-sm mb-6">Créez votre premier ebook en quelques minutes</p>
                <Button className="bg-primary gap-2" onClick={() => navigate("/generate")}>
                  <Plus className="w-4 h-4" />
                  Créer mon premier ebook
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {ebooks.map((ebook, i) => {
                  const status = STATUS_CONFIG[ebook.status] || STATUS_CONFIG.pending;
                  const StatusIcon = status.icon;
                  return (
                    <motion.div
                      key={ebook.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      className="glass-card p-4 flex items-center gap-4 hover:border-border/80 transition-all duration-200 cursor-pointer group"
                      onClick={() => navigate(`/ebook/${ebook.id}`)}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate group-hover:text-primary transition-colors">{ebook.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {ebook.chapterCount} chapitres · {ebook.language} · {new Date(ebook.createdAt).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge className={`text-xs ${status.color}`}>
                          <StatusIcon className={`w-3 h-3 mr-1 ${ebook.status === "generating" ? "animate-spin" : ""}`} />
                          {status.label}
                        </Badge>
                        {ebook.status === "completed" && ebook.pdfUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(ebook.pdfUrl!, "_blank");
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
