import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PayPalSettings() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isChangingSecret, setIsChangingSecret] = useState(false);
  const [mode, setMode] = useState<"sandbox" | "live">("sandbox");
  const [isLoading, setIsLoading] = useState(false);

  const configQuery = trpc.paypal.getConfig.useQuery(undefined, {
    enabled: !!user,
  });

  // Charger les données quand la query réussit
  useEffect(() => {
    if (configQuery.data) {
      setClientId(configQuery.data.clientId || "");
      setMode(configQuery.data.mode);
      // Ne pas pré-remplir le secret
      setClientSecret("");
      setIsChangingSecret(false);
    }
  }, [configQuery.data]);

  const saveConfigMutation = trpc.paypal.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuration PayPal sauvegardée");
      configQuery.refetch();
      setIsChangingSecret(false);
    },
    onError: (error: any) => {
      toast.error(`Erreur : ${error?.message || "Erreur inconnue"}`);
    },
  });

  const handleSave = async () => {
    if (!clientId.trim()) {
      toast.error("Veuillez entrer un Client ID");
      return;
    }

    // Si on change le secret, il doit être fourni
    if (isChangingSecret && !clientSecret.trim()) {
      toast.error("Veuillez entrer un Client Secret");
      return;
    }

    setIsLoading(true);
    try {
      await saveConfigMutation.mutateAsync({
        clientId: clientId.trim(),
        clientSecret: isChangingSecret ? clientSecret.trim() : undefined,
        mode,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connexion requise</h2>
          <Button asChild className="bg-primary">
            <a href={getLoginUrl()}>Se connecter</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setLocation("/dashboard")}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Configuration PayPal</h1>
            <p className="text-muted-foreground mt-1">
              Configurez vos identifiants PayPal pour accepter les paiements
            </p>
          </div>
        </div>

        {/* Main Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Identifiants API PayPal</CardTitle>
            <CardDescription>
              Entrez vos clés API PayPal pour activer les paiements. Vous pouvez les trouver dans votre tableau de bord PayPal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mode Selection */}
            <div className="space-y-2">
              <Label htmlFor="mode">Mode PayPal</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as "sandbox" | "live")}>
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Test)</SelectItem>
                  <SelectItem value="live">Live (Production)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {mode === "sandbox"
                  ? "Mode test - Utilisez des cartes de test PayPal"
                  : "Mode production - Les paiements réels seront traités"}
              </p>
            </div>

            {/* Client ID */}
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                type="text"
                placeholder="Votre Client ID PayPal"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={isLoading || saveConfigMutation.isPending || configQuery.isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Trouvez votre Client ID dans PayPal Dashboard → Apps & Credentials
              </p>
            </div>

            {/* Client Secret */}
            <div className="space-y-3">
              <Label htmlFor="clientSecret">Client Secret</Label>
              
              {/* Checkbox pour changer le secret */}
              <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-lg border border-accent/20">
                <Checkbox
                  id="changeSecret"
                  checked={isChangingSecret}
                  onCheckedChange={(checked) => {
                    setIsChangingSecret(checked as boolean);
                    if (!checked) setClientSecret("");
                  }}
                  disabled={isLoading || saveConfigMutation.isPending}
                />
                <Label htmlFor="changeSecret" className="text-sm cursor-pointer">
                  Modifier le Client Secret
                </Label>
              </div>

              {/* Input du secret (visible seulement si on change) */}
              {isChangingSecret && (
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder="Votre nouveau Client Secret PayPal"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  disabled={isLoading || saveConfigMutation.isPending}
                />
              )}

              {!isChangingSecret && configQuery.data && (
                <p className="text-xs text-muted-foreground italic">
                  ✓ Un Client Secret est déjà configuré. Cochez la case ci-dessus pour le modifier.
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Trouvez votre Client Secret dans PayPal Dashboard → Apps & Credentials
              </p>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isLoading || saveConfigMutation.isPending || configQuery.isLoading}
                className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800"
              >
                {isLoading || saveConfigMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  "Sauvegarder la configuration"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/dashboard")}
                disabled={isLoading || saveConfigMutation.isPending}
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 border-border/50 bg-accent/5">
          <CardHeader>
            <CardTitle className="text-base">Comment obtenir vos identifiants ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li>Allez sur <a href="https://developer.paypal.com" target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:underline">developer.paypal.com</a></li>
              <li>Connectez-vous avec votre compte PayPal</li>
              <li>Allez dans "Apps & Credentials"</li>
              <li>Sélectionnez le mode (Sandbox ou Live)</li>
              <li>Copiez votre Client ID et Client Secret</li>
              <li>Collez-les ci-dessus et cliquez sur "Sauvegarder"</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
