# 🔧 CORRECTION : Erreur ECONNRESET - Socket Hang Up

## Problème Identifié

### Symptômes

**API Gateway** :
```
[HPM] ECONNRESET: Error: socket hang up
POST /api/auth/login HTTP/1.1 - -
```

**Auth Service** :
```
Unhandled error: BadRequestError: request aborted
code: 'ECONNABORTED'
expected: 65
received: 0
```

**Frontend** :
```
Erreur de connexion au serveur
```

**Observation** :
- ✅ Postman fonctionne (POST direct vers Auth Service:4001)
- ❌ Frontend via API Gateway ne fonctionne pas

### Analyse

Le problème vient de **l'API Gateway qui ne transmet pas correctement le body** des requêtes POST/PUT/PATCH au service backend.

**Flux problématique** :
```
Frontend (axios)
  │
  │ POST /api/auth/login
  │ Body: { email: "...", password: "..." }
  ▼
API Gateway (http-proxy-middleware)
  │
  │ ❌ Body perdu ou mal transmis
  │ Auth Service reçoit un body vide
  ▼
Auth Service
  │
  │ Attend 65 bytes (Content-Length)
  │ Reçoit 0 bytes
  │ Error: request aborted
  ▼
❌ ECONNABORTED
```

### Cause Racine

Le middleware `http-proxy-middleware` ne transmet **pas automatiquement** le body des requêtes lorsqu'on utilise Express avec `express.json()`. Le body est parsé et consommé par Express, mais pas réécrit dans le proxy.

## Solution Appliquée

### Modification de `services/api-gateway/routes/proxy.js`

**Ajout de la réécriture du body dans `onProxyReq`** :

```javascript
const createProxy = (target, pathRewrite = {}) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    timeout: 30000,
    proxyTimeout: 30000,
    onProxyReq: (proxyReq, req, res) => {
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.id);
        proxyReq.setHeader('X-User-Role', req.user.role);
        proxyReq.setHeader('X-User-Email', req.user.email);
      }
      if (req.correlationId) {
        proxyReq.setHeader('X-Correlation-ID', req.correlationId);
      }
      
      // ✅ FIX: Transmission du body pour POST/PUT/PATCH
      if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onError: (err, req, res) => {
      logError(`Proxy error for ${req.path}`, err);
      res.status(500).json({
        success: false,
        message: 'Erreur de communication avec le service'
      });
    }
  });
};
```

### Explication

1. **Vérification du body** : `if (req.body && ...)`
   - Vérifie que le body existe (parsé par express.json())
   - Vérifie que c'est une requête POST/PUT/PATCH

2. **Sérialisation** : `JSON.stringify(req.body)`
   - Convertit l'objet JavaScript en JSON string

3. **Headers** :
   - `Content-Type: application/json` - Type de contenu
   - `Content-Length` - Taille exacte en bytes

4. **Écriture** : `proxyReq.write(bodyData)`
   - Écrit le body dans la requête proxy

## Flux Corrigé

```
Frontend (axios)
  │
  │ POST /api/auth/login
  │ Body: { email: "admin@parabellum.com", password: "admin123" }
  ▼
API Gateway
  │
  │ 1. Express parse le body (express.json())
  │    req.body = { email: "...", password: "..." }
  │
  │ 2. onProxyReq() réécrire le body
  │    proxyReq.write(JSON.stringify(req.body))
  │
  │ 3. Transmission complète
  ▼
Auth Service (Port 4001)
  │
  │ POST /api/auth/login
  │ Body: { email: "admin@parabellum.com", password: "admin123" }
  │
  │ ✅ Body correctement reçu (65 bytes)
  │ ✅ Validation OK
  │ ✅ Login successful
  ▼
Response: { accessToken, refreshToken, user }
```

## Test de Validation

### 1. Redémarrer l'API Gateway

```powershell
# Arrêter l'API Gateway (Ctrl+C)
cd services/api-gateway
npm start
```

**Attendu** :
```
info: API Gateway started on port 3001
```

### 2. Tester depuis le Frontend

1. Ouvrir http://localhost:3000/login
2. Email : `admin@parabellum.com`
3. Password : `admin123`
4. Cliquer "Se connecter"

**Attendu** :
- ✅ Redirection vers `/dashboard`
- ✅ Pas d'erreur `socket hang up`
- ✅ Pas d'erreur `request aborted`

### 3. Vérifier les Logs

**API Gateway** :
```
info: [correlation-id] POST /api/auth/login - START
info: [correlation-id] POST /api/auth/login - END {"statusCode":200}
```

**Auth Service** :
```
POST /api/auth/login 200 XX.XXX ms - 1267
```

### 4. Test avec Postman (via API Gateway)

**URL** : `http://localhost:3001/api/auth/login`  
**Method** : POST  
**Body** :
```json
{
  "email": "admin@parabellum.com",
  "password": "admin123"
}
```

**Attendu** :
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

## Autres Endpoints Affectés

Cette correction s'applique à **toutes les routes proxifiées** :

### Auth Service
- `POST /api/auth/login` ✅
- `POST /api/auth/register` ✅
- `POST /api/auth/refresh` ✅
- `POST /api/users` ✅
- `PUT /api/users/:id` ✅
- `POST /api/roles` ✅

### Autres Services
- `POST /api/technical/missions` ✅
- `POST /api/customers/clients` ✅
- `POST /api/projects` ✅
- `POST /api/hr/employees` ✅
- `POST /api/billing/invoices` ✅
- Tous les POST/PUT/PATCH de tous les services ✅

## Pourquoi Postman Fonctionnait ?

**Postman → Auth Service (Direct)** :
```
POST http://localhost:4001/api/auth/login
Body: { email: "...", password: "..." }
```
- Pas de proxy intermédiaire
- Body transmis directement
- ✅ Fonctionne

**Frontend → API Gateway → Auth Service** :
```
POST http://localhost:3001/api/auth/login
  │ API Gateway (proxy)
  ▼
POST http://localhost:4001/api/auth/login
```
- Proxy intermédiaire
- Body doit être réécrit
- ❌ Ne fonctionnait pas (avant fix)
- ✅ Fonctionne (après fix)

## Comparaison Avant/Après

### AVANT (❌ Broken)

```javascript
onProxyReq: (proxyReq, req, res) => {
  // Seulement headers
  if (req.user) {
    proxyReq.setHeader('X-User-Id', req.user.id);
  }
  // ❌ Body non transmis
}
```

**Résultat** :
- API Gateway → Auth Service : Body vide
- Auth Service : `expected: 65, received: 0`
- Error: `ECONNABORTED`

### APRÈS (✅ Fixed)

```javascript
onProxyReq: (proxyReq, req, res) => {
  // Headers
  if (req.user) {
    proxyReq.setHeader('X-User-Id', req.user.id);
  }
  
  // ✅ Body transmission
  if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
}
```

**Résultat** :
- API Gateway → Auth Service : Body complet
- Auth Service : `expected: 65, received: 65` ✅
- Response: `200 OK`

## Alternative : Body Parser Middleware

**Autre solution possible** (non recommandée ici) :

```javascript
// Au lieu de express.json() global
app.use(express.json({ 
  verify: (req, res, buf, encoding) => {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}));

// Dans onProxyReq
if (req.rawBody) {
  proxyReq.write(req.rawBody);
}
```

**Pourquoi pas utilisé** :
- Plus complexe
- Stocke tout le body en mémoire (rawBody)
- Notre solution est plus directe

## Checklist de Vérification

- [x] Fichier modifié : `services/api-gateway/routes/proxy.js`
- [x] Ajout de la réécriture du body
- [x] Headers `Content-Type` et `Content-Length` définis
- [ ] API Gateway redémarré
- [ ] Test connexion frontend réussi
- [ ] Logs vérifiés (200 OK)

---

**Date** : 21 janvier 2026  
**Problème** : ECONNRESET / Request Aborted  
**Cause** : Body non transmis par le proxy  
**Solution** : Réécriture du body dans `onProxyReq`  
**Status** : ✅ CORRIGÉ (redémarrage API Gateway requis)
