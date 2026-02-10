# 🚀 Parabellum ERP - Système de Gestion Intégré

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/parabellum/erp)
[![Docker](https://img.shields.io/badge/docker-ready-green.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)]()

> Système ERP complet pour la gestion d'entreprise : CRM, Facturation, Projets, RH, Services Techniques, Achats, et plus encore.

---

## 📋 Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Documentation](#-documentation)
- [Contributions](#-contributions)

---

## 🎯 Vue d'ensemble

**Parabellum ERP** est une solution de gestion d'entreprise moderne basée sur une architecture microservices. Elle permet de centraliser et automatiser tous les processus métier : de la prospection client jusqu'à la facturation, en passant par la gestion de projets, les services techniques, les ressources humaines et les achats.

### 🎨 Captures d'écran

*(À ajouter : screenshots du dashboard, CRM, facturation)*

---

## ✨ Fonctionnalités

### 📊 **Tableau de Bord**
- Vue d'ensemble de l'activité en temps réel
- KPIs personnalisables (CA, clients, projets, interventions)
- Graphiques d'évolution
- Alertes et notifications

### 🎯 **Commercial & CRM**
- Pipeline de prospection visuel (Kanban)
- Gestion des leads et opportunités
- Suivi des devis et propositions
- Historique complet des interactions
- Gestion des clients et contacts

### 💰 **Facturation**
- Création de factures et devis
- Suivi des paiements
- Relances automatiques
- Export comptable
- Génération PDF

### 🔧 **Services Techniques**
- Planning des interventions
- Gestion des missions
- Équipe technique et spécialités
- Rapports d'intervention
- Suivi du matériel

### 📁 **Gestion de Projets**
- Projets et tâches
- Planning Gantt
- Jalons (milestones)
- Feuilles de temps
- Suivi budgétaire

### 🛒 **Achats & Logistique**
- Gestion des fournisseurs
- Bons de commande
- Demandes d'achat
- Gestion des stocks
- Inventaires

### 👨‍💼 **Ressources Humaines**
- Gestion des employés
- Contrats de travail
- Paie et salaires
- Gestion des congés
- Évaluations

### 📧 **Communication**
- Messagerie interne
- Campagnes email
- Templates personnalisables
- Notifications push

### 🔐 **Administration**
- Gestion des utilisateurs
- Rôles et permissions granulaires
- Services (départements)
- Paramètres système
- Audit logs

---

## 🏗️ Architecture

### Stack technique

**Frontend**
- ⚛️ Next.js 16 (App Router)
- ⚡ React 19
- 📘 TypeScript
- 🎨 TailwindCSS
- 🔄 React Query
- 📡 Axios

**Backend**
- 🟢 Node.js + Express
- 🔀 API Gateway (reverse proxy)
- 🗄️ Prisma ORM
- 🐘 PostgreSQL 16
- 🔴 Redis 7

**Infrastructure**
- 🐳 Docker + Docker Compose
- 🔒 JWT Authentication
- 📈 Rate Limiting
- 🛡️ CORS & Helmet
- 📊 Metrics & Tracing

### Microservices (12 services)

```
Frontend (3000) → API Gateway (3001) → Microservices
                                       ├─ auth-service (4001)
                                       ├─ communication-service (4002)
                                       ├─ technical-service (4003)
                                       ├─ commercial-service (4004)
                                       ├─ inventory-service (4005)
                                       ├─ project-service (4006)
                                       ├─ procurement-service (4007)
                                       ├─ customer-service (4008)
                                       ├─ hr-service (4009)
                                       ├─ billing-service (4010)
                                       ├─ analytics-service (4011)
                                       └─ notification-service (4012)
```

### Base de données

12 bases PostgreSQL indépendantes (une par microservice) + Redis pour le cache et rate limiting.

---

## 🚀 Installation

### Prérequis

- [Docker](https://www.docker.com/) (v24+)
- [Docker Compose](https://docs.docker.com/compose/) (v2.20+)
- [Git](https://git-scm.com/)
- 8 Go RAM minimum
- 10 Go espace disque

### Installation rapide

```bash
# 1. Cloner le repository
git clone https://github.com/votre-org/parabellum-erp.git
cd parabellum-erp

# 2. Copier les fichiers d'environnement
cp .env.example .env

# 3. Démarrer tous les services
docker-compose up -d

# 4. Attendre que tout démarre (10-20 secondes)
docker-compose logs -f

# 5. Initialiser la base de données (première fois)
docker exec auth-service npx prisma migrate deploy
docker exec auth-service node prisma/seed.js
docker exec auth-service node scripts/create-admin.js

# 6. Accéder à l'application
# Frontend : http://localhost:3000
# API Gateway : http://localhost:3001
```

### Identifiants par défaut

**Administrateur** :
- Email : `admin@parabellum.com`
- Mot de passe : `Admin@2026!`

---

## 📚 Documentation

### Guides disponibles

| Document | Description | Lien |
|----------|-------------|------|
| **Manuel Utilisateur** | Guide complet pour les utilisateurs finaux | [MANUEL_UTILISATEUR.md](./MANUEL_UTILISATEUR.md) |
| **Documentation Technique** | Architecture, API, système d'autorisation | [DOCUMENTATION_TECHNIQUE.md](./DOCUMENTATION_TECHNIQUE.md) |
| **Tutoriel Docker** | Commandes Docker utiles | [TUTORIEL_DOCKER.md](./TUTORIEL_DOCKER.md) |
| **Reset Database** | Procédure de réinitialisation | [RESET_DATABASE.md](./RESET_DATABASE.md) |
| **Routes Modulaires** | Configuration API Gateway | [services/api-gateway/routes/services/README.md](./services/api-gateway/routes/services/README.md) |

### API Documentation

Chaque microservice expose sa documentation sur `/api-docs` :
- Auth : http://localhost:4001/api-docs
- Customers : http://localhost:4008/api-docs
- Billing : http://localhost:4010/api-docs
- *etc.*

---

## 🔧 Configuration

### Variables d'environnement

Fichier `.env` racine :
```env
# Base de données
DB_USER=parabellum
DB_PASSWORD=parabellum2025

# Environnement
NODE_ENV=development
```

### Ports utilisés

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| API Gateway | 3001 | http://localhost:3001 |
| Auth Service | 4001 | http://localhost:4001 |
| *Autres services* | 4002-4012 | *Internal* |
| PostgreSQL | 5432 | postgresql://localhost:5432 |
| Redis | 6379 | redis://localhost:6379 |

---

## 🛠️ Développement

### Démarrer en mode développement

```bash
# Démarrer tous les services
docker-compose up

# Démarrer un service spécifique
docker-compose up frontend auth-service

# Voir les logs d'un service
docker logs -f parabellum-frontend

# Rebuild après modification du code
docker-compose build auth-service
docker-compose up -d auth-service
```

### Structure du projet

```
parabellum-erp/
├── frontend/                # Application Next.js
│   ├── app/                 # Routes (App Router)
│   ├── src/
│   │   ├── components/      # Composants React
│   │   ├── shared/          # API, types, hooks
│   │   └── lib/             # Utilitaires
│   └── public/              # Assets statiques
│
├── services/                # Microservices backend
│   ├── api-gateway/         # Reverse proxy
│   ├── auth-service/        # Authentification
│   ├── customer-service/    # CRM
│   ├── billing-service/     # Facturation
│   ├── project-service/     # Projets
│   ├── technical-service/   # Services techniques
│   ├── procurement-service/ # Achats
│   ├── hr-service/          # RH
│   ├── commercial-service/  # Commercial
│   ├── inventory-service/   # Stock
│   ├── communication-service/# Communication
│   ├── analytics-service/   # Analytics
│   └── notification-service/# Notifications
│
├── docker-compose.yml       # Configuration Docker
├── .env                     # Variables d'environnement
└── DOCUMENTATION_*.md       # Documentation
```

---

## 🧪 Tests

```bash
# Tests unitaires (à implémenter)
npm run test

# Tests d'intégration
npm run test:integration

# Tests E2E
npm run test:e2e
```

---

## 🔒 Sécurité

### Authentification
- JWT avec refresh tokens
- Tokens expiration configurable
- Rate limiting (Redis)
- CORS configuré

### Autorisation
- RBAC (Role-Based Access Control)
- Permissions granulaires (View, Create, Edit, Delete, Approve)
- Surcharge utilisateur possible
- Middleware de vérification

### Bonnes pratiques
- Mots de passe hashés (bcrypt)
- Tokens stockés en DB
- Headers de sécurité (Helmet)
- Validation des entrées (Joi/Zod)

---

## 📊 Monitoring

### Logs

```bash
# Tous les logs
docker-compose logs -f

# Logs d'un service
docker logs -f auth-service

# Dernières 100 lignes
docker logs --tail 100 api-gateway
```

### Metrics

- Endpoint : http://localhost:3001/metrics
- Format : Prometheus-compatible
- Métriques : requêtes, latence, erreurs, circuit breakers

---

## 🐛 Debugging

### Problèmes courants

**Erreur : "Table public.users does not exist"**
```bash
docker exec auth-service npx prisma migrate deploy
docker exec auth-service node prisma/seed.js
docker exec auth-service node scripts/create-admin.js
```

**Erreur : "Port already in use"**
```bash
# Arrêter tous les conteneurs
docker-compose down

# Relancer
docker-compose up -d
```

**Erreur : "Cannot connect to database"**
```bash
# Vérifier que PostgreSQL est démarré
docker ps | grep postgres

# Redémarrer la base
docker-compose restart postgres
```

**Reset complet**
```bash
docker-compose down -v
docker-compose up --build -d
# Puis réinitialiser la base (voir ci-dessus)
```

---

## 🤝 Contributions

### Guidelines

1. **Fork** le repository
2. Créer une **branche** (`git checkout -b feature/AmazingFeature`)
3. **Commit** les changements (`git commit -m 'Add AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une **Pull Request**

### Standards de code

- **TypeScript** pour le frontend
- **ESLint** + **Prettier** pour le linting
- **Conventional Commits** pour les messages
- **Tests** pour les nouvelles fonctionnalités

---

## 📝 Changelog

### v1.0.0 (2026-02-10)
- ✨ Version initiale
- ✅ 12 microservices fonctionnels
- ✅ Frontend Next.js complet
- ✅ Système d'autorisation RBAC
- ✅ API Gateway modulaire
- ✅ Docker Compose complet

---

## 📄 License

Proprietary - © 2026 Parabellum Groups

---

## 📞 Support

- **Documentation** : [Voir ci-dessus](#-documentation)
- **Issues** : [GitHub Issues](https://github.com/votre-org/parabellum-erp/issues)
- **Email** : support@parabellum.com

---

## 👥 Équipe

- **Project Lead** : Theo
- **Backend Team** : Équipe Parabellum
- **Frontend Team** : Équipe Parabellum
- **DevOps** : Équipe Parabellum

---

## 🙏 Remerciements

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Docker](https://www.docker.com/)
- [Tous nos contributeurs](https://github.com/votre-org/parabellum-erp/contributors)

---

**Fait avec ❤️ par l'équipe Parabellum**
