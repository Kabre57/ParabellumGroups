# Service Commercial - Gestion de la Prospection

Ce service gère toutes les opérations liées à la prospection commerciale.

## Installation

1. Installer les dépendances :
```bash
cd services/commercial-service
npm install
```

2. Créer le fichier .env :
```bash
cp .env.example .env
```

Contenu du .env :
```
PORT=4004
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/parabellum_commercial?schema=public"
JWT_SECRET=416500b0f18082fb66834e3a45d550cfc154218b718d8fdb91185168c873682c2bfb9a4c6bf69e5b6060bc5b22366f54fedfd5a3da38065246d0093c19ea861b
NODE_ENV=development
```

3. Créer la base de données PostgreSQL :
```bash
psql -U postgres
CREATE DATABASE parabellum_commercial;
\q
```

4. Générer le client Prisma :
```bash
npm run prisma:generate
```

5. Appliquer les migrations :
```bash
npm run prisma:migrate
```

6. Démarrer le service :
```bash
npm run dev
```

Le service sera disponible sur http://localhost:4004

## Endpoints API

### Prospects

- `GET /api/prospects` - Liste des prospects avec filtres
  - Paramètres query : page, limit, stage, assignedToId, priority, search, isConverted
  
- `GET /api/prospects/stats` - Statistiques de prospection

- `GET /api/prospects/:id` - Détails d'un prospect

- `POST /api/prospects` - Créer un prospect

- `PUT /api/prospects/:id` - Mettre à jour un prospect

- `DELETE /api/prospects/:id` - Supprimer un prospect

- `POST /api/prospects/:id/move` - Déplacer un prospect dans le workflow
  - Body : `{ "stage": "contact", "notes": "..." }`

- `POST /api/prospects/:id/convert` - Convertir un prospect en client
  - Body : `{ "customerId": "..." }`

- `GET /api/prospects/:id/activities` - Activités d'un prospect

- `POST /api/prospects/:id/activities` - Ajouter une activité
  - Body : `{ "type": "call", "subject": "...", "description": "..." }`

## Modèle de données

### Prospect
- Informations entreprise : nom, secteur, effectif, CA
- Contact principal : nom, poste, email, téléphone
- Adresse complète
- Workflow : étape (preparation, research, contact, discovery, proposal, won, lost)
- Priorité : A (haute), B (moyenne), C (basse)
- Score de qualification : 0-100
- Valeur potentielle et probabilité de closing
- Tags et notes

### ProspectActivity
- Types : call, email, meeting, note, task, conversion
- Sujet, description, résultat
- Dates : planification et réalisation
- Durée

### ProspectionStats
- Statistiques globales et par étape
- Taux de conversion
- Activités récentes

## Frontend

Les pages frontend sont dans :
- `frontend/app/(dashboard)/dashboard/commercial/prospects/page.tsx` - Page principale du workflow
- `frontend/src/components/commercial/` - Composants modales

Le service API frontend est dans :
- `frontend/src/shared/api/services/commercial.ts`

Les types TypeScript sont dans :
- `frontend/src/shared/api/types.ts`
