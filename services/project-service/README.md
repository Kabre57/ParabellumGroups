# Project Service - Parabellum ERP

Service de gestion de projets, tâches et jalons pour l'ERP Parabellum.

## Fonctionnalités

### Projets
- Création de projets avec numérotation auto-générée (PRJ-YYYYMM-NNNN)
- Gestion complète CRUD
- Suivi budget vs coût réel
- Statuts : PLANIFIE, EN_COURS, SUSPENDU, TERMINE, ANNULE
- Priorités : BASSE, MOYENNE, HAUTE, CRITIQUE
- Statistiques détaillées par projet

### Tâches
- Création et gestion de tâches liées aux projets
- Assignation multi-utilisateurs avec rôles
- Suivi durée estimée vs durée réelle
- Statuts : A_FAIRE, EN_COURS, TERMINEE, BLOQUEE
- Filtrage par projet, statut, priorité, utilisateur

### Jalons
- Définition de jalons pour les projets
- Suivi des échéances
- Statuts : PLANIFIE, ATTEINT, MANQUE

## Installation

```bash
# Installer les dépendances
npm install

# Configurer la base de données
cp .env.example .env
# Éditer .env avec vos paramètres

# Générer le client Prisma
npm run prisma:generate

# Exécuter les migrations
npm run prisma:migrate

# Démarrer le service
npm start
```

## Configuration

Variables d'environnement dans `.env` :

```env
NODE_ENV=development
PORT=4008
DATABASE_URL="postgresql://user:password@localhost:5432/parabellum_projects?schema=public"
```

## API Endpoints

### Projets

- `POST /api/projets` - Créer un projet
- `GET /api/projets` - Liste des projets (avec filtres)
- `GET /api/projets/:id` - Détails d'un projet
- `PUT /api/projets/:id` - Mettre à jour un projet
- `DELETE /api/projets/:id` - Supprimer un projet
- `GET /api/projets/:id/stats` - Statistiques d'un projet

### Tâches

- `POST /api/taches` - Créer une tâche
- `GET /api/taches` - Liste des tâches (avec filtres)
- `GET /api/taches/:id` - Détails d'une tâche
- `PUT /api/taches/:id` - Mettre à jour une tâche
- `DELETE /api/taches/:id` - Supprimer une tâche
- `POST /api/taches/:id/assign` - Assigner un utilisateur
- `DELETE /api/taches/:id/assign/:userId` - Retirer une assignation
- `PATCH /api/taches/:id/complete` - Marquer comme terminée

### Jalons

- `POST /api/jalons` - Créer un jalon
- `GET /api/jalons` - Liste des jalons (avec filtres)
- `GET /api/jalons/:id` - Détails d'un jalon
- `PUT /api/jalons/:id` - Mettre à jour un jalon
- `DELETE /api/jalons/:id` - Supprimer un jalon
- `PATCH /api/jalons/:id/status` - Mettre à jour le statut

### Santé

- `GET /health` - Vérification de l'état du service

## Exemples d'utilisation

### Créer un projet

```bash
POST /api/projets
Authorization: Bearer <token>
Content-Type: application/json

{
  "nom": "Développement ERP Module RH",
  "description": "Création du module de gestion des ressources humaines",
  "clientId": "client-uuid",
  "dateDebut": "2026-01-21",
  "dateFin": "2026-06-30",
  "budget": 50000,
  "status": "PLANIFIE",
  "priorite": "HAUTE"
}
```

### Créer une tâche

```bash
POST /api/taches
Authorization: Bearer <token>
Content-Type: application/json

{
  "projetId": "projet-uuid",
  "titre": "Conception base de données",
  "description": "Modélisation des entités RH",
  "dateDebut": "2026-01-22",
  "dateEcheance": "2026-01-30",
  "dureeEstimee": 40,
  "priorite": "HAUTE"
}
```

### Assigner une tâche

```bash
POST /api/taches/:id/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "role": "Développeur principal"
}
```

### Obtenir les statistiques d'un projet

```bash
GET /api/projets/:id/stats
Authorization: Bearer <token>
```

Réponse :
```json
{
  "projet": {
    "id": "...",
    "numeroProjet": "PRJ-202601-0001",
    "nom": "Développement ERP Module RH",
    "status": "EN_COURS",
    "budget": "50000.00",
    "coutReel": "15000.00"
  },
  "taches": {
    "total": 12,
    "aFaire": 5,
    "enCours": 4,
    "terminees": 3,
    "bloquees": 0
  },
  "jalons": {
    "total": 4,
    "planifies": 2,
    "atteints": 2,
    "manques": 0
  },
  "durees": {
    "estimee": 320,
    "reelle": 180
  },
  "progression": {
    "pourcentage": 25
  }
}
```

## Technologies

- Node.js / Express
- Prisma ORM
- PostgreSQL
- express-validator
- helmet (sécurité)
- cors
- winston (logging)

## Structure du projet

```
project-service/
├── prisma/
│   └── schema.prisma
├── controllers/
│   ├── projet.controller.js
│   ├── tache.controller.js
│   └── jalon.controller.js
├── routes/
│   ├── projet.routes.js
│   ├── tache.routes.js
│   └── jalon.routes.js
├── middleware/
│   └── auth.js
├── utils/
│   └── projetNumberGenerator.js
├── .env
├── package.json
├── server.js
└── README.md
```

## Développement

```bash
# Mode développement avec rechargement automatique
npm run dev

# Interface Prisma Studio
npm run prisma:studio

# Générer le client Prisma après modification du schéma
npm run prisma:generate
```

## Port

Le service écoute par défaut sur le port **4008**.

## Sécurité

- Authentification requise sur toutes les routes (sauf /health)
- Headers de sécurité via helmet
- CORS configuré
- Validation des entrées avec express-validator

## Auteurs

Parabellum Team

## Licence

MIT
