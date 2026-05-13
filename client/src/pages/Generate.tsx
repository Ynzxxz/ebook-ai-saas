import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { Sparkles, BookOpen, Loader2, CheckCircle2, ArrowLeft, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const LANGUAGES = ["Français", "English", "Español", "Deutsch", "Italiano", "Português", "中文", "日本語"];
const TONES = [
  { value: "professional", label: "Professionnel", desc: "Formel et structuré" },
  { value: "casual", label: "Décontracté", desc: "Accessible et convivial" },
  { value: "academic", label: "Académique", desc: "Rigoureux et documenté" },
  { value: "creative", label: "Créatif", desc: "Imaginatif et engageant" },
  { value: "motivational", label: "Motivant", desc: "Inspirant et dynamique" },
];

type GenerationStep = "form" | "generating" | "done" | "error";

export default function Generate() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [step, setStep] = useState<GenerationStep>("form");
  const [currentChapter, setCurrentChapter] = useState(0);
  const [totalChapters, setTotalChapters] = useState(0);
  const [ebookId, setEbookId] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [form, setForm] = useState({
    title: "",
    subject: "",
    chapterCount: 5,
    language: "Français",
    tone: "professional" as "professional" | "casual" | "academic" | "creative" | "motivational",
  });

  const planQuery = trpc.subscription.getMyPlan.useQuery(undefined, { enabled: isAuthenticated });

  const createMutation = trpc.ebook.create.useMutation();
  const generateMutation = trpc.ebook.generate.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.subject.trim()) {
      toast.error("Veuillez remplir le titre et le sujet.");
      return;
    }

    try {
      setStep("generating");
      setTotalChapters(form.chapterCount);
      setCurrentChapter(0);

      // Create ebook
      const { ebookId: newId } = await createMutation.mutateAsync(form);
      setEbookId(newId);

      // Simulate progress
      const interval = setInterval(() => {
        setCurrentChapter((prev) => {
          if (prev < form.chapterCount - 1) return prev + 1;
          clearInterval(interval);
          return prev;
        });
      }, 3000);

      // Generate
      const result = await generateMutation.mutateAsync({ ebookId: newId });
      clearInterval(interval);
      setCurrentChapter(form.chapterCount);
      setPdfUrl(result.pdfUrl || null);
      setStep("done");
      toast.success("Votre ebook est prêt !");
    } catch (err: any) {
      setStep("error");
      setErrorMsg(err?.message || "Une erreur est survenue lors de la génération.");
      toast.error(err?.message || "Erreur lors de la génération");
    }
  };

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

  const plan = planQuery.data?.plan ?? "free";
  const maxChapters = plan === "free" ? 5 : plan === "starter" ? 15 : 30;
  const creditsRemaining = planQuery.data?.creditsRemaining;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-12">
        <div className="container max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Button variant="ghost" size="sm" className="mb-6 gap-2 text-muted-foreground" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
              Retour au dashboard
            </Button>

            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold">Créer un ebook</h1>
                <p className="text-sm text-muted-foreground">
                  {creditsRemaining !== null && creditsRemaining !== undefined
                    ? `${creditsRemaining} ebook${creditsRemaining > 1 ? "s" : ""} restant${creditsRemaining > 1 ? "s" : ""}`
                    : "Ebooks illimités"}
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {step === "form" && (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  <div className="glass-card p-6 space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium">Titre de l'ebook *</Label>
                      <Input
                        id="title"
                        placeholder="Ex: Le Guide Complet du Marketing Digital"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="bg-input/50 border-border/60 focus:border-primary"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-sm font-medium">Sujet et description *</Label>
                      <Textarea
                        id="subject"
                        placeholder="Décrivez le sujet principal, les thèmes à aborder, le public cible..."
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="bg-input/50 border-border/60 focus:border-primary resize-none"
                        rows={3}
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Nombre de chapitres</Label>
                        <Badge className="bg-primary/15 text-primary border-primary/30">{form.chapterCount} chapitres</Badge>
                      </div>
                      <Slider
                        min={1}
                        max={maxChapters}
                        step={1}
                        value={[form.chapterCount]}
                        onValueChange={([val]) => setForm({ ...form, chapterCount: val })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1</span>
                        <span>{maxChapters} max ({plan})</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Langue</Label>
                        <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                          <SelectTrigger className="bg-input/50 border-border/60">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGES.map((lang) => (
                              <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Ton</Label>
                        <Select value={form.tone} onValueChange={(v) => setForm({ ...form, tone: v as any })}>
                          <SelectTrigger className="bg-input/50 border-border/60">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TONES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                <div>
                                  <div className="font-medium">{t.label}</div>
                                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {plan === "free" && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
                      <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <span className="text-yellow-300/80">
                        Plan gratuit : le PDF contiendra un filigrane "Generated by EbookAI Studio".
                        <a href="/pricing" className="text-yellow-400 hover:underline ml-1">Passer à un plan payant →</a>
                      </span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 glow-violet h-12 text-base gap-2"
                    disabled={createMutation.isPending || generateMutation.isPending}
                  >
                    <Sparkles className="w-5 h-5" />
                    Générer l'ebook avec l'IA
                  </Button>
                </motion.form>
              )}

              {step === "generating" && (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass-card p-10 text-center"
                >
                  <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
                    <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-display font-bold mb-2">Génération en cours...</h2>
                  <p className="text-muted-foreground mb-8">
                    Claude Sonnet rédige votre ebook chapitre par chapitre. Cela peut prendre quelques minutes.
                  </p>

                  <div className="space-y-3 text-left max-w-sm mx-auto">
                    {Array.from({ length: totalChapters }, (_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                          i < currentChapter
                            ? "bg-green-500/20 text-green-400"
                            : i === currentChapter
                            ? "bg-primary/20 text-primary"
                            : "bg-muted/50 text-muted-foreground"
                        }`}>
                          {i < currentChapter ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : i === currentChapter ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span className="text-xs">{i + 1}</span>
                          )}
                        </div>
                        <span className={`text-sm ${i <= currentChapter ? "text-foreground" : "text-muted-foreground"}`}>
                          Chapitre {i + 1}
                          {i < currentChapter && " ✓"}
                          {i === currentChapter && " — En cours..."}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 h-2 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      animate={{ width: `${(currentChapter / totalChapters) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{currentChapter}/{totalChapters} chapitres</p>
                </motion.div>
              )}

              {step === "done" && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-10 text-center"
                >
                  <div className="w-20 h-20 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-display font-bold mb-2">Ebook généré !</h2>
                  <p className="text-muted-foreground mb-8">
                    Votre ebook "{form.title}" est prêt. Vous pouvez le télécharger ou le consulter dans votre dashboard.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {pdfUrl && (
                      <Button className="bg-primary hover:bg-primary/90 gap-2" onClick={() => window.open(pdfUrl, "_blank")}>
                        <BookOpen className="w-4 h-4" />
                        Télécharger le PDF
                      </Button>
                    )}
                    {ebookId && (
                      <Button variant="outline" className="border-border/60 gap-2" onClick={() => navigate(`/ebook/${ebookId}`)}>
                        Voir l'ebook
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => { setStep("form"); setForm({ title: "", subject: "", chapterCount: 5, language: "Français", tone: "professional" }); }}>
                      Créer un autre ebook
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-10 text-center"
                >
                  <div className="w-20 h-20 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                  </div>
                  <h2 className="text-2xl font-display font-bold mb-2">Erreur de génération</h2>
                  <p className="text-muted-foreground mb-4">{errorMsg}</p>
                  <div className="flex gap-3 justify-center">
                    <Button className="bg-primary" onClick={() => setStep("form")}>Réessayer</Button>
                    <Button variant="ghost" onClick={() => navigate("/dashboard")}>Retour au dashboard</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
