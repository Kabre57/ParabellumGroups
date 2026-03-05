# CRM Service

Service CRM complet de gestion des clients, contacts, contrats, opportunités et interactions pour l'ERP Parabellum.

## 📋 Fonctionnalités

- **Gestion complète des clients** avec classification avancée
- **Gestion des contacts** avec types et rôles
- **Gestion des contrats** avec avenants et renouvellements
- **Gestion des opportunités** avec pipeline de vente
- **Suivi des interactions** client (appels, emails, réunions)
- **Gestion des documents** avec versioning
- **Gestion des adresses** multiples par client
- **Statistiques et reporting** avancés
- **Historique complet** des modifications
- **Synchronisation** avec le service commercial

##  Structure de customer-service
customer-service/
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── controllers/
│   ├── client.controller.js
│   ├── contact.controller.js
│   ├── contrat.controller.js
│   ├── adresse.controller.js
│   ├── interaction.controller.js
│   ├── document.controller.js
│   ├── opportunite.controller.js
│   ├── typeClient.controller.js
│   └── secteur.controller.js
├── routes/
│   ├── client.routes.js
│   ├── contact.routes.js
│   ├── contrat.routes.js
│   ├── adresse.routes.js
│   ├── interaction.routes.js
│   ├── document.routes.js
│   ├── opportunite.routes.js
│   ├── typeClient.routes.js
│   └── secteur.routes.js
├── middleware/
│   └── auth.js
├── logs/
├── server.js
├── package.json
└── .env

## 🚀 Installation

```bash
# 1. Cloner le repository
git clone https://github.com/votre-entreprise/crm-service.git
cd crm-service

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos paramètres

# 4. Générer le client Prisma
npm run prisma:generate

# 5. Exécuter les migrations
npm run prisma:migrate

# 6. (Optionnel) Charger les données initiales
npm run prisma:seed

# 7. Démarrer le service
npm run dev
```

## Endpoints API
📚 API Endpoints
Clients
GET /api/clients - Liste des clients (pagination, filtres)

POST /api/clients - Créer un client

GET /api/clients/search - Recherche avancée

GET /api/clients/stats - Statistiques clients

GET /api/clients/:id - Détails d'un client

PUT /api/clients/:id - Modifier un client

PATCH /api/clients/:id/status - Modifier le statut

PATCH /api/clients/:id/priority - Modifier la priorité

DELETE /api/clients/:id/archive - Archiver un client

Contacts
GET /api/contacts - Liste des contacts

POST /api/contacts - Créer un contact

GET /api/contacts/:id - Détails d'un contact

PUT /api/contacts/:id - Modifier un contact

DELETE /api/contacts/:id - Supprimer un contact

PATCH /api/contacts/:id/principal - Définir comme principal

Contrats
GET /api/contrats - Liste des contrats

POST /api/contrats - Créer un contrat

GET /api/contrats/stats - Statistiques contrats

GET /api/contrats/expiring - Contrats expirant bientôt

GET /api/contrats/:id - Détails d'un contrat

PATCH /api/contrats/:id/status - Modifier le statut

POST /api/contrats/:id/avenants - Créer un avenant

Adresses
GET /api/adresses - Liste des adresses (filtre clientId)

POST /api/adresses - Créer une adresse

GET /api/adresses/:id - Détails d'une adresse

PUT /api/adresses/:id - Modifier une adresse

DELETE /api/adresses/:id - Supprimer une adresse

PATCH /api/adresses/:id/principal - Définir comme principale

Interactions
GET /api/interactions - Liste des interactions

POST /api/interactions - Créer une interaction

GET /api/interactions/stats - Statistiques interactions

GET /api/interactions/:id - Détails d'une interaction

PUT /api/interactions/:id - Modifier une interaction

DELETE /api/interactions/:id - Supprimer une interaction

PATCH /api/interactions/:id/link-task - Lier à une tâche

Documents
GET /api/documents - Liste des documents

POST /api/documents/upload - Uploader un document

GET /api/documents/expiring - Documents expirant bientôt

GET /api/documents/:id - Détails d'un document

PUT /api/documents/:id - Modifier un document

DELETE /api/documents/:id - Supprimer un document

PATCH /api/documents/:id/validity - Modifier la validité

Opportunités
GET /api/opportunites - Liste des opportunités

POST /api/opportunites - Créer une opportunité

GET /api/opportunites/pipeline - Statistiques pipeline

GET /api/opportunites/:id - Détails d'une opportunité

PUT /api/opportunites/:id - Modifier une opportunité

PATCH /api/opportunites/:id/stage - Changer l'étape

PATCH /api/opportunites/:id/close - Fermer l'opportunité

POST /api/opportunites/:id/products - Ajouter un produit

Types de clients
GET /api/type-clients - Liste des types

POST /api/type-clients - Créer un type

GET /api/type-clients/:id - Détails d'un type

PUT /api/type-clients/:id - Modifier un type

DELETE /api/type-clients/:id - Supprimer un type

PATCH /api/type-clients/:id/toggle-active - Activer/désactiver

## Authentification

Toutes les requêtes nécessitent le header `X-User-Id`.

## Exemples

### Créer un client

```bash
POST /api/clients
Headers: X-User-Id: user123
Body:
{
  "nom": "Acme Corp",
  "email": "contact@acme.com",
  "telephone": "0123456789",
  "adresse": "123 Rue Example",
  "typeClient": "ENTREPRISE",
  "status": "PROSPECT"
}
```

### Créer un contact

```bash
POST /api/contacts
Headers: X-User-Id: user123
Body:
{
  "clientId": "client-uuid",
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@acme.com",
  "telephone": "0123456789",
  "poste": "Directeur",
  "principal": true
}
```

### Créer un contrat

```bash
POST /api/contrats
Headers: X-User-Id: user123
Body:
{
  "clientId": "client-uuid",
  "titre": "Contrat de maintenance",
  "dateDebut": "2026-01-01",
  "dateFin": "2026-12-31",
  "montant": 12000.00,
  "status": "ACTIF"
}
```

## Port

Le service tourne sur le port **4008**.
