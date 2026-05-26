import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Loader2, Download, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { useState } from "react";

export default function CoverEditor() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const ebookId = parseInt(params.id || "0");

  const { data: ebook, isLoading } = trpc.ebook.get.useQuery(
    { id: ebookId },
    { enabled: isAuthenticated && !isNaN(ebookId) }
  );

  const generateCoverMutation = trpc.ebook.generateCoverImage.useMutation();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRegenerateCover = async () => {
    if (!ebook) return;
    try {
      setIsGenerating(true);
      await generateCoverMutation.mutateAsync({
        ebookId,
        subject: ebook.subject,
        title: ebook.title,
      });
      toast.success("Couverture régénérée avec succès !");
    } catch (error) {
      toast.error("Erreur lors de la régénération de la couverture");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCover = () => {
    if (ebook?.coverImageUrl) {
      const link = document.createElement("a");
      link.href = ebook.coverImageUrl;
      link.download = `${ebook.title}-cover.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (authLoading || isLoading) {
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

  if (!ebook) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Ebook introuvable</h2>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>Retour au dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-12">
        <div className="container max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Button variant="ghost" size="sm" className="mb-6 gap-2 text-muted-foreground" onClick={() => navigate(`/ebook/${ebookId}`)}>
              <ArrowLeft className="w-4 h-4" />
              Retour à l'ebook
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Aperçu */}
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-4">Aperçu de la couverture</h2>
                {ebook.coverImageUrl ? (
                  <div className="relative group">
                    <img
                      src={ebook.coverImageUrl}
                      alt={ebook.title}
                      className="w-full rounded-lg shadow-lg"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={handleDownloadCover}
                      >
                        <Download className="w-4 h-4" />
                        Télécharger
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-[2/3] rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-border/50">
                    <div className="text-center">
                      <p className="text-muted-foreground">Aucune couverture générée</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="glass-card p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-4">Options</h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Titre</Label>
                      <Input
                        value={ebook.title}
                        disabled
                        className="bg-input/50 border-border/60"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Sujet</Label>
                      <Input
                        value={ebook.subject}
                        disabled
                        className="bg-input/50 border-border/60"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Couleur primaire</Label>
                      <div className="flex gap-2">
                        <div
                          className="w-12 h-10 rounded border border-border/60"
                          style={{ backgroundColor: ebook.primaryColor || "#7c3aed" }}
                        />
                        <Input
                          value={ebook.primaryColor || "#7c3aed"}
                          disabled
                          className="flex-1 bg-input/50 border-border/60"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Police</Label>
                      <Input
                        value={ebook.fontFamily || "inter"}
                        disabled
                        className="bg-input/50 border-border/60"
                      />
                    </div>

                    <div className="pt-4 border-t border-border/40">
                      <Button
                        className="w-full bg-accent hover:bg-accent/90 text-white gap-2"
                        onClick={handleRegenerateCover}
                        disabled={isGenerating || generateCoverMutation.isPending}
                      >
                        {isGenerating || generateCoverMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Régénération...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Régénérer la couverture
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
