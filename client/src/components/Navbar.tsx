import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { BookOpen, Menu, X, Sparkles, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [, navigate] = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/80">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow-violet">
            <BookOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-foreground">EbookAI</span>
          <span className="gradient-text font-display font-bold text-lg">Studio</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Tarifs
          </Link>
          {isAuthenticated && (
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
          )}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/generate")}
                className="gap-2 text-primary hover:text-primary hover:bg-primary/10"
              >
                <Sparkles className="w-4 h-4" />
                Créer un ebook
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/settings")}
                className="text-muted-foreground hover:text-foreground"
              >
                <SettingsIcon className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
                  Déconnexion
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <a href={getLoginUrl()}>Connexion</a>
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90 glow-violet" asChild>
                <a href={getLoginUrl()}>Commencer gratuitement</a>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] as const }}
            className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="container py-4 flex flex-col gap-3">
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground py-2" onClick={() => setMenuOpen(false)}>
                Tarifs
              </Link>
              {isAuthenticated && (
                <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground py-2" onClick={() => setMenuOpen(false)}>
                  Dashboard
                </Link>
              )}
              {isAuthenticated ? (
                <>
                  <Button size="sm" onClick={() => { navigate("/generate"); setMenuOpen(false); }} className="gap-2 bg-primary">
                    <Sparkles className="w-4 h-4" />
                    Créer un ebook
                  </Button>
                  <Button variant="ghost" size="sm" onClick={logout}>Déconnexion</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild><a href={getLoginUrl()}>Connexion</a></Button>
                  <Button size="sm" className="bg-primary" asChild><a href={getLoginUrl()}>Commencer gratuitement</a></Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
