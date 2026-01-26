# Billing Service

Service de gestion de facturation et devis pour l'ERP de livraison.

## Port

Le service s'exécute sur le port **4012**.

## Fonctionnalités

### Factures
- CRUD complet sur les factures
- Gestion automatique de la numérotation (FAC-YYYYMM-NNNN)
- Ajout de lignes de facture
- Calculs automatiques HT/TVA/TTC
- Gestion des statuts (BROUILLON, EMISE, PAYEE, EN_RETARD, ANNULEE)
- Suivi des retards de paiement
- Statistiques de facturation
- Génération de PDF

### Devis
- CRUD complet sur les devis
- Gestion automatique de la numérotation (DEV-YYYYMM-NNNN)
- Ajout de lignes de devis
- Calculs automatiques HT/TVA/TTC
- Gestion des statuts (BROUILLON, ENVOYE, ACCEPTE, REFUSE, EXPIRE)
- Conversion de devis en facture
- Génération de PDF

### Paiements
- Enregistrement des paiements
- Méthodes de paiement (VIREMENT, CHEQUE, CARTE, ESPECES)
- Calcul automatique du total des paiements
- Mise à jour automatique du statut de facture

## Installation

```bash
cd services/billing-service
npm install
```

## Configuration

Créer un fichier `.env` :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/billing_db"
JWT_SECRET="your-secret-key-change-in-production"
PORT=4012
```

## Prisma

### Générer le client Prisma
```bash
npm run prisma:generate
```

### Créer et appliquer les migrations
```bash
npm run prisma:migrate
```

### Ouvrir Prisma Studio
```bash
npm run prisma:studio
```

## Démarrage

### Mode production
```bash
npm start
```

### Mode développement
```bash
npm run dev
```

## API Endpoints

### Factures

- `GET /api/factures` - Liste toutes les factures
- `GET /api/factures/:id` - Récupère une facture
- `POST /api/factures` - Crée une facture
- `PUT /api/factures/:id` - Met à jour une facture
- `DELETE /api/factures/:id` - Supprime une facture
- `POST /api/factures/:id/lignes` - Ajoute une ligne
- `POST /api/factures/:id/send` - Envoie une facture (statut EMISE)
- `GET /api/factures/stats` - Statistiques de facturation
- `GET /api/factures/retards` - Factures en retard
- `GET /api/factures/:id/pdf` - Génère le PDF

### Paiements

- `GET /api/paiements` - Liste tous les paiements
- `POST /api/paiements` - Crée un paiement
- `GET /api/paiements/facture/:factureId` - Paiements d'une facture
- `GET /api/paiements/facture/:factureId/total` - Total des paiements
- `DELETE /api/paiements/:id` - Supprime un paiement

### Devis

- `GET /api/devis` - Liste tous les devis
- `GET /api/devis/:id` - Récupère un devis
- `POST /api/devis` - Crée un devis
- `PUT /api/devis/:id` - Met à jour un devis
- `DELETE /api/devis/:id` - Supprime un devis
- `POST /api/devis/:id/lignes` - Ajoute une ligne
- `POST /api/devis/:id/accept` - Accepte un devis
- `POST /api/devis/:id/refuse` - Refuse un devis
- `POST /api/devis/:id/convert-to-facture` - Convertit en facture
- `POST /api/devis/:id/send` - Envoie un devis (statut ENVOYE)
- `GET /api/devis/:id/pdf` - Génère le PDF

### Système

- `GET /health` - Santé du service
- `GET /` - Informations sur l'API

## Authentification

Toutes les routes sont protégées par JWT. Inclure le token dans l'en-tête :

```
Authorization: Bearer <token>
```

## Modèles de données

### Facture
- `id` : UUID
- `numeroFacture` : Unique, auto-généré (FAC-YYYYMM-NNNN)
- `clientId` : ID du client
- `dateEmission` : Date d'émission
- `dateEcheance` : Date d'échéance
- `montantHT` : Montant hors taxes
- `montantTVA` : Montant TVA
- `montantTTC` : Montant toutes taxes comprises
- `status` : BROUILLON/EMISE/PAYEE/EN_RETARD/ANNULEE
- `notes` : Notes optionnelles

### LigneFacture
- `id` : UUID
- `factureId` : ID de la facture
- `description` : Description de la ligne
- `quantite` : Quantité
- `prixUnitaire` : Prix unitaire HT
- `tauxTVA` : Taux de TVA
- `montantHT` : Montant HT
- `montantTVA` : Montant TVA
- `montantTTC` : Montant TTC

### Paiement
- `id` : UUID
- `factureId` : ID de la facture
- `montant` : Montant du paiement
- `datePaiement` : Date du paiement
- `methodePaiement` : VIREMENT/CHEQUE/CARTE/ESPECES
- `reference` : Référence du paiement
- `notes` : Notes optionnelles

### Devis
- `id` : UUID
- `numeroDevis` : Unique, auto-généré (DEV-YYYYMM-NNNN)
- `clientId` : ID du client
- `dateEmission` : Date d'émission
- `dateValidite` : Date de validité
- `montantHT` : Montant hors taxes
- `montantTVA` : Montant TVA
- `montantTTC` : Montant toutes taxes comprises
- `status` : BROUILLON/ENVOYE/ACCEPTE/REFUSE/EXPIRE

### LigneDevis
- `id` : UUID
- `devisId` : ID du devis
- `description` : Description de la ligne
- `quantite` : Quantité
- `prixUnitaire` : Prix unitaire HT
- `tauxTVA` : Taux de TVA
- `montantHT` : Montant HT
- `montantTVA` : Montant TVA
- `montantTTC` : Montant TTC

## Utilitaires

### billingNumberGenerator.js
Génération automatique des numéros de facture et devis au format :
- Factures : FAC-YYYYMM-NNNN
- Devis : DEV-YYYYMM-NNNN

### tvaCalculator.js
Calculs automatiques de TVA et totaux :
- Calcul des montants HT, TVA, TTC
- Validation des taux de TVA (0%, 2.1%, 5.5%, 10%, 20%)
- Calcul des totaux de lignes

### pdfGenerator.js
Génération de documents PDF :
- PDF de facture
- PDF de devis

## Technologies

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Prisma** - ORM pour PostgreSQL
- **JWT** - Authentification
- **PDFKit** - Génération de PDF
- **Moment.js** - Manipulation de dates
- **Joi** - Validation des données

## Structure du projet

```
billing-service/
├── controllers/
│   ├── facture.controller.js
│   ├── paiement.controller.js
│   └── devis.controller.js
├── routes/
│   ├── facture.routes.js
│   ├── paiement.routes.js
│   └── devis.routes.js
├── middleware/
│   └── auth.js
├── utils/
│   ├── billingNumberGenerator.js
│   ├── tvaCalculator.js
│   └── pdfGenerator.js
├── prisma/
│   └── schema.prisma
├── package.json
├── server.js
└── README.md
```
