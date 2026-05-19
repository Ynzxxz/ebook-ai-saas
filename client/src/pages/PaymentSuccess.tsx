import { useEffect, useState } from "react";
import { useSearchParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [, navigate] = useLocation();
  const [isCapturing, setIsCapturing] = useState(true);
  const [captureResult, setCaptureResult] = useState<{
    success: boolean;
    creditsAdded?: number;
    packType?: string;
    error?: string;
  } | null>(null);

  const captureOrderMutation = trpc.paypal.captureOrder.useMutation();
  const meQuery = trpc.auth.me.useQuery();

  useEffect(() => {
    const captureOrder = async () => {
      const orderId = searchParams.get("token");

      if (!orderId) {
        setCaptureResult({
          success: false,
          error: "ID de commande manquant",
        });
        setIsCapturing(false);
        return;
      }

      try {
        const result = await captureOrderMutation.mutateAsync({
          orderId,
        });

        setCaptureResult({
          success: true,
          creditsAdded: result.creditsAdded,
          packType: result.packType,
        });

        toast.success(`${result.creditsAdded} crédits ajoutés avec succès !`);

        // Invalider le cache pour mettre à jour le dashboard
        await meQuery.refetch();
      } catch (error) {
        console.error("Erreur lors de la capture:", error);
        setCaptureResult({
          success: false,
          error: "Erreur lors de la capture de la commande. Veuillez contacter le support.",
        });
        toast.error("Erreur lors de la capture de la commande");
      } finally {
        setIsCapturing(false);
      }
    };

    captureOrder();
  }, [searchParams, captureOrderMutation, meQuery]);

  const handleContinue = () => {
    window.location.href = "/generate";
  };

  const handleDashboard = () => {
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-32 pb-20">
        <div className="container max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-8 text-center">
              {isCapturing ? (
                <div className="space-y-4">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                  <h2 className="text-2xl font-bold">Traitement du paiement...</h2>
                  <p className="text-muted-foreground">
                    Veuillez patienter pendant que nous finalisons votre commande.
                  </p>
                </div>
              ) : captureResult?.success ? (
                <div className="space-y-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
                  </motion.div>

                  <div>
                    <h2 className="text-2xl font-bold mb-2">Paiement réussi !</h2>
                    <p className="text-muted-foreground">
                      Votre commande a été traitée avec succès.
                    </p>
                  </div>

                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2">Crédits reçus</p>
                    <p className="text-3xl font-bold text-primary">
                      +{captureResult.creditsAdded}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 capitalize">
                      Pack {captureResult.packType}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={handleContinue}
                      size="lg"
                    >
                      Générer un ebook
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleDashboard}
                      size="lg"
                    >
                      Voir mon dashboard
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Les crédits sont maintenant disponibles dans votre compte.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <AlertCircle className="w-16 h-16 mx-auto text-red-500" />

                  <div>
                    <h2 className="text-2xl font-bold mb-2">Erreur</h2>
                    <p className="text-muted-foreground">
                      {captureResult?.error ||
                        "Une erreur est survenue lors du traitement de votre paiement."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => (window.location.href = "/pricing")}
                      size="lg"
                    >
                      Retour aux tarifs
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleDashboard}
                      size="lg"
                    >
                      Voir mon dashboard
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Si le problème persiste, veuillez contacter le support.
                  </p>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
