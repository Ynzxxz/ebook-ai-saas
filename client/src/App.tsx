import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Generate from "./pages/Generate";
import EbookDetail from "./pages/EbookDetail";
import CoverEditor from "./pages/CoverEditor";
import Transactions from "./pages/Transactions";
import Settings from "./pages/Settings";
import { useAuth } from "./_core/hooks/useAuth";
import { useEffect } from "react";
import { trpc } from "./lib/trpc";

function ProtectedRouter() {
  const { isAuthenticated } = useAuth();
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accès refusé</h1>
          <p className="text-muted-foreground mb-6">Ce site est privé et accessible uniquement aux utilisateurs autorisés.</p>
          <button
            onClick={() => window.location.href = '/api/oauth/login'}
            className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/generate" component={Generate} />
      <Route path="/ebook/:id" component={EbookDetail} />
      <Route path="/ebook/:id/cover" component={CoverEditor} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/settings" component={Settings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster theme="dark" position="top-right" />
          <ProtectedRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
