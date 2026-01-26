# HR Service

Service de gestion des ressources humaines pour le système ERP.

## Port
**4010**

## Fonctionnalités

### 1. Gestion des Employés
- CRUD complet des employés
- Recherche et filtrage par statut, département
- Statistiques globales et par département
- Gestion des statuts : ACTIF, CONGE, MALADIE, DEMISSION

### 2. Gestion des Congés
- Demandes de congés (ANNUEL, MALADIE, SANS_SOLDE, PARENTAL)
- Workflow d'approbation/rejet
- Calcul du solde de congés par employé
- Calendrier des congés
- Statuts : DEMANDE, APPROUVE, REJETE, ANNULE

### 3. Gestion des Présences
- Enregistrement des présences quotidiennes
- Calcul automatique des heures travaillées
- Types de présence : BUREAU, TELETRAVAIL, DEPLACEMENT, ABSENCE
- Statistiques de présence par employé
- Export des données de présence

### 4. Évaluations
- Création et suivi des évaluations d'employés
- Notes globales et compétences détaillées
- Objectifs et commentaires
- Historique des évaluations par employé

## Installation

```bash
cd services/hr-service
npm install
```

## Configuration

Créer un fichier `.env` :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/hr_db"
PORT=4010
NODE_ENV=development
```

## Démarrage

```bash
# Générer le client Prisma
npm run prisma:generate

# Mode développement
npm run dev

# Mode production
npm start
```

## API Endpoints

### Employés
- `GET /api/employes` - Liste des employés (pagination, filtres)
- `GET /api/employes/:id` - Détails d'un employé
- `GET /api/employes/stats` - Statistiques globales
- `GET /api/employes/departement/:departement` - Employés par département
- `POST /api/employes` - Créer un employé
- `PUT /api/employes/:id` - Modifier un employé
- `DELETE /api/employes/:id` - Supprimer un employé

### Congés
- `GET /api/conges` - Liste des congés (pagination, filtres)
- `GET /api/conges/:id` - Détails d'un congé
- `GET /api/conges/solde/:employeId` - Solde de congés
- `GET /api/conges/calendrier` - Calendrier des congés
- `POST /api/conges` - Créer une demande de congé
- `PUT /api/conges/:id` - Modifier un congé
- `DELETE /api/conges/:id` - Supprimer un congé
- `PATCH /api/conges/:id/approve` - Approuver un congé
- `PATCH /api/conges/:id/reject` - Rejeter un congé

### Présences
- `GET /api/presences/employe/:employeId` - Présences d'un employé
- `GET /api/presences/stats` - Statistiques de présence
- `GET /api/presences/export` - Export des présences
- `POST /api/presences` - Créer une présence
- `PUT /api/presences/:id` - Modifier une présence

### Évaluations
- `GET /api/evaluations` - Liste des évaluations (pagination, filtres)
- `GET /api/evaluations/:id` - Détails d'une évaluation
- `GET /api/evaluations/employe/:employeId` - Évaluations d'un employé
- `POST /api/evaluations` - Créer une évaluation
- `PUT /api/evaluations/:id` - Modifier une évaluation
- `DELETE /api/evaluations/:id` - Supprimer une évaluation

## Authentification

Toutes les routes nécessitent le header `X-User-Id` pour l'authentification.

## Modèles de Données

### Employe
```json
{
  "id": "uuid",
  "matricule": "string (unique)",
  "nom": "string",
  "prenom": "string",
  "email": "string (unique)",
  "telephone": "string",
  "dateEmbauche": "datetime",
  "poste": "string",
  "departement": "string",
  "salaire": "decimal",
  "status": "ACTIF|CONGE|MALADIE|DEMISSION"
}
```

### Conge
```json
{
  "id": "uuid",
  "employeId": "uuid",
  "typeConge": "ANNUEL|MALADIE|SANS_SOLDE|PARENTAL",
  "dateDebut": "datetime",
  "dateFin": "datetime",
  "nbJours": "number",
  "motif": "string",
  "status": "DEMANDE|APPROUVE|REJETE|ANNULE",
  "approbateurId": "uuid",
  "dateApprobation": "datetime"
}
```

### Presence
```json
{
  "id": "uuid",
  "employeId": "uuid",
  "date": "datetime",
  "heureArrivee": "datetime",
  "heureDepart": "datetime",
  "duree": "decimal",
  "type": "BUREAU|TELETRAVAIL|DEPLACEMENT|ABSENCE"
}
```

### Evaluation
```json
{
  "id": "uuid",
  "employeId": "uuid",
  "evaluateurId": "uuid",
  "dateEvaluation": "datetime",
  "periode": "string",
  "noteGlobale": "decimal (0-5)",
  "competences": "json",
  "commentaires": "string",
  "objectifs": "json"
}
```

## Dépendances

- Express.js - Framework web
- Prisma - ORM
- PostgreSQL - Base de données
- Winston - Logging
- Helmet - Sécurité
- Express-validator - Validation

## Tests

```bash
npm test
```

## Contribution

Voir CONTRIBUTING.md pour les guidelines de contribution.
