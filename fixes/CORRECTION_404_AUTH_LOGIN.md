# 🔧 CORRECTION : Erreur 404 sur /auth/login

## Problème Identifié

```
POST /auth/login - END - statusCode:404
```

### Cause

**Conflit de routing** entre Frontend et API Gateway :

- **Frontend envoyait** : `POST http://localhost:3001/auth/login`
- **API Gateway attendait** : `POST http://localhost:3001/api/auth/login`
- **Résultat** : 404 Resource not found

### Architecture de Routing

```
Frontend → API Gateway → Backend Service
   │            │              │
   │    ┌───────┴──────────┐   │
   │    │ Routes définies  │   │
   │    │ sous /api/*      │   │
   │    └──────────────────┘   │
   │                            │
   ▼                            ▼
/auth/login  ≠  /api/auth/login
```

## Solution Appliquée

### 1. Mise à Jour Client API

**Fichier** : `frontend/src/shared/api/client.ts`

```typescript
// AVANT
baseURL: process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3001'

// APRÈS
baseURL: process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3001/api'
```

**Fichier** : `frontend/src/lib/api.ts`

```typescript
// AVANT
const API_BASE_URL = 'http://localhost:3001';

// APRÈS
const API_BASE_URL = 'http://localhost:3001/api';
```

### 2. Mise à Jour .env.local

**Fichier** : `frontend/.env.local`

```env
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:3001/api
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=Parabellum ERP
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=development
```

## Flux Corrigé

```
Frontend
  │
  │ axios.post('/auth/login', ...)
  │ baseURL: http://localhost:3001/api
  │
  ▼
http://localhost:3001/api/auth/login
  │
  │ API Gateway écoute sur /api/auth/login
  │ Route : router.post('/auth/login', ...)
  │ Prefix : /api (via app.use('/api', proxyRoutes))
  │
  ▼
API Gateway Proxy
  │
  │ pathRewrite: { '^/api/auth': '/api/auth' }
  │ Target: http://localhost:4001
  │
  ▼
http://localhost:4001/api/auth/login
  │
  │ Auth Service
  │ Route: router.post('/login', ...)
  │ Prefix: /api/auth (via app.use('/api/auth', authRoutes))
  │
  ▼
Auth Controller → login()
```

## Vérification

### 1. Redémarrer le Frontend

Le fichier `.env.local` ayant été modifié, Next.js doit redémarrer :

```powershell
# Arrêter le frontend (Ctrl+C)
cd frontend
npm run dev
```

### 2. Tester la Connexion

1. Ouvrir http://localhost:3000/login
2. Saisir :
   - Email : `admin@parabellum.com`
   - Password : `admin123`
3. Cliquer sur "Se connecter"

### 3. Vérifier les Logs

**API Gateway** devrait afficher :
```
info: [xxxx] POST /api/auth/login - START
info: [xxxx] POST /api/auth/login - END {"statusCode":200}
```

**Auth Service** devrait afficher :
```
[LOGIN] User admin@parabellum.com logged in successfully
```

## Endpoints Disponibles

Avec la correction, voici les URLs correctes :

| Endpoint Frontend | URL Finale | Service Backend |
|-------------------|------------|-----------------|
| `/auth/login` | `http://localhost:3001/api/auth/login` | Auth Service:4001 |
| `/auth/register` | `http://localhost:3001/api/auth/register` | Auth Service:4001 |
| `/auth/users` | `http://localhost:3001/api/auth/users` | Auth Service:4001 |
| `/technical/missions` | `http://localhost:3001/api/technical/missions` | Technical:4006 |
| `/customers/clients` | `http://localhost:3001/api/customers/clients` | Customer:4007 |
| `/hr/employees` | `http://localhost:3001/api/hr/employees` | HR:4010 |

## Fichiers Modifiés

1. ✅ `frontend/src/shared/api/client.ts` - baseURL + `/api`
2. ✅ `frontend/src/lib/api.ts` - baseURL + `/api`
3. ✅ `frontend/.env.local` - URLs mises à jour

## État des Services

| Service | Port | Status | URL |
|---------|------|--------|-----|
| Frontend | 3000 | 🔄 À redémarrer | http://localhost:3000 |
| API Gateway | 3001 | ✅ Running | http://localhost:3001 |
| Auth Service | 4001 | ✅ Running | http://localhost:4001 |

## Prochaines Actions

1. **Redémarrer le frontend** (Ctrl+C puis `npm run dev`)
2. **Tester la connexion** sur http://localhost:3000/login
3. **Vérifier que le statut passe de 404 à 200**

---

**Date** : 21 janvier 2026  
**Problème** : 404 sur /auth/login  
**Cause** : Manque du préfixe /api dans baseURL  
**Solution** : Ajout de /api aux URLs frontend  
**Status** : ✅ CORRIGÉ
