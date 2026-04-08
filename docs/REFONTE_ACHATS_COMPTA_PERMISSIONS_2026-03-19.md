# Refonte Achats, Comptabilité et Permissions

Date: 19 mars 2026

## 1. Workflow achat cible

### Demande interne d'achat
- Tous les services métier peuvent créer une demande d'achat interne.
- Cette demande est volontairement sans prix fournisseur.
- Chaque service ne voit que ses propres demandes si ses permissions sont limitées à `read_own`.

### Service achat
- Le service achat peut voir l'ensemble des demandes.
- Le service achat est le seul autorisé à soumettre une demande pour validation.
- Après validation, c'est lui qui renseigne les fournisseurs, les prix et prépare le bon de commande.

### Validation DG
- L'espace `Validation PDG Achats` est réservé aux utilisateurs disposant de `purchase_requests.approve`.
- Si un utilisateur ne peut pas approuver, il ne peut pas rejeter non plus.
- L'approbation DG ne crée plus automatiquement un bon de commande.

### Bon de commande
- Le bon de commande est généré uniquement après validation DG.
- La génération reste réservée au service achat.

## 2. Comptabilité et bons de caisse

### Nouveau besoin couvert
- Ajout d'une brique `bon de caisse` côté comptabilité.
- Les bons de caisse permettent de suivre les décaissements liés :
  - à un bon de commande
  - à une demande validée
  - à une facture fournisseur
  - à une dépense diverse
  - à un autre besoin ponctuel

### Vue consolidée des dépenses
- Une vue consolidée regroupe :
  - les engagements d'achat
  - les bons de caisse
  - les totaux engagés, saisis et réellement décaissés

### Modes de décaissement
- Chèque
- Espèces

## 3. Permissions par module

### Objectif
- Présenter les permissions par module métier, en français, avec les pages concernées.
- Réduire l'effet "liste plate illisible".

### Modules clarifiés
- Tableau de bord
- Commercial
- CRM
- Facturation clients
- Comptabilité & caisse
- Services techniques
- Gestion de projets
- Achats & logistique
- Ressources humaines
- Communication
- Administration

## 4. UI admin simplifiée

- Suppression du `Workflow d'Approbation` dans l'administration des permissions.
- Les permissions sont maintenant exposées par module avec une lecture métier plus directe.
- Les rôles et permissions utilisateur restent accessibles, mais le workflow inutile a été retiré de la navigation admin.

## 5. Rôles système ajustés

### Direction Générale
- Rôle recentré sur la validation des demandes d'achat.
- Ne doit plus porter un accès global complet par défaut.

### Service Achat
- Rôle recentré sur :
  - lecture globale des demandes
  - soumission pour validation
  - préparation fournisseur/prix
  - génération du bon de commande
  - gestion stock/fournisseurs/produits

### Comptable
- Nouveau rôle système pour :
  - bons de caisse
  - décaissements
  - paiements
  - lecture des engagements achats
  - reporting financier

## 6. Fichiers principaux modifiés

### Backend
- `services/procurement-service/controllers/demandeAchat.controller.js`
- `services/api-gateway/routes/services/procurement.routes.js`
- `services/api-gateway/routes/services/billing.routes.js`
- `services/billing-service/prisma/schema.prisma`
- `services/billing-service/controllers/cashVoucher.controller.js`
- `services/billing-service/routes/cashVoucher.routes.js`
- `services/billing-service/server.js`
- `services/auth-service/src/utils/roleTemplates.js`
- `services/auth-service/prisma/seed.js`

### Frontend
- `frontend/app/(dashboard)/dashboard/comptabilite/depenses/page.tsx`
- `frontend/app/(dashboard)/dashboard/admin/permissions/page.tsx`
- `frontend/src/components/accounting/CreateCashVoucherDialog.tsx`
- `frontend/src/components/accounting/CashVoucherStatusBadge.tsx`
- `frontend/src/components/layout/sidebarData.ts`
- `frontend/src/components/users/permissionGrouping.ts`

## 7. Point d'attention

- Les changements de rôles et permissions nécessitent une nouvelle session utilisateur pour être visibles dans le JWT.
- Les évolutions Prisma nécessitent une mise à jour du schéma en base avant redémarrage complet du service comptable.
