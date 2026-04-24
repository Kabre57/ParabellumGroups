# ParabellumGroups ERP

Plateforme ERP modulaire pour la gestion commerciale (prospection, pipeline, relances), CRM, projets, RH, comptabilite, achats, services techniques et communication.

## 🏗️ STRUCTURE DU PROJET

```
ParabellumGroups/
├── frontend/                 # Application web (Next.js)
├── services/                 # Micro-services Node.js
│   ├── api-gateway/          # Gateway / proxy
│   ├── auth-service/         # Authentification & permissions
│   ├── commercial-service/   # Prospects, pipeline, relances, campagnes
│   ├── customer-service/     # CRM (clients, contacts, opportunites)
│   ├── billing-service/      # Devis & facturation
│   ├── project-service/      # Projets, taches, jalons
│   ├── hr-service/           # RH & paie (bulletins, exports, paie CI)
│   ├── technical-service/    # Missions & interventions
│   ├── procurement-service/  # Achats & logistique
│   ├── communication-service/# Emails & campagnes multicanal
│   ├── analytics-service/    # KPI & rapports
│   └── notification-service/ # Notifications
├── docs/                     # Documentation metier & technique
├── scripts/                  # Scripts utilitaires
├── docker-compose.yml        # Stack locale
└── nginx/                    # Config reverse-proxy
```

## 🚀 Lancer le projet

```
docker compose up -d --build
```

## 🔧 Tests & validation

```
npm run validate
```

## 📁 Services principaux

- **Commercial** : prospection, prospection terrain, pipeline, devis, campagnes/relances.
- **CRM** : clients, contacts, documents, interactions.
- **Projets** : portefeuille projets, taches, jalons, planning.
- **RH / Paie** : employes, paie, exports, bulletins, conformité CNPS/DGI/CMU/ITS.
- **Technique** : missions, interventions, rapports.
- **Achats** : demandes, proformas, commandes, receptions.

## ✅ Bonnes pratiques

- Suivre la structure modulaire dans `frontend/src/components`.
- Preferer les services `services/*` pour toute logique metier serveur.
- Documenter les workflows metiers dans `docs/`.

---

## 🧩 Flux RH & Paie (schéma)

```
RH / PAIE
Employés + Contrats
   │
   ▼
Calcul paie (brut, primes, retenues, IGR)
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

### `hr-service`
- `DATABASE_URL`
- `PAYROLL_CURRENCY` (ex: `XOF`)

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