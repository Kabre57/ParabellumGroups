# ParabellumGroups ERP

Plateforme ERP modulaire pour la gestion commerciale (prospection, pipeline, relances), le CRM, les projets, les RH, la comptabilité, les achats, les services techniques et la communication.

## 🏗️ STRUCTURE DU PROJET

```
ParabellumGroups/
├── frontend/                 # Application web (Next.js)
├── services/                 # Micro-services Node.js
│   ├── api-gateway/          # Gateway / proxy
│   ├── auth-service/         # Authentification & permissions
│   ├── commercial-service/    # Prospects, pipeline, relances, campagnes
│   ├── customer-service/      # CRM : clients, contacts, opportunités
│   ├── billing-service/       # Devis, facturation et comptabilité
│   ├── project-service/       # Projets, tâches et jalons
│   ├── technical-service/     # Missions et interventions
│   ├── procurement-service/   # Achats et logistique
│   ├── communication-service/ # E-mails et campagnes multicanales
│   ├── analytics-service/     # Indicateurs et rapports
│   └── notification-service/  # Notifications
├── docker/nginx/              # Configuration du reverse proxy
├── docs/                      # Documentation métier et technique
├── scripts/                   # Scripts utilitaires
└── docker-compose.yml         # Stack locale et production
```

## 🚀 Lancer le projet

```
docker compose up -d --build
```

Pour les mises à jour en production, utilisez le script de déploiement sans
interruption :

```
./scripts/deploy-blue-green.sh
```

Le guide des migrations, de la mise à jour VPS et des sauvegardes/restaurations est dans [`docs/deploiement-et-exploitation.md`](docs/deploiement-et-exploitation.md).

## 🔧 Validation

```
pnpm run validate
```

Cette commande vérifie les types et la syntaxe du frontend, la syntaxe
JavaScript de tous les services, construit le service de notifications et
exécute les suites de tests déjà configurées pour l’authentification, la
passerelle, la facturation et le CRM. Elle ne remplace pas des tests métier
bout en bout pour chaque domaine.

## 📁 Services principaux

- **Commercial** : prospection, prospection terrain, pipeline, devis, campagnes et relances.
- **CRM** : clients, contacts, documents et interactions.
- **Projets** : portefeuille projets, tâches, jalons et planning.
- **RH / Paie** : les écrans utilisent l’application dédiée configurée par `HR_SERVICE_URL`.
- **Technique** : missions, interventions, rapports.
- **Achats** : demandes, proformas, commandes et réceptions.

## ✅ Bonnes pratiques

- Suivre la structure modulaire de `frontend/src/components`.
- Préférer les services de `services/` pour la logique métier côté serveur.
- Documenter les workflows métier dans `docs/`.

---

## 🧩 Flux RH & Paie (schéma)

```
RH / PAIE
Employés + Contrats
   │
   ▼
Calcul paie via l’application RH dédiée
   │
   ▼
Bulletin généré → Validation → Paiement
   │
   ├─► Export DISA / DGI
   ├─► PDF individuel (bulletin)
   └─► PDF groupé (registre)
```

## 🏭 Installation production (guide rapide)

1) Déployer le projet sur le serveur (ex: `/opt/ParabellumGroups`).
2) Copier les variables d’environnement (voir section suivante).
3) Démarrer la stack Docker :

```
docker compose up -d --build
```

4) Vérifier la santé des services :

```
docker compose ps
```

5) Accéder à l’ERP via Nginx / reverse-proxy.

For each later update, run `./scripts/deploy-blue-green.sh`. It rebuilds the
inactive frontend/API pair, waits for its health checks, then reloads Nginx to
it. The live pair remains available until the switch.

## 🔐 Variables d’environnement (par service)

### Communes
- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL`
- `JWT_SECRET`
- `S3_BUCKET_NAME`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE`

### `auth-service`
- `JWT_SECRET`
- `TOKEN_EXPIRES_IN`

### `commercial-service`
- `DATABASE_URL`
- `CRM_SERVICE_URL`

### `customer-service`
- `DATABASE_URL`

### `billing-service`
- `DATABASE_URL`
- `COMMERCIAL_SERVICE_URL`

### `project-service`
- `DATABASE_URL`

### API RH externe
- `HR_SERVICE_URL` : URL de base de l’application RH/paie dédiée. Les écrans RH de ce dépôt passent par cette API via la passerelle.

### `communication-service`
- `DATABASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

### `notification-service`
- `DATABASE_URL`

### `analytics-service`
- `DATABASE_URL`

## 🧱 Conventions modules front

- Chaque domaine vit dans `frontend/src/components/<domaine>/...`
- Les pages Next.js restent dans `frontend/app/(dashboard)/dashboard/<domaine>/...`
- Les types et helpers réutilisables vont dans `frontend/src/types` et `frontend/src/utils`
- Les hooks métier vont dans `frontend/src/hooks`

#
