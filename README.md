# ParabellumGroups ERP

Plateforme ERP modulaire pour la gestion commerciale, CRM, projets, RH, comptabilite, achats, services techniques et communication.

## 🏗️ STRUCTURE DU PROJET

```
ParabellumGroups/
├── frontend/                 # Application web (Next.js)
├── services/                 # Micro-services Node.js
│   ├── api-gateway/          # Gateway / proxy
│   ├── auth-service/         # Authentification & permissions
│   ├── commercial-service/   # Prospects, pipeline, campagnes
│   ├── customer-service/     # CRM (clients, contacts, opportunites)
│   ├── billing-service/      # Devis & facturation
│   ├── project-service/      # Projets, taches, jalons
│   ├── hr-service/           # RH & paie
│   ├── technical-service/    # Missions & interventions
│   ├── procurement-service/  # Achats & logistique
│   ├── communication-service/# Emails & campagnes
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

- **Commercial** : prospection, pipeline, devis, campagnes.
- **CRM** : clients, contacts, documents, interactions.
- **Projets** : portefeuille projets, taches, jalons, planning.
- **RH / Paie** : employes, paie, exports, bulletins.
- **Technique** : missions, interventions, rapports.
- **Achats** : demandes, proformas, commandes, receptions.

## ✅ Bonnes pratiques

- Suivre la structure modulaire dans `frontend/src/components`.
- Preferer les services `services/*` pour toute logique metier serveur.
- Documenter les workflows metiers dans `docs/`.
