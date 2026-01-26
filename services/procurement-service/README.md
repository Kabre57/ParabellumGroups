# Procurement Service

Service de gestion des achats et approvisionnements pour le système ERP.

## Port

Le service écoute sur le port **4009**.

## Fonctionnalités

### Fournisseurs
- CRUD complet des fournisseurs
- Gestion du rating (note de 0 à 5)
- Statistiques par fournisseur (nombre de commandes, montant total)
- Gestion des statuts : ACTIF, INACTIF, BLOQUE

### Demandes d'Achat
- CRUD complet des demandes d'achat
- Numéro unique auto-généré (format: DA-YYYYMM-NNNN)
- Workflow d'approbation (approve/reject)
- Statuts : BROUILLON, SOUMISE, APPROUVEE, REJETEE, COMMANDEE
- Statistiques globales

### Bons de Commande
- CRUD complet des bons de commande
- Numéro unique auto-généré (format: BC-YYYYMM-NNNN)
- Gestion des lignes de commande
- Mise à jour du statut
- Récupération par fournisseur
- Statuts : BROUILLON, ENVOYE, CONFIRME, LIVRE, ANNULE

## Modèles de données

### Fournisseur
- `id` : UUID
- `nom` : String
- `email` : String (unique)
- `telephone` : String?
- `adresse` : String?
- `categorieActivite` : String?
- `status` : ACTIF | INACTIF | BLOQUE
- `rating` : Float? (0-5)

### DemandeAchat
- `id` : UUID
- `numeroDemande` : String (unique, auto: DA-YYYYMM-NNNN)
- `titre` : String
- `description` : String?
- `demandeurId` : String
- `dateDemande` : DateTime
- `montantEstime` : Decimal?
- `status` : BROUILLON | SOUMISE | APPROUVEE | REJETEE | COMMANDEE

### BonCommande
- `id` : UUID
- `numeroBon` : String (unique, auto: BC-YYYYMM-NNNN)
- `demandeAchatId` : String?
- `fournisseurId` : String
- `dateCommande` : DateTime
- `dateLivraison` : DateTime?
- `montantTotal` : Decimal
- `status` : BROUILLON | ENVOYE | CONFIRME | LIVRE | ANNULE

### LigneCommande
- `id` : UUID
- `bonCommandeId` : String
- `designation` : String
- `quantite` : Int
- `prixUnitaire` : Decimal
- `montant` : Decimal

## API Endpoints

### Fournisseurs (`/api/fournisseurs`)
- `GET /` - Liste avec pagination et filtres
- `POST /` - Créer un fournisseur
- `GET /:id` - Détails d'un fournisseur
- `PUT /:id` - Modifier un fournisseur
- `PATCH /:id/rating` - Mettre à jour le rating
- `GET /:id/stats` - Statistiques du fournisseur
- `DELETE /:id` - Supprimer un fournisseur

### Demandes d'Achat (`/api/demandes-achat`)
- `GET /` - Liste avec pagination et filtres
- `POST /` - Créer une demande
- `GET /stats` - Statistiques globales
- `GET /:id` - Détails d'une demande
- `PUT /:id` - Modifier une demande
- `PATCH /:id/approve` - Approuver une demande
- `PATCH /:id/reject` - Rejeter une demande
- `DELETE /:id` - Supprimer une demande

### Bons de Commande (`/api/bons-commande`)
- `GET /` - Liste avec pagination et filtres
- `POST /` - Créer un bon de commande
- `GET /fournisseur/:fournisseurId` - Bons par fournisseur
- `GET /:id` - Détails d'un bon
- `PUT /:id` - Modifier un bon
- `POST /:id/lignes` - Ajouter une ligne
- `PATCH /:id/status` - Mettre à jour le statut
- `DELETE /:id` - Supprimer un bon

## Installation

```bash
# Installer les dépendances
npm install

# Générer le client Prisma
npm run prisma:generate

# Exécuter les migrations
npm run prisma:migrate
```

## Configuration

Créer un fichier `.env` :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/procurement_db"
PORT=4009
NODE_ENV=development
```

## Démarrage

```bash
# Mode développement
npm run dev

# Mode production
npm start
```

## Authentification

Toutes les routes nécessitent un header `X-User-Id` pour l'authentification.

```bash
curl -H "X-User-Id: user-123" http://localhost:4009/api/fournisseurs
```

## Health Check

```bash
curl http://localhost:4009/health
```

Réponse :
```json
{
  "status": "OK",
  "service": "procurement-service",
  "timestamp": "2026-01-21T10:00:00.000Z"
}
```
