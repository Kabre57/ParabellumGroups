# Project Service - Parabellum Groups

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
pnpm install

# Configurer la base de données
cp .env.example .env
# Éditer .env avec vos paramètres

# Générer le client Prisma
pnpm run prisma:generate

# Exécuter les migrations
pnpm run prisma:migrate

# Démarrer le service
pnpm start
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
pnpm run dev

# Interface Prisma Studio
pnpm run prisma:studio

# Générer le client Prisma après modification du schéma
pnpm run prisma:generate
```

## Port

Le service écoute par défaut sur le port **4008**.

## Sécurité

- Authentification requise sur toutes les routes (sauf /health)
- Headers de sécurité via helmet
- CORS configuré
- Validation des entrées avec express-validator

### Périmètre entreprise

Chaque requête métier utilise une seule entreprise. `X-Enterprise-Id`,
`query.enterpriseId` et `body.enterpriseId`, lorsqu’ils sont fournis, doivent
être des entiers positifs identiques. Sinon la requête reçoit `400`. En
l’absence de sélection, l’entreprise du JWT est utilisée. Un compte ordinaire
doit être rattaché à une entreprise et peut sélectionner cette entreprise ou
une filiale active accessible. Les rôles administrateurs reconnus et la
permission explicite `enterprises.read_all` peuvent sélectionner une autre
entreprise active. `enterprises.read` seul n’ouvre pas d’accès global.

Le service vérifie la hiérarchie auprès de `AUTH_SERVICE_URL` avec le jeton
Bearer du demandeur et un délai de cinq secondes, sans cache entre
utilisateurs. L’échec de cette vérification renvoie `503`, sans élargir la
lecture. Une sélection inaccessible renvoie `403`; une ressource d’une autre
entreprise renvoie `404`, y compris ses tâches, jalons et assignations.
Les listes, compteurs et statistiques appliquent la même restriction.
Les écritures ne déplacent ni l’entreprise ni le parent d’une ressource.

Un nouveau projet exige un client CRM de l’entreprise active. Une assignation
exige un utilisateur actif rattaché à cette même entreprise. Les références
sont contrôlées par appel Bearer à `CUSTOMERS_SERVICE_URL` et
`AUTH_SERVICE_URL`. Configurez ces URL pour les exécutions hors Docker
(valeurs par défaut: `http://customer-service:4008` et
`http://auth-service:4001`). Si l’API auth refuse la consultation d’un
utilisateur de filiale, l’assignation est refusée; aucun contournement n’est
effectué.

### Migration et données historiques

La migration `20261106120000_scope_projects_to_enterprises` ajoute seulement
`Projet.enterpriseId` nullable et son index. Elle ne supprime, ne réaffecte et
ne rattache aucune donnée existante. Les projets dont `enterpriseId` vaut
`null`, ainsi que leurs enfants, sont masqués de tous les contextes ordinaires,
y compris des administrateurs. Avant le déploiement, sauvegardez les données
et préparez leur rattachement vérifié; ne choisissez pas une entreprise par
défaut.

Le script `scripts/backfill-project-enterprises.js` exige un manifeste relu et
vérifie chaque projet historique, son client CRM et l’entreprise active avant
toute écriture. Exemple de fichier JSON :

```json
[
  { "projectId": "projet-uuid", "clientId": "client-crm-uuid", "enterpriseId": 7 }
]
```

Depuis le dossier du service, après application explicite de la migration et
génération du client Prisma dans l’environnement choisi :

```sh
# DATABASE_URL, AUTH_SERVICE_URL, CUSTOMERS_SERVICE_URL et
# PROJECT_BACKFILL_TOKEN sont configurés dans l’environnement.
# Le jeton doit appartenir à un compte global actif; ne le commitez pas.
node scripts/backfill-project-enterprises.js --mapping mapping-verifie.json

# Seulement après revue de la prévisualisation et sauvegarde :
node scripts/backfill-project-enterprises.js --mapping mapping-verifie.json --apply
```

Sans `--apply`, le script effectue uniquement des lectures et produit un
rapport JSON. Avec `--apply`, tout le manifeste est d’abord vérifié, puis les
changements sont appliqués dans une transaction. Chaque mise à jour exige
toujours le client attendu et `enterpriseId = null`; un rattachement existant
ou un changement concurrent fait échouer le lot. Les tâches et jalons
héritent du périmètre du projet et ne nécessitent aucune attribution séparée.
Le script vérifie aussi que tous les utilisateurs déjà assignés aux tâches
sont actifs et appartiennent à l’entreprise du manifeste. Une assignation
étrangère ou inactive bloque le lot avant toute écriture. Le script ne
réécrit pas les assignations existantes : elles doivent être revues et
corrigées séparément avant de relancer la prévisualisation.

### Vérification locale sans base de données

```sh
pnpm test
```

Les tests exécutent les contrôleurs avec un double de Prisma et des réponses
HTTP contrôlées. Ils couvrent deux entreprises, une filiale, les ressources
historiques non rattachées, les écritures et références étrangères, les
statistiques, la panne auth et la prévisualisation du rattachement. Ils ne
remplacent pas une validation PostgreSQL et des parcours HTTP sur une copie
de l’environnement.

## Auteurs

Parabellum Team

## Licence

MIT
