# EbookAI Studio — TODO

## Base de données
- [x] Table `users` étendue avec creditsBalance
- [x] Table `ebooks` avec titre, sujet, chapitres, langue, ton, statut, pdfUrl, filigrane
- [x] Table `chapters` avec contenu généré par chapitre
- [x] Migrations SQL appliquées

## Backend / tRPC
- [x] Procédure `ebook.create` — créer un ebook (vérification crédits)
- [x] Procédure `ebook.generate` — générer chapitre par chapitre via LLM (claude-sonnet-4-20250514)
- [x] Procédure `ebook.list` — historique des ebooks de l'utilisateur
- [x] Procédure `ebook.get` — détail d'un ebook avec chapitres
- [x] Procédure `ebook.getCreditsBalance` — solde de crédits utilisateur
- [x] Service PDF (PDFKit) — couverture, table des matières, chapitres, filigrane plan gratuit
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
- [x] Affichage solde de crédits
- [x] Historique des ebooks (titre, date, statut, téléchargement)
- [x] Bouton "Nouvel ebook"
- [x] Bouton acheter des crédits

## Frontend — Générateur d'ebook
- [x] Formulaire (titre, sujet, nb chapitres, langue, ton)
- [x] Progression de génération chapitre par chapitre
- [x] Bouton export PDF
- [x] Page détail ebook avec chapitres dépliables

## Frontend — Page Pricing
- [x] Page /pricing avec 3 packs PayPal
- [x] Pack Starter : 5 générations pour 5€
- [x] Pack Pro : 20 générations pour 15€
- [x] Pack Illimité : générations illimitées 30j pour 25€

## Design
- [x] Dark mode violet/gris foncé/blanc (OKLCH)
- [x] Typographie Syne (titres) + Inter (corps)
- [x] Composants glass-card, gradient-text, glow-violet
- [x] Animations fluides (framer-motion)
- [x] Design responsive mobile

## Intégration PayPal
- [x] Liens de paiement PayPal pour les 3 packs
- [x] Callback de paiement avec ajout de crédits
- [x] Vérification des crédits avant génération
- [x] Message de blocage si pas de crédits

## Tests
- [x] Tests vitest pour auth.logout (template)
- [x] Tests vitest pour ebook.create (validation crédits)
- [x] Tests vitest pour ebook.getCreditsBalance

## Corrections génération LLM
- [x] Améliorer le prompt système pour éviter les répétitions
- [x] Ajouter un prompt de plan global avant génération
- [x] Améliorer le parsing du contenu markdown
- [x] Améliorer le rendu PDF pour markdown (titres, listes, gras)
- [x] Corriger les sauts de page et l'espacement

## Correctif pages blanches PDF
- [x] Reproduire le bug et identifier la cause
- [x] Réécrire pdfService sans continued:true

## Migration Stripe → PayPal Packs
- [x] Supprimer Stripe et tous les webhooks
- [x] Mettre à jour le schéma DB avec creditsBalance
- [x] Créer les 3 packs PayPal
- [x] Intégrer les liens de paiement PayPal
- [x] Ajouter la vérification des crédits
- [x] Mettre à jour le dashboard avec le solde de crédits
- [x] Ajouter le message de blocage si pas de crédits
- [x] Réécrire la page Pricing avec les packs PayPal
- [x] Supprimer toutes les références Stripe du code


## Webhook PayPal IPN et historique
- [x] Ajouter table `transactions` au schéma DB
- [x] Créer le webhook PayPal IPN `/api/paypal/webhook`
- [x] Créer la page `/transactions` avec historique
- [x] Implémenter le renouvellement automatique du pack Illimité
