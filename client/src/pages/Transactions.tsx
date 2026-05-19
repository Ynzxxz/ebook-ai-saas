import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Loader2, ShoppingCart, Calendar, DollarSign, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const PACK_LABELS = {
  starter: { name: "Starter", credits: 5, color: "text-blue-400" },
  pro: { name: "Pro", credits: 20, color: "text-yellow-400" },
  unlimited: { name: "Illimité 30j", credits: "∞", color: "text-purple-400" },
};

const STATUS_CONFIG = {
  pending: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400" },
  completed: { label: "Complété", color: "bg-green-500/20 text-green-400" },
  failed: { label: "Échoué", color: "bg-red-500/20 text-red-400" },
  refunded: { label: "Remboursé", color: "bg-gray-500/20 text-gray-400" },
};

export default function Transactions() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: transactions, isLoading } = trpc.ebook.getTransactions.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

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

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-12">
        <div className="container max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="mb-6 gap-2 text-muted-foreground"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au dashboard
            </Button>

            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold">Historique des transactions</h1>
                <p className="text-sm text-muted-foreground">Tous vos achats de crédits</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : transactions && transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx: any, idx: number) => {
                  const packInfo = PACK_LABELS[tx.packType as keyof typeof PACK_LABELS];
                  const statusConfig = STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG];

                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                    >
                      <Card className="glass-card border-border/50 hover:border-accent/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Zap className={`w-5 h-5 ${packInfo.color}`} />
                                <h3 className="font-semibold">{packInfo.name}</h3>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(tx.createdAt), "d MMM yyyy", { locale: fr })}
                                </div>
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4" />
                                  {tx.amount}€
                                </div>
                              </div>
                              {tx.expiresAt && (
                                <div className="text-xs text-muted-foreground mt-2">
                                  Expire le {format(new Date(tx.expiresAt), "d MMM yyyy", { locale: fr })}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-3">
                              <div className={`px-3 py-1 rounded text-xs font-medium border ${statusConfig?.color}`}>
                                {statusConfig?.label}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-accent">
                                  +{tx.creditsAdded === 999999 ? "∞" : tx.creditsAdded}
                                </div>
                                <div className="text-xs text-muted-foreground">crédits</div>
                              </div>
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
                  <ShoppingCart className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Aucune transaction pour le moment</p>
                  <Button
                    onClick={() => navigate("/pricing")}
                    className="bg-primary hover:bg-primary/90 gap-2"
                  >
                    Acheter des crédits
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
