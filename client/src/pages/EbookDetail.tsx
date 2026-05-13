import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { BookOpen, Download, ArrowLeft, Loader2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Streamdown } from "streamdown";

const TONE_LABELS: Record<string, string> = {
  professional: "Professionnel",
  casual: "Décontracté",
  academic: "Académique",
  creative: "Créatif",
  motivational: "Motivant",
};

export default function EbookDetail() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const ebookId = parseInt(params.id || "0");
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);

  const { data: ebook, isLoading } = trpc.ebook.get.useQuery(
    { id: ebookId },
    { enabled: isAuthenticated && !isNaN(ebookId) }
  );

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
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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
        <div className="container max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Button variant="ghost" size="sm" className="mb-6 gap-2 text-muted-foreground" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
              Retour au dashboard
            </Button>

            {/* Header */}
            <div className="glass-card p-6 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-display font-bold mb-1">{ebook.title}</h1>
                    <p className="text-muted-foreground text-sm mb-3">{ebook.subject}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">{ebook.language}</Badge>
                      <Badge className="bg-accent text-accent-foreground border-border/50 text-xs">{TONE_LABELS[ebook.tone] || ebook.tone}</Badge>
                      <Badge className="bg-muted text-muted-foreground border-border/50 text-xs">{ebook.chapterCount} chapitres</Badge>
                      {ebook.hasWatermark && (
                        <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-xs">Filigrane</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {ebook.status === "completed" && ebook.pdfUrl && (
                  <Button
                    className="bg-primary hover:bg-primary/90 gap-2 flex-shrink-0"
                    onClick={() => window.open(ebook.pdfUrl!, "_blank")}
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </Button>
                )}
              </div>
            </div>

            {/* Chapters */}
            {ebook.chapters && ebook.chapters.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-lg font-display font-semibold mb-4">Chapitres</h2>
                {ebook.chapters.map((ch, i) => (
                  <motion.div
                    key={ch.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="glass-card overflow-hidden"
                  >
                    <button
                      className="w-full flex items-center gap-4 p-4 text-left hover:bg-accent/30 transition-colors"
                      onClick={() => setExpandedChapter(expandedChapter === ch.id ? null : ch.id)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 text-primary text-sm font-bold">
                        {ch.chapterNumber}
                      </div>
                      <span className="flex-1 font-medium">{ch.title}</span>
                      {expandedChapter === ch.id ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                    {expandedChapter === ch.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-border/40 p-6"
                      >
                        <div className="prose prose-invert prose-sm max-w-none text-foreground/80">
                          <Streamdown>{ch.content}</Streamdown>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-muted-foreground">Génération des chapitres en cours...</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
