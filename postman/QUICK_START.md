# 🚀 Guide de Démarrage Rapide - Tests Backend

## Étape 1 : Démarrer PostgreSQL

```powershell
# Vérifier que PostgreSQL est démarré
pg_isready

# Si nécessaire, démarrer PostgreSQL
# Windows (Services)
# Rechercher "Services" → PostgreSQL → Démarrer
```

## Étape 2 : Démarrer les microservices

### Terminal 1 - Auth Service

```powershell
cd "C:\Users\Theo\Documents\Projet 2026\delivery\parabellum-erp\services\auth-service"
npm start
```

**Attendez de voir** :
```
╔════════════════════════════════════════════════════════════╗
║   🔐 Parabellum Auth Service                              ║
║   Status:      Running                                     ║
║   Port:        4001                                        ║
╚════════════════════════════════════════════════════════════╝
[CLEANUP] Démarrage de la tâche de nettoyage (intervalle: 3600000ms)
```

### Terminal 2 - API Gateway

```powershell
cd "C:\Users\Theo\Documents\Projet 2026\delivery\parabellum-erp\services\api-gateway"
npm run dev
```

**Attendez de voir** :
```
info: API Gateway started on port 3001
info: Services configured:
info:   - AUTH: http://localhost:4001
```

## Étape 3 : Importer la collection Postman

1. Ouvrir **Postman**
2. Cliquer sur **Import**
3. Sélectionner les fichiers du dossier `postman/` :
   - `Parabellum-ERP-Backend.postman_collection.json`
   - `Parabellum-Development.postman_environment.json`
4. Sélectionner l'environnement **Parabellum ERP - Development** en haut à droite

## Étape 4 : Tester l'authentification

### 1️⃣ Register User

**Endpoint** : `POST http://localhost:3001/api/auth/register`

**Body** :
```json
{
  "email": "admin@parabellum.com",
  "password": "Admin123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "ADMIN"
}
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "admin@parabellum.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "ADMIN"
    },
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "eyJhbGciOiJIUzI1..."
  }
}
```

✅ Les tokens sont **automatiquement sauvegardés** dans l'environnement Postman !

### 2️⃣ Login

**Endpoint** : `POST http://localhost:3001/api/auth/login`

**Body** :
```json
{
  "email": "admin@parabellum.com",
  "password": "Admin123!"
}
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "admin@parabellum.com",
      ...
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### 3️⃣ Get Current User

**Endpoint** : `GET http://localhost:3001/api/auth/me`

**Headers** :
```
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Réponse attendue** :
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "admin@parabellum.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN"
  }
}
```

## Étape 5 : Tester les autres endpoints

### Créer un service

**Endpoint** : `POST http://localhost:3001/api/services`

**Headers** :
```
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json
```

**Body** :
```json
{
  "name": "Direction Technique",
  "description": "Service technique et infrastructure"
}
```

### Créer une permission

**Endpoint** : `POST http://localhost:3001/api/permissions`

**Headers** :
```
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json
```

**Body** :
```json
{
  "name": "manage_users",
  "description": "Gérer les utilisateurs",
  "category": "users"
}
```

## 🧪 Tests de sécurité

### Test Rate Limiting (Login)

Exécuter **6 fois** la requête suivante avec un mauvais mot de passe :

**Endpoint** : `POST http://localhost:3001/api/auth/login`

**Body** :
```json
{
  "email": "test@test.com",
  "password": "wrongpassword"
}
```

**Résultat attendu** à la 6ème tentative :
```json
{
  "success": false,
  "error": "Trop de tentatives de connexion",
  "message": "Votre compte a été temporairement verrouillé...",
  "retryAfter": 900
}
```

### Test Refresh Token

**Endpoint** : `POST http://localhost:3001/api/auth/refresh`

**Body** :
```json
{
  "refreshToken": "{{REFRESH_TOKEN}}"
}
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1..."
  }
}
```

### Test Logout

**Endpoint** : `POST http://localhost:3001/api/auth/logout`

**Headers** :
```
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Body** :
```json
{
  "refreshToken": "{{REFRESH_TOKEN}}"
}
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Logout successful"
}
```

## ⚡ Tests via cURL (alternative à Postman)

### Register
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@parabellum.com",
    "password": "Admin123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@parabellum.com",
    "password": "Admin123!"
  }'
```

### Get Current User
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## 🔍 Vérification des logs

### Auth Service
```
[CLEANUP] 0 refresh tokens supprimés  ← Cleanup automatique fonctionne
```

### API Gateway
```
::1 - - [20/Jan/2026:18:24:21 +0000] "POST /api/auth/register HTTP/1.1" 201 -
```

## ❌ Erreurs courantes et solutions

### Erreur 408 Request Timeout

**Cause** : Timeout trop court dans l'API Gateway

**Solution** : ✅ **Déjà corrigé** - Le timeout a été augmenté à 30 secondes

### Erreur ECONNABORTED (request aborted)

**Solution** :
1. Redémarrer l'auth-service
2. Redémarrer l'API Gateway
3. Réessayer la requête

### Erreur 500 Internal Server Error

**Vérifications** :
1. PostgreSQL est démarré ?
2. La base de données `parabellum_auth` existe ?
3. Les migrations Prisma ont été exécutées ?

```powershell
# Vérifier la BDD
cd services/auth-service
npx prisma db push
```

### Erreur 401 Unauthorized

**Solution** :
1. Exécuter **Login** pour obtenir un nouveau token
2. Le token sera automatiquement utilisé dans les requêtes suivantes

## 📊 Checklist de vérification complète

- [ ] PostgreSQL démarré
- [ ] Auth Service démarré (port 4001)
- [ ] API Gateway démarré (port 3001)
- [ ] Collection Postman importée
- [ ] Environnement "Development" sélectionné
- [ ] Register User réussi
- [ ] Login réussi
- [ ] Get Current User réussi
- [ ] Create Service réussi
- [ ] Create Permission réussi
- [ ] Refresh Token réussi
- [ ] Logout réussi
- [ ] Rate Limiting testé

## 🎯 Prochaines étapes

1. ✅ Tester les autres microservices (Technical, Customers, etc.)
2. ✅ Implémenter les endpoints spécifiques de chaque service
3. ✅ Ajouter les tests d'intégration
4. ✅ Configurer Swagger pour la documentation API

Félicitations ! 🎉 Votre backend Parabellum ERP est maintenant opérationnel avec une sécurité renforcée !
