# Parabellum Groups - Application de Gestion

Application complète de gestion d'entreprise avec système d'authentification et de permissions granulaires.

## 🏗️ Architecture

```
ParrabellumGroups/
├── front-end/                 # Application React
├── Back-end/                  # API Express + Prisma
├── shared/                    # Types partagés
└── docs/                      # Documentation
```

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+
- PostgreSQL
- pnpm ou yarn

### Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd ParrabellumGroups
```

2. **Backend**
```bash
cd Back-end
pnpm install
cp .env.example .env
# Configurer la base de données dans .env
pnpm run db:push
pnpm run db:seed
pnpm run dev
```

3. **Frontend**
```bash
cd ../
pnpm install
cp .env.example .env
pnpm run dev
```

## 🔐 Authentification

### Comptes de démonstration
- **Directeur Général**: dg@parabellum.com / password123
- **Administrateur**: admin@parabellum.com / password123
- **Resp. Commercial**: resp.commercial@parabellum.com / password123
- **Commercial**: commercial@parabellum.com / password123
- **Comptable**: comptable@parabellum.com / password123

## 🛡️ Système de Permissions

### Rôles
- **ADMIN**: Accès complet
- **GENERAL_DIRECTOR**: Validation finale des devis, rapports
- **SERVICE_MANAGER**: Gestion de son service, validation devis
- **EMPLOYEE**: Création devis, gestion clients
- **ACCOUNTANT**: Gestion financière, factures, paiements

### Permissions Granulaires
- Chaque action (créer, lire, modifier, supprimer) est une permission distincte
- Contrôle d'accès au niveau des services
- Interface conditionnelle basée sur les permissions

## 📊 Fonctionnalités

### ✅ Implémenté
- [x] Authentification JWT avec refresh tokens
- [x] Système de permissions granulaires
- [x] Interface responsive avec Tailwind CSS
- [x] Dashboard avec statistiques
- [x] Navigation conditionnelle
- [x] Audit logs
- [x] Gestion des erreurs

### 🚧 En cours de développement
- [ ] Gestion des clients
- [ ] Système de devis avec workflow d'approbation
- [ ] Facturation
- [ ] Gestion des paiements
- [ ] Rapports financiers
- [ ] Interface d'administration des permissions

## 🔧 Technologies

### Frontend
- React 18 + TypeScript
- React Router v6
- React Hook Form + Zod
- TanStack Query
- Tailwind CSS
- Lucide React (icônes)

### Backend
- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT Authentication
- bcrypt
- TypeScript

## 📝 API Documentation

### Authentification
```
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/profile
```

### Structure des réponses
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}
```

## 🔒 Sécurité

- Tokens JWT avec expiration courte (1h)
- Refresh tokens (7 jours)
- Hachage bcrypt des mots de passe
- Validation des entrées
- Protection CORS
- Headers de sécurité (Helmet)
- Audit logs complets

## 📈 Performance

- Code splitting React
- Mise en cache des requêtes (React Query)
- Pagination des listes
- Optimisation des images
- Compression gzip

## 🚀 Déploiement

### Environnements
- **Développement**: Hot-reload, logs détaillés
- **Production**: Build optimisé, logs d'audit

### Variables d'environnement
Voir `.env.example` pour la configuration complète.

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.