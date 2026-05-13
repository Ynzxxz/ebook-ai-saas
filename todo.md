# EbookAI Studio — TODO

## Base de données
- [x] Table `users` étendue avec plan, crédits, stripeCustomerId, stripeSubscriptionId
- [x] Table `ebooks` avec titre, sujet, chapitres, langue, ton, statut, pdfUrl, filigrane
- [x] Table `chapters` avec contenu généré par chapitre
- [x] Migrations SQL appliquées

## Backend / tRPC
- [x] Procédure `ebook.create` — créer un ebook (vérification crédits)
- [x] Procédure `ebook.generate` — générer chapitre par chapitre via LLM (claude-sonnet-4-20250514)
- [x] Procédure `ebook.list` — historique des ebooks de l'utilisateur
- [x] Procédure `ebook.get` — détail d'un ebook avec chapitres
- [x] Service PDF (PDFKit) — couverture, table des matières, chapitres, filigrane plan gratuit
- [x] Procédure `subscription.createCheckout` — créer session Stripe Checkout
- [x] Procédure `subscription.createPortal` — portail client Stripe
- [x] Procédure `subscription.getMyPlan` — plan, crédits, limites
- [x] Webhook Stripe `/api/stripe/webhook` — mise à jour plan en temps réel
- [x] Middleware de vérification des crédits (dans ebook.create)

## Frontend — Page d'accueil
- [x] Hero section avec CTA
- [x] Section fonctionnalités (6 features)
- [x] Section pricing (Free / Starter / Pro)
- [x] Footer

## Frontend — Authentification
- [x] Bouton connexion OAuth
- [x] Redirection post-login vers dashboard

## Frontend — Dashboard
- [x] Affichage plan actuel et crédits restants
- [x] Historique des ebooks (titre, date, statut, téléchargement)
- [x] Bouton "Nouvel ebook"
- [x] Bouton upgrade plan

## Frontend — Générateur d'ebook
- [x] Formulaire (titre, sujet, nb chapitres, langue, ton)
- [x] Progression de génération chapitre par chapitre
- [x] Bouton export PDF
- [x] Page détail ebook avec chapitres dépliables

## Frontend — Page Pricing
- [x] Page /pricing dédiée avec FAQ

## Design
- [x] Dark mode violet/gris foncé/blanc (OKLCH)
- [x] Typographie Syne (titres) + Inter (corps)
- [x] Composants glass-card, gradient-text, glow-violet
- [x] Animations fluides (framer-motion)
- [x] Design responsive mobile

## Intégration Stripe
- [x] Stripe Checkout (Starter + Pro)
- [x] Webhooks : checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.paid
- [x] Mise à jour plan utilisateur en temps réel
- [x] Réinitialisation mensuelle des crédits

## Tests
- [x] Tests vitest pour auth.logout (template)
- [x] Tests vitest pour ebook.create (validation crédits/plan)
- [x] Tests vitest pour subscription.getMyPlan
- [x] Tests vitest pour webhook Stripe
