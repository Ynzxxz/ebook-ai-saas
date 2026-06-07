import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import {
  BookOpen, Sparkles, Download, Clock, CheckCircle2,
  AlertCircle, Loader2, Plus, Zap, ArrowRight, RefreshCw
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

export default function Dashboard() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: creditsData, isLoading: creditsLoading, refetch: refetchCredits } = trpc.ebook.getCreditsBalance.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: ebooks, isLoading: ebooksLoading, refetch: refetchEbooks } = trpc.ebook.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Check for payment success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      toast.success("Crédits ajoutés avec succès !");
      setTimeout(() => { refetchCredits(); }, 1000);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [refetchCredits]);

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

  const balance = creditsData?.balance ?? 0;

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
              <p className="text-muted-foreground mt-1">Créez et gérez vos ebooks illimités</p>
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
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
          >
            {/* Credits Card - Hidden for unlimited access */}

            {/* Ebooks Count Card */}
            <Card className="glass-card border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Ebooks créés</span>
                  <BookOpen className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-3xl font-display font-bold">{ebooks?.length ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Tous les ebooks</p>
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
              <h2 className="text-xl font-display font-bold">Mes ebooks</h2>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/settings/payment")}
                >
                  Configurer PayPal
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/transactions")}
                >
                  Historique
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchEbooks()}
                  disabled={ebooksLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${ebooksLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {ebooksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : ebooks && ebooks.length > 0 ? (
              <div className="space-y-3">
                {ebooks.map((ebook, idx) => {
                  const StatusIcon = STATUS_CONFIG[ebook.status as keyof typeof STATUS_CONFIG]?.icon || AlertCircle;
                  const statusConfig = STATUS_CONFIG[ebook.status as keyof typeof STATUS_CONFIG];

                  return (
                    <motion.div
                      key={ebook.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                    >
                      <Card className="glass-card border-border/50 hover:border-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/ebook/${ebook.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{ebook.title}</h3>
                              <p className="text-sm text-muted-foreground truncate">{ebook.subject}</p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className="text-xs bg-background px-2 py-1 rounded">
                                  {ebook.chapterCount} chapitres
                                </span>
                                <span className="text-xs bg-background px-2 py-1 rounded">
                                  {ebook.language}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${statusConfig?.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig?.label}
                              </div>
                              {ebook.status === "completed" && ebook.pdfUrl && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (ebook.pdfUrl) window.open(ebook.pdfUrl, "_blank");
                                  }}
                                >
                                  <Download className="w-3 h-3" />
                                  PDF
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <Card className="glass-card border-border/50">
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Aucun ebook créé pour le moment</p>
                  <Button
                    onClick={() => navigate("/generate")}
                    disabled={balance <= 0}
                    className="bg-primary hover:bg-primary/90 gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Créer votre premier ebook
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
