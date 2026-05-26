import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import { Sparkles, ArrowLeft, AlertCircle, Loader2, CheckCircle2, Palette, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";

const LANGUAGES = ["Français", "Anglais", "Espagnol", "Allemand", "Italien", "Portugais", "Chinois", "Japonais"];
const TONES = [
  { value: "professional", label: "Professionnel", desc: "Formel et structuré" },
  { value: "casual", label: "Décontracté", desc: "Amical et accessible" },
  { value: "academic", label: "Académique", desc: "Rigoureux et détaillé" },
  { value: "creative", label: "Créatif", desc: "Engageant et original" },
  { value: "motivational", label: "Motivant", desc: "Inspirant et dynamique" },
];

export default function Generate() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"form" | "generating" | "success" | "error">("form");
  const [ebookId, setEbookId] = useState<number | null>(null);
  const [totalChapters, setTotalChapters] = useState(0);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    title: "",
    subject: "",
    chapterCount: 5,
    language: "Français",
    tone: "professional" as "professional" | "casual" | "academic" | "creative" | "motivational",
    primaryColor: "#7c3aed",
    fontFamily: "inter" as "inter" | "playfair" | "merriweather",
    autoStyle: true,
  });

  const createMutation = trpc.ebook.create.useMutation();
  const generateMutation = trpc.ebook.generate.useMutation();
  const updateStylingMutation = trpc.ebook.updateStyling.useMutation();
  const getAutoStylingQuery = trpc.ebook.getAutoStyling.useQuery(
    { subject: form.subject },
    { enabled: form.autoStyle && form.subject.length > 0 }
  );

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

      // Update styling if not auto
      if (!form.autoStyle) {
        await updateStylingMutation.mutateAsync({
          ebookId: newId,
          primaryColor: form.primaryColor,
          fontFamily: form.fontFamily,
          autoStyle: false,
        });
      } else if (getAutoStylingQuery.data) {
        await updateStylingMutation.mutateAsync({
          ebookId: newId,
          primaryColor: getAutoStylingQuery.data.primaryColor,
          fontFamily: getAutoStylingQuery.data.fontFamily,
          autoStyle: true,
        });
      }

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
      setStep("success");
      toast.success("Ebook généré avec succès !");
    } catch (error) {
      setStep("error");
      setErrorMsg(error instanceof Error ? error.message : "Erreur inconnue");
      toast.error(errorMsg);
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

  const maxChapters = 30;

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
                  Générez un ebook professionnel en quelques minutes
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
                        <span>{maxChapters} max</span>
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

                  {/* Personnalisation */}
                  <div className="glass-card p-6 space-y-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Palette className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Personnalisation</h3>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
                      <input
                        type="checkbox"
                        id="autoStyle"
                        checked={form.autoStyle}
                        onChange={(e) => setForm({ ...form, autoStyle: e.target.checked })}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="autoStyle" className="text-sm cursor-pointer flex-1">
                        <div className="font-medium">Mode automatique</div>
                        <div className="text-xs text-muted-foreground">L'IA choisit les meilleures couleurs et polices</div>
                      </label>
                    </div>

                    {!form.autoStyle && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Couleur primaire</Label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={form.primaryColor}
                              onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                              className="w-12 h-10 rounded cursor-pointer"
                            />
                            <Input
                              value={form.primaryColor}
                              onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                              className="flex-1 bg-input/50 border-border/60"
                              placeholder="#7c3aed"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Police</Label>
                          <Select value={form.fontFamily} onValueChange={(v) => setForm({ ...form, fontFamily: v as any })}>
                            <SelectTrigger className="bg-input/50 border-border/60">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inter">Inter (Moderne)</SelectItem>
                              <SelectItem value="playfair">Playfair (Élégant)</SelectItem>
                              <SelectItem value="merriweather">Merriweather (Classique)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {form.autoStyle && getAutoStylingQuery.isLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyse du sujet...
                      </div>
                    )}

                    {form.autoStyle && getAutoStylingQuery.data && (
                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Wand2 className="w-4 h-4 text-primary" />
                          <span className="font-medium">Recommandations IA</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border border-primary/30"
                            style={{ backgroundColor: getAutoStylingQuery.data.primaryColor }}
                          />
                          <span className="text-xs">{getAutoStylingQuery.data.fontFamily}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-accent hover:bg-accent/90 text-white gap-2"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Préparation...
                      </>
                    ) : (
                      "Générer l'ebook"
                    )}
                  </Button>
                </motion.form>
              )}

              {step === "generating" && (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="glass-card p-8 text-center space-y-6">
                    <div className="flex justify-center">
                      <Loader2 className="w-12 h-12 animate-spin text-accent" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold mb-2">Génération en cours...</h2>
                      <p className="text-muted-foreground">
                        Chapitre {currentChapter + 1} sur {totalChapters}
                      </p>
                    </div>
                    <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-accent to-accent/50"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentChapter + 1) / totalChapters) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="glass-card p-8 text-center space-y-6">
                    <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Ebook généré !</h2>
                      <p className="text-muted-foreground">
                        Votre ebook est prêt à être téléchargé
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate("/dashboard")}
                      >
                        Retour au dashboard
                      </Button>
                      <Button
                        className="flex-1 bg-accent hover:bg-accent/90 text-white"
                        onClick={() => navigate(`/ebook/${ebookId}`)}
                      >
                        Voir l'ebook
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="glass-card p-8 text-center space-y-6 border-red-500/30 bg-red-500/5">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Erreur</h2>
                      <p className="text-muted-foreground">{errorMsg}</p>
                    </div>
                    <Button
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={() => setStep("form")}
                    >
                      Réessayer
                    </Button>
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
