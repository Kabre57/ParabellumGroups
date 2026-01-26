# 🎯 PARABELLUM ERP - Guide de Démarrage Complet

## 📋 Résumé des Corrections

Toutes les erreurs ont été identifiées et corrigées :

1. ✅ **Erreur `getAxiosInstance is not a function`** → Export corrigé
2. ✅ **Erreur 404 sur `/auth/login`** → Ajout préfixe `/api`
3. ✅ **Erreur `ECONNRESET / Request Aborted`** → Transmission du body dans le proxy

## 🚀 Démarrage Rapide

### 1. Arrêter les Services Actuels

Dans chaque terminal où un service tourne, faire **Ctrl+C**.

### 2. Démarrer les Services Backend

**Terminal 1 - API Gateway** :
```powershell
cd C:\Users\Theo\Documents\Projet` 2026\parabellum-erp\services\api-gateway
npm start
```

**Terminal 2 - Auth Service** :
```powershell
cd C:\Users\Theo\Documents\Projet` 2026\parabellum-erp\services\auth-service
npm start
```

### 3. Démarrer le Frontend

**Terminal 3 - Frontend** :
```powershell
cd C:\Users\Theo\Documents\Projet` 2026\parabellum-erp\frontend
npm run dev
```

### 4. Se Connecter

1. Ouvrir navigateur : http://localhost:3000/login
2. Email : `admin@parabellum.com`
3. Password : `admin123`
4. Cliquer "Se connecter"

**Résultat attendu** : ✅ Redirection vers `/dashboard`

## 🔍 Vérification

### Console Browser (F12)

**Onglet Network** :
- Requête : `POST http://localhost:3001/api/auth/login`
- Status : `200 OK`
- Response : `{ success: true, data: { user, accessToken, refreshToken } }`

**Onglet Application → Local Storage** :
- `accessToken` : JWT présent
- `refreshToken` : JWT présent

**Onglet Console** :
- ✅ Pas d'erreur `getAxiosInstance is not a function`
- ✅ Pas d'erreur 404
- ✅ Pas d'erreur `Erreur de connexion au serveur`

### Logs API Gateway

```
info: API Gateway started on port 3001
info: [correlation-id] POST /api/auth/login - START
info: [correlation-id] POST /api/auth/login - END {"statusCode":200}
```

### Logs Auth Service

```
╔════════════════════════════════════════════════════════════╗
║   🔐 Parabellum Auth Service                              ║
║   Status:      Running                                     ║
║   Port:        4001                                        ║
╚════════════════════════════════════════════════════════════╝

POST /api/auth/login 200 XX.XXX ms - 1267
```

## 🎯 Pages Disponibles

### Pages Publiques
- **Login** : http://localhost:3000/login ✅
- **Register** : http://localhost:3000/register

### Pages Admin (après connexion)
- **Dashboard** : http://localhost:3000/dashboard
- **Utilisateurs** : http://localhost:3000/admin/users ✅
- **Rôles** : http://localhost:3000/admin/roles ✅

### Modules ERP (après connexion)
- **Missions** : http://localhost:3000/dashboard/missions
- **Clients** : http://localhost:3000/dashboard/clients
- **Projets** : http://localhost:3000/dashboard/projets
- **RH** : http://localhost:3000/dashboard/rh
- **Facturation** : http://localhost:3000/dashboard/facturation
- **Achats** : http://localhost:3000/dashboard/achats
- **Analytics** : http://localhost:3000/dashboard/analytics

## 📁 Fichiers Modifiés (Session Complète)

### Corrections API Client
1. `frontend/src/shared/api/client.ts` - Export + baseURL
2. `frontend/src/shared/api/services/auth.ts` - Import
3. `frontend/src/shared/api/services/customers.ts` - Import
4. `frontend/src/shared/api/services/hr.ts` - Import
5. `frontend/src/shared/api/services/technical.ts` - Import
6. `frontend/src/shared/api/services/projects.ts` - Import

### Corrections Routing
7. `frontend/src/lib/api.ts` - baseURL `/api`
8. `frontend/.env.local` - URLs complètes

### Correction Proxy
9. `services/api-gateway/routes/proxy.js` - Transmission body

### Nouveaux Fichiers
10. `frontend/src/lib/api.ts` (API centralisée)
11. `frontend/src/contexts/AuthContext.tsx`
12. `frontend/src/hooks/useAuth.ts`
13. `frontend/app/(dashboard)/admin/users/page.tsx`
14. `frontend/app/(dashboard)/admin/roles/page.tsx`
15. `services/auth-service/scripts/create-admin.js`

### Documentation
16. `GUIDE_CONNEXION_FRONTEND_BACKEND.md`
17. `frontend/ENV_SETUP.md`
18. `fixes/CORRECTIONS_API_CLIENT.md`
19. `fixes/CORRECTION_404_AUTH_LOGIN.md`
20. `fixes/CORRECTION_ECONNRESET.md`
21. `fixes/ETAT_CONNEXION.md`
22. `fixes/GUIDE_DEMARRAGE.md` (ce fichier)

## 🛠️ Dépannage

### Problème : Port 3001 déjà utilisé

```powershell
# Trouver le processus
netstat -ano | findstr :3001

# Tuer le processus (remplacer PID par le numéro affiché)
taskkill /PID <PID> /F
```

### Problème : Frontend affiche toujours l'erreur

1. Vider le cache browser (Ctrl+Shift+Delete)
2. Hard reload (Ctrl+Shift+R)
3. Vérifier console : `console.log(process.env.NEXT_PUBLIC_API_URL)`
4. Devrait afficher : `http://localhost:3001/api`

### Problème : Erreur CORS

Vérifier que l'API Gateway autorise `http://localhost:3000` dans la config CORS.

### Problème : Base de données

```powershell
# Vérifier que PostgreSQL tourne
Get-Service -Name postgresql*

# Si besoin, migrer la base
cd services/auth-service
npx prisma migrate dev
```

## 📊 Architecture Finale

```
┌─────────────────────────────────────────────────────┐
│                   USER BROWSER                      │
│              http://localhost:3000                  │
└────────────────────┬────────────────────────────────┘
                     │
                     │ HTTP Requests
                     │ Authorization: Bearer {JWT}
                     │
┌────────────────────▼────────────────────────────────┐
│               NEXT.JS FRONTEND                      │
│  - axios baseURL: http://localhost:3001/api         │
│  - AuthContext pour gestion tokens                  │
│  - React Query pour cache                           │
│  - Pages: Login, Admin, Dashboard                   │
└────────────────────┬────────────────────────────────┘
                     │
                     │ POST /api/auth/login
                     │ Body: { email, password }
                     │
┌────────────────────▼────────────────────────────────┐
│               API GATEWAY :3001                     │
│  - CORS ✓                                           │
│  - Rate Limiting ✓                                  │
│  - Request Logging ✓                                │
│  - Metrics (Prometheus) ✓                           │
│  - Body transmission FIX ✓                          │
└─────┬───────────────────────────────────────────────┘
      │
      ├──► /api/auth/*       → Auth Service :4001
      ├──► /api/technical/*  → Technical :4006
      ├──► /api/customers/*  → Customer :4007
      ├──► /api/projects/*   → Project :4008
      ├──► /api/procurement/*→ Procurement :4009
      ├──► /api/hr/*         → HR :4010
      ├──► /api/communication/* → Communication :4011
      ├──► /api/billing/*    → Billing :4012
      ├──► /api/analytics/*  → Analytics :4013
      └──► /api/inventory/*  → Inventory :4014
           │
┌──────▼──────────────────────────────────────────────┐
│            AUTH SERVICE :4001                       │
│  - JWT Authentication ✓                             │
│  - RBAC (Role-Based Access Control) ✓               │
│  - User/Role/Permission Management ✓                │
│  - Audit Logging ✓                                  │
│  - Refresh Token ✓                                  │
│  - PostgreSQL Database ✓                            │
└─────────────────────────────────────────────────────┘
```

## ✅ Checklist Finale

- [x] API Gateway : Correction body transmission
- [x] Frontend : BaseURL avec `/api`
- [x] Frontend : Export `apiClient` corrigé
- [x] `.env.local` : Créé avec bonnes URLs
- [x] Utilisateur admin : Créé
- [ ] API Gateway : Redémarré avec corrections
- [ ] Auth Service : En cours d'exécution
- [ ] Frontend : Redémarré
- [ ] Test connexion : Réussi
- [ ] Pages admin : Testées

## 🎉 Prochaines Étapes

### Immédiat
1. Redémarrer API Gateway (avec fix body)
2. Tester connexion admin
3. Vérifier pages Users et Roles

### Court Terme
1. Démarrer Technical Service (port 4006)
2. Tester page Missions
3. Démarrer autres services au besoin

### Moyen Terme
1. Créer les APIs frontend pour tous les modules
2. Connecter toutes les pages existantes
3. Implémenter gestion permissions granulaire
4. Ajouter tests E2E

---

**Date** : 21 janvier 2026  
**Status** : ✅ PRÊT À TESTER  
**Action** : Redémarrer API Gateway et tester connexion
