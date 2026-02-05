# 🔐 Parabellum Auth Service

Service d'authentification et de gestion des utilisateurs pour l'ERP Parabellum.

## 📋 Vue d'ensemble

Service de microservice d'authentification complet avec:
- Authentification JWT
- Gestion des utilisateurs
- Gestion des services/départements
- Système de permissions et rôles
- Audit logging
- API RESTful complète

## 🚀 Démarrage rapide

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration de l'environnement
Vérifiez et modifiez le fichier `.env` avec vos paramètres:
```env
NODE_ENV=development
PORT=4001
DATABASE_URL=postgresql://postgres:password@localhost:5432/parabellum_auth
JWT_SECRET=416500b0f18082fb66834e3a45d550cfc154218b718d8fdb91185168c873682c2bfb9a4c6bf69e5b6060bc5b22366f54fedfd5a3da38065246d0093c19ea861b
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
```

### 3. Configuration de la base de données
```bash
# Générer le client Prisma
npm run prisma:generate

# Appliquer les migrations
npm run prisma:migrate
```

### 4. Vérification de la configuration
```bash
node check-setup.js
```

### 5. Démarrage du service
```bash
# Mode développement (avec auto-reload)
npm run dev

# Mode production
npm start
```

Le service sera accessible sur: **http://localhost:4001**

## 📚 Documentation

- **[API_ROUTES.md](./API_ROUTES.md)** - Documentation complète des endpoints API
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Résumé détaillé de l'implémentation
- **[COMMANDS.md](./COMMANDS.md)** - Référence des commandes utiles

## 🏗️ Structure du projet

```
auth-service/
├── src/
│   ├── config/          # Configuration (Prisma, etc.)
│   ├── utils/           # Utilitaires (JWT, password, etc.)
│   ├── middleware/      # Middleware Express (auth, roleCheck)
│   ├── controllers/     # Logique métier
│   └── routes/          # Définition des routes
├── prisma/
│   └── schema.prisma    # Schéma de base de données
├── tests/
│   └── manual-tests.js  # Exemples de tests manuels
├── index.js             # Point d'entrée
└── check-setup.js       # Script de vérification
```

## 🔑 Fonctionnalités principales

### Authentification
- ✅ Inscription utilisateur avec validation
- ✅ Connexion avec JWT
- ✅ Rafraîchissement de token
- ✅ Déconnexion
- ✅ Récupération du profil utilisateur

### Gestion des utilisateurs
- ✅ Liste paginée avec filtres
- ✅ Création/Lecture/Mise à jour/Suppression
- ✅ Activation/Désactivation
- ✅ Recherche par email, nom, matricule

### Gestion des services (départements)
- ✅ CRUD complet
- ✅ Liste des utilisateurs par service
- ✅ Validation des contraintes

### Gestion des permissions
- ✅ Permissions par catégorie
- ✅ Attribution aux rôles
- ✅ Actions granulaires (view, create, edit, delete, approve)

### Sécurité
- ✅ Hachage bcrypt des mots de passe
- ✅ JWT avec expiration
- ✅ Validation des entrées (express-validator)
- ✅ Protection CORS
- ✅ Headers de sécurité (Helmet)
- ✅ Audit logging complet

## 🎯 Rôles disponibles

| Rôle | Description |
|------|-------------|
| `ADMIN` | Accès complet au système |
| `GENERAL_DIRECTOR` | Directeur général |
| `SERVICE_MANAGER` | Responsable de service |
| `EMPLOYEE` | Employé standard |
| `ACCOUNTANT` | Comptable |
| `PURCHASING_MANAGER` | Responsable des achats |

## 📡 Endpoints principaux

### Authentification (`/api/auth`)
- `POST /register` - Inscription
- `POST /login` - Connexion
- `POST /refresh` - Rafraîchir le token
- `POST /logout` - Déconnexion
- `GET /me` - Profil utilisateur

### Utilisateurs (`/api/users`)
- `GET /` - Liste des utilisateurs
- `GET /:id` - Détails d'un utilisateur
- `PUT /:id` - Modifier un utilisateur
- `DELETE /:id` - Supprimer un utilisateur
- `PATCH /:id/status` - Activer/Désactiver

### Services (`/api/services`)
- `GET /` - Liste des services
- `GET /:id` - Détails d'un service
- `POST /` - Créer un service
- `PUT /:id` - Modifier un service
- `DELETE /:id` - Supprimer un service

### Permissions (`/api/permissions`)
- `GET /` - Liste des permissions
- `GET /:id` - Détails d'une permission
- `POST /` - Créer une permission
- `PUT /:id` - Modifier une permission
- `DELETE /:id` - Supprimer une permission
- `GET /roles/:role` - Permissions d'un rôle
- `PUT /roles/:role/:permissionId` - Attribuer une permission

## 🧪 Tests

### Tests manuels
Consultez `tests/manual-tests.js` pour des exemples de requêtes.

### Exemple de test rapide
```powershell
# Vérifier le health check
Invoke-WebRequest http://localhost:4001/api/health

# Créer un utilisateur admin
$body = @{
    email = "admin@parabellum.com"
    password = "Admin123!"
    firstName = "Admin"
    lastName = "User"
    role = "ADMIN"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:4001/api/auth/register `
  -Method POST -Body $body -ContentType "application/json"
```

## 🔧 Commandes utiles

```bash
# Développement
npm run dev              # Démarrer avec nodemon

# Production
npm start                # Démarrer en mode production

# Base de données
npm run prisma:studio    # Interface graphique DB
npm run prisma:generate  # Générer le client Prisma
npm run prisma:migrate   # Appliquer les migrations

# Vérification
node check-setup.js      # Vérifier la configuration
```

## 📊 Format des réponses

### Succès
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Erreur
```json
{
  "success": false,
  "message": "Error description",
  "errors": { ... }
}
```

## 🔐 Sécurité

### Exigences des mots de passe
- Minimum 8 caractères
- Au moins une majuscule
- Au moins une minuscule
- Au moins un chiffre

### JWT
- Access Token: 7 jours
- Refresh Token: 30 jours
- Signature HMAC avec secret

### Protection
- Helmet pour les headers de sécurité
- CORS configuré
- Validation des entrées
- Soft delete des utilisateurs
- Audit logging de toutes les actions

## 📝 Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `NODE_ENV` | Environnement | `development` |
| `PORT` | Port du service | `4001` |
| `DATABASE_URL` | URL PostgreSQL | - |
| `JWT_SECRET` | Secret pour JWT | - |
| `JWT_EXPIRES_IN` | Expiration access token | `7d` |
| `REFRESH_TOKEN_EXPIRES_IN` | Expiration refresh token | `30d` |
| `CORS_ORIGIN` | Origines CORS autorisées | `http://localhost:3000` |

## 🐛 Dépannage

### Le service ne démarre pas
```bash
# Vérifier la configuration
node check-setup.js

# Vérifier les dépendances
npm install

# Vérifier le port
Get-NetTCPConnection -LocalPort 4001
```

### Erreurs de base de données
```bash
# Régénérer le client Prisma
npm run prisma:generate

# Vérifier la connexion
npx prisma db pull
```

### Problèmes de tokens
- Vérifier que `JWT_SECRET` est défini dans `.env`
- Vérifier que le token n'est pas expiré
- Vérifier le format: `Authorization: Bearer {token}`

## 📦 Dépendances principales

- **express**: Framework web
- **@prisma/client**: ORM base de données
- **jsonwebtoken**: Gestion JWT
- **bcryptjs**: Hachage des mots de passe
- **express-validator**: Validation des entrées
- **helmet**: Sécurité HTTP
- **cors**: Cross-Origin Resource Sharing
- **morgan**: Logging HTTP

## 🚀 Déploiement

### Docker
```bash
docker build -t parabellum-auth-service .
docker run -p 4001:4001 --env-file .env parabellum-auth-service
```

### Production
1. Configurer les variables d'environnement
2. Installer les dépendances: `npm ci --production`
3. Générer Prisma: `npm run prisma:generate`
4. Appliquer les migrations: `npm run prisma:migrate`
5. Démarrer: `npm start`

## 📈 Performances

- Pagination pour les listes
- Index sur les colonnes fréquemment recherchées
- Connexion Prisma optimisée
- Logging configurable par environnement

## 🤝 Support

Pour toute question ou problème:
1. Consulter `IMPLEMENTATION_SUMMARY.md`
2. Vérifier `COMMANDS.md`
3. Examiner les logs du service

## 📄 Licence

MIT

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2026-01-19
