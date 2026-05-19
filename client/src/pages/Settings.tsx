import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, CreditCard, History } from "lucide-react";
import { useLocation } from "wouter";

export default function Settings() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

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

  const settingsOptions = [
    {
      title: "Configuration PayPal",
      description: "Gérez vos identifiants PayPal pour les paiements",
      icon: CreditCard,
      onClick: () => setLocation("/settings/payment"),
      color: "text-blue-400",
    },
    {
      title: "Historique des transactions",
      description: "Consultez vos achats et transactions",
      icon: History,
      onClick: () => setLocation("/transactions"),
      color: "text-purple-400",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setLocation("/dashboard")}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Paramètres</h1>
            <p className="text-muted-foreground mt-1">
              Gérez votre compte et vos préférences
            </p>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.title}
                className="border-border/50 bg-card/50 backdrop-blur hover:border-accent/50 transition-colors cursor-pointer"
                onClick={option.onClick}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{option.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {option.description}
                      </CardDescription>
                    </div>
                    <Icon className={`w-6 h-6 ${option.color} flex-shrink-0`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      option.onClick();
                    }}
                  >
                    Accéder
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Account Info */}
        <Card className="mt-8 border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Informations du compte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nom</p>
              <p className="text-lg font-semibold">{user?.name || "Non défini"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-lg font-semibold">{user?.email || "Non défini"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
