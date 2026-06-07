import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Loader2, Save, Palette, Grid3x3 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getAllTemplates, type StylingTemplate } from "../../../shared/templates";

export default function AdvancedStyling() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const ebookId = parseInt(params.get("ebookId") || "0");

  const { data: ebook, isLoading } = trpc.ebook.get.useQuery({ id: ebookId });
  const updateMutation = trpc.ebook.updateAdvancedStyling.useMutation();

  const [form, setForm] = useState({
    coverStyle: "modern" as "modern" | "minimal" | "professional" | "colorful",
    coverBackgroundColor: "#1a1a2e",
    pageBackgroundStyle: "solid" as "solid" | "gradient" | "texture",
    pageBackgroundColor: "#ffffff",
    pageAccentColor: "#7c3aed",
    pageLayout: "single" as "single" | "double",
    marginSize: "normal" as "small" | "normal" | "large",
    lineHeight: "1.5" as "1.5" | "1.75" | "2",
    watermarkText: "",
    watermarkOpacity: 20,
    pageNumberingStyle: "arabic" as "arabic" | "roman" | "none",
    pageNumberingPosition: "bottom-center" as "bottom-center" | "bottom-left" | "bottom-right" | "top-center",
    headerText: "",
    footerText: "",
    showChapterTitlesInHeader: false,
  });

  useEffect(() => {
    if (ebook) {
      setForm({
        coverStyle: (ebook.coverStyle as any) || "modern",
        coverBackgroundColor: ebook.coverBackgroundColor || "#1a1a2e",
        pageBackgroundStyle: (ebook.pageBackgroundStyle as any) || "solid",
        pageBackgroundColor: ebook.pageBackgroundColor || "#ffffff",
        pageAccentColor: ebook.pageAccentColor || "#7c3aed",
        pageLayout: (ebook.pageLayout as any) || "single",
        marginSize: (ebook.marginSize as any) || "normal",
        lineHeight: (ebook.lineHeight as any) || "1.5",
        watermarkText: ebook.watermarkText || "",
        watermarkOpacity: ebook.watermarkOpacity || 20,
        pageNumberingStyle: (ebook.pageNumberingStyle as any) || "arabic",
        pageNumberingPosition: (ebook.pageNumberingPosition as any) || "bottom-center",
        headerText: ebook.headerText || "",
        footerText: ebook.footerText || "",
        showChapterTitlesInHeader: ebook.showChapterTitlesInHeader || false,
      });
    }
  }, [ebook]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        ebookId,
        ...form,
      });
      toast.success("Paramètres sauvegardés avec succès !");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ebook) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Ebook non trouvé</h2>
          <Button onClick={() => navigate("/dashboard")}>Retour au dashboard</Button>
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
              Retour
            </Button>

            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold">Personnalisation avancée</h1>
                <p className="text-sm text-muted-foreground">{ebook.title}</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Templates prédéfinis */}
              <Card className="glass-card border-border/50 bg-gradient-to-r from-primary/10 to-accent/10">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Grid3x3 className="w-5 h-5" />
                    Templates prédéfinis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {getAllTemplates().map((template) => (
                      <motion.button
                        key={template.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setForm({
                            coverStyle: template.coverStyle,
                            pageBackgroundStyle: template.backgroundColor,
                            pageLayout: template.pageLayout,
                            marginSize: template.marginSize === "compact" ? "small" : template.marginSize === "spacious" ? "large" : "normal",
                            lineHeight: template.lineHeight === "tight" ? "1.5" : template.lineHeight === "loose" ? "2" : "1.75",
                            pageNumberingStyle: template.pageNumbering,
                            watermarkText: template.hasWatermark ? "EbookAI Studio" : "",
                            headerText: template.headerText || "",
                            footerText: template.footerText || "",
                            coverBackgroundColor: "#1a1a2e",
                            pageBackgroundColor: "#ffffff",
                            pageAccentColor: "#7c3aed",
                            watermarkOpacity: 20,
                            pageNumberingPosition: "bottom-center",
                            showChapterTitlesInHeader: false,
                          });
                          toast.success(`Template "${template.name}" appliqué !`);
                        }}
                        className="p-4 rounded-lg border border-border/50 hover:border-primary/50 bg-background/50 hover:bg-primary/10 transition-all text-left"
                      >
                        <div className="font-semibold text-sm">{template.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{template.description}</div>
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Styles de couverture */}
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Styles de couverture</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Style de couverture</Label>
                    <Select value={form.coverStyle} onValueChange={(v: any) => setForm({ ...form, coverStyle: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modern">Moderne</SelectItem>
                        <SelectItem value="minimal">Minimaliste</SelectItem>
                        <SelectItem value="professional">Professionnel</SelectItem>
                        <SelectItem value="colorful">Coloré</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Couleur de fond de couverture</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={form.coverBackgroundColor} onChange={(e) => setForm({ ...form, coverBackgroundColor: e.target.value })} className="w-20 h-10" />
                      <Input type="text" value={form.coverBackgroundColor} onChange={(e) => setForm({ ...form, coverBackgroundColor: e.target.value })} placeholder="#000000" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Arrière-plans */}
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Arrière-plans des pages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Style d'arrière-plan</Label>
                    <Select value={form.pageBackgroundStyle} onValueChange={(v: any) => setForm({ ...form, pageBackgroundStyle: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Uni</SelectItem>
                        <SelectItem value="gradient">Dégradé</SelectItem>
                        <SelectItem value="texture">Texture</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Couleur de fond</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={form.pageBackgroundColor} onChange={(e) => setForm({ ...form, pageBackgroundColor: e.target.value })} className="w-20 h-10" />
                      <Input type="text" value={form.pageBackgroundColor} onChange={(e) => setForm({ ...form, pageBackgroundColor: e.target.value })} placeholder="#ffffff" />
                    </div>
                  </div>
                  <div>
                    <Label>Couleur d'accent</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={form.pageAccentColor} onChange={(e) => setForm({ ...form, pageAccentColor: e.target.value })} className="w-20 h-10" />
                      <Input type="text" value={form.pageAccentColor} onChange={(e) => setForm({ ...form, pageAccentColor: e.target.value })} placeholder="#7c3aed" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mise en page */}
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Mise en page</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Disposition</Label>
                    <Select value={form.pageLayout} onValueChange={(v: any) => setForm({ ...form, pageLayout: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Une colonne</SelectItem>
                        <SelectItem value="double">Deux colonnes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Taille des marges</Label>
                    <Select value={form.marginSize} onValueChange={(v: any) => setForm({ ...form, marginSize: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Petite</SelectItem>
                        <SelectItem value="normal">Normale</SelectItem>
                        <SelectItem value="large">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Hauteur de ligne</Label>
                    <Select value={form.lineHeight} onValueChange={(v: any) => setForm({ ...form, lineHeight: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1.5">1.5</SelectItem>
                        <SelectItem value="1.75">1.75</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Watermark */}
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Watermark</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Texte du watermark</Label>
                    <Input value={form.watermarkText} onChange={(e) => setForm({ ...form, watermarkText: e.target.value })} placeholder="Ex: Confidentiel" />
                  </div>
                  <div>
                    <Label>Opacité ({form.watermarkOpacity}%)</Label>
                    <Slider value={[form.watermarkOpacity]} onValueChange={(v) => setForm({ ...form, watermarkOpacity: v[0] })} min={0} max={100} step={5} />
                  </div>
                </CardContent>
              </Card>

              {/* Numérotation */}
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Numérotation des pages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Style de numérotation</Label>
                    <Select value={form.pageNumberingStyle} onValueChange={(v: any) => setForm({ ...form, pageNumberingStyle: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="arabic">Chiffres arabes (1, 2, 3...)</SelectItem>
                        <SelectItem value="roman">Chiffres romains (I, II, III...)</SelectItem>
                        <SelectItem value="none">Aucun</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Position</Label>
                    <Select value={form.pageNumberingPosition} onValueChange={(v: any) => setForm({ ...form, pageNumberingPosition: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-center">Bas - Centre</SelectItem>
                        <SelectItem value="bottom-left">Bas - Gauche</SelectItem>
                        <SelectItem value="bottom-right">Bas - Droite</SelectItem>
                        <SelectItem value="top-center">Haut - Centre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* En-têtes et pieds de page */}
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">En-têtes et pieds de page</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Texte de l'en-tête</Label>
                    <Input value={form.headerText} onChange={(e) => setForm({ ...form, headerText: e.target.value })} placeholder="Ex: Mon ebook" />
                  </div>
                  <div>
                    <Label>Texte du pied de page</Label>
                    <Input value={form.footerText} onChange={(e) => setForm({ ...form, footerText: e.target.value })} placeholder="Ex: Copyright 2026" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showChapterTitles"
                      checked={form.showChapterTitlesInHeader}
                      onChange={(e) => setForm({ ...form, showChapterTitlesInHeader: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="showChapterTitles" className="cursor-pointer">Afficher les titres des chapitres dans l'en-tête</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Aperçu en temps réel */}
              <Card className="glass-card border-border/50 bg-gradient-to-r from-primary/10 to-accent/10">
                <CardHeader>
                  <CardTitle className="text-lg">Aperçu en temps réel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-6 rounded-lg border border-border/50 bg-background">
                      <div className="text-center mb-4">
                        <div className="text-sm text-muted-foreground mb-2">Couverture</div>
                        <div
                          className="w-full h-48 rounded-lg border-2 border-border/50 flex items-center justify-center text-center p-4"
                          style={{
                            backgroundColor: form.coverBackgroundColor,
                            color: "white",
                          }}
                        >
                          <div>
                            <div className="font-bold text-xl mb-2">{ebook.title}</div>
                            <div className="text-sm opacity-75">Style: {form.coverStyle}</div>
                          </div>
                        </div>
                      </div>

                      <div className="text-center mt-6">
                        <div className="text-sm text-muted-foreground mb-2">Page de contenu</div>
                        <div
                          className="p-4 rounded-lg border border-border/50 text-left"
                          style={{
                            backgroundColor: form.pageBackgroundColor,
                            color: "#000",
                            lineHeight: form.lineHeight,
                          }}
                        >
                          <div className="text-xs text-muted-foreground mb-2">{form.headerText || "En-tête"}</div>
                          <div className="text-sm mb-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</div>
                          <div className="text-xs text-muted-foreground text-center">{form.footerText || "Pied de page"}</div>
                          {form.watermarkText && (
                            <div className="text-center text-xs opacity-20 mt-2">{form.watermarkText}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      Aperçu - Les paramètres seront appliqués à la génération du PDF
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full gap-2 bg-primary hover:bg-primary/90">
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? "Sauvegarde..." : "Sauvegarder les paramétres"}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
