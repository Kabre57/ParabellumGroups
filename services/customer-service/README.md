# Customer Service

Service de gestion des clients, contacts et contrats pour l'ERP Parabellum.

## Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Modifier .env avec vos paramètres

# Générer le client Prisma
npm run prisma:generate

# Exécuter les migrations
npm run prisma:migrate

# Démarrer le service
npm run dev
```

## Endpoints API

### Clients

- `GET /api/clients` - Liste des clients (pagination, filtres: status, typeClient, search)
- `POST /api/clients` - Créer un client
- `GET /api/clients/:id` - Détails d'un client
- `PUT /api/clients/:id` - Modifier un client
- `PATCH /api/clients/:id/status` - Modifier le status d'un client

### Contacts

- `GET /api/contacts` - Liste des contacts (filtre: clientId)
- `POST /api/contacts` - Créer un contact
- `GET /api/contacts/:id` - Détails d'un contact
- `PUT /api/contacts/:id` - Modifier un contact
- `DELETE /api/contacts/:id` - Supprimer un contact

### Contrats

- `GET /api/contrats` - Liste des contrats (pagination, filtres: clientId, status)
- `POST /api/contrats` - Créer un contrat
- `GET /api/contrats/:id` - Détails d'un contrat
- `PATCH /api/contrats/:id/status` - Modifier le status d'un contrat
- `GET /api/contrats/stats` - Statistiques des contrats

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

Le service tourne sur le port **4007**.
