# 🧪 GUIDE DE TEST - CONNEXION FRONTEND-BACKEND

## 🎯 Objectif

Valider que le système Parabellum ERP est entièrement fonctionnel après les corrections apportées.

---

## ✅ Prérequis

### Services Actifs

Vérifier que les services suivants sont en cours d'exécution :

```powershell
# Vérifier les ports
Test-NetConnection -ComputerName localhost -Port 3001  # API Gateway
Test-NetConnection -ComputerName localhost -Port 3002  # Frontend
Test-NetConnection -ComputerName localhost -Port 4001  # Auth Service
```

Résultat attendu : `TcpTestSucceeded : True` pour chaque port

### Démarrage des Services

Si les services ne sont pas actifs :

```powershell
# Terminal 1 - API Gateway
cd services/api-gateway
node index.js

# Terminal 2 - Auth Service  
cd services/auth-service
node index.js

# Terminal 3 - Frontend
cd frontend
npm run dev
```

---

## 🧪 Tests à Effectuer

### Test 1 : Connexion via PowerShell ✅

**Objectif** : Valider que l'API Gateway et l'Auth Service communiquent correctement

**Commande** :
```powershell
.\test-login.ps1
```

**Résultat attendu** :
```
Testing login with admin@parabellum.com...

✅ LOGIN SUCCESS!

User Info:
id                   : 1
email                : admin@parabellum.com
firstName            : John
lastName             : Doe
role                 : ADMIN
isActive             : True

Access Token:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Statut** : ✅ RÉUSSI (confirmé le 21/01/2026 17:02)

---

### Test 2 : Connexion via Navigateur

**Objectif** : Valider le formulaire de login du frontend

**URL** : http://localhost:3002/login

**Identifiants** :
- **Email** : admin@parabellum.com
- **Password** : admin123

**Étapes** :
1. Ouvrir http://localhost:3002/login dans le navigateur
2. Entrer l'email : admin@parabellum.com
3. Entrer le mot de passe : admin123
4. Cliquer sur "Se connecter"

**Résultat attendu** :
- ✅ Pas d'erreur dans la console navigateur
- ✅ Redirection vers http://localhost:3002/dashboard
- ✅ Token stocké dans localStorage
- ✅ Affichage du nom d'utilisateur dans l'interface

**Vérifications Console Navigateur** :
```javascript
// Ouvrir la console (F12)
localStorage.getItem('accessToken')  // Doit retourner un JWT
localStorage.getItem('refreshToken') // Doit retourner un JWT
```

**Statut** : ⏳ À TESTER

---

### Test 3 : Navigation dans le Sidebar

**Objectif** : Valider le comportement du sidebar par rôle ADMIN

**Étapes** :
1. Après connexion, vérifier que le sidebar est visible
2. Vérifier que toutes les catégories sont affichées :
   - ✅ Tableau de Bord
   - ✅ CRM & Commercial
   - ✅ Services Techniques
   - ✅ Gestion de Projets
   - ✅ Achats & Logistique
   - ✅ Comptabilité & Finances
   - ✅ Ressources Humaines
   - ✅ Communication
   - ✅ Administration (ADMIN uniquement)

3. Tester l'expansion/collapse des catégories :
   - Cliquer sur une catégorie → Doit afficher les sous-menus
   - Cliquer à nouveau → Doit masquer les sous-menus

4. Tester la barre de recherche :
   - Taper "utilisateur" → Doit filtrer les liens
   - Effacer → Doit réafficher tous les liens

5. Tester les favoris :
   - Survoler un lien → Bouton étoile doit apparaître
   - Cliquer sur l'étoile → Doit devenir jaune
   - Vérifier que le lien apparaît dans "Favoris"

**Résultat attendu** :
- ✅ Toutes les fonctionnalités du sidebar opérationnelles
- ✅ Pas d'erreur dans la console
- ✅ Animations fluides

**Statut** : ⏳ À TESTER

---

### Test 4 : Gestion des Utilisateurs

**Objectif** : Valider la création/modification/suppression d'utilisateurs

**URL** : http://localhost:3002/admin/users

**Étapes** :

#### 4.1 Liste des Utilisateurs
1. Naviguer vers "Administration" → "Utilisateurs"
2. Vérifier que l'utilisateur admin est affiché

**Résultat attendu** :
- ✅ Table avec colonnes : ID, Nom, Email, Rôle, Statut, Actions
- ✅ Au moins 1 utilisateur (admin)

#### 4.2 Création d'Utilisateur
1. Cliquer sur "Ajouter un utilisateur"
2. Remplir le formulaire :
   - Prénom : Test
   - Nom : User
   - Email : test@parabellum.com
   - Mot de passe : test123
   - Rôle : EMPLOYEE
3. Cliquer sur "Créer"

**Résultat attendu** :
- ✅ Toast de succès : "Utilisateur créé avec succès"
- ✅ Modal se ferme
- ✅ Nouvel utilisateur apparaît dans la liste
- ✅ Requête POST /api/users réussie (vérifier Network tab)

#### 4.3 Activation/Désactivation
1. Trouver l'utilisateur créé
2. Cliquer sur le toggle "Actif/Inactif"

**Résultat attendu** :
- ✅ Toast de confirmation
- ✅ Statut change visuellement
- ✅ Requête PATCH /api/users/{id} réussie

#### 4.4 Suppression
1. Cliquer sur "Supprimer" pour l'utilisateur test
2. Confirmer la suppression

**Résultat attendu** :
- ✅ Toast de succès
- ✅ Utilisateur retiré de la liste
- ✅ Requête DELETE /api/users/{id} réussie

**Statut** : ⏳ À TESTER

---

### Test 5 : Gestion des Rôles

**Objectif** : Valider la création/modification/suppression de rôles

**URL** : http://localhost:3002/admin/roles

**Étapes** :

#### 5.1 Liste des Rôles
1. Naviguer vers "Administration" → "Rôles"
2. Vérifier que les rôles par défaut sont affichés (ADMIN, EMPLOYEE)

**Résultat attendu** :
- ✅ Table avec rôles existants

#### 5.2 Création de Rôle
1. Cliquer sur "Ajouter un rôle"
2. Remplir :
   - Nom : MANAGER
   - Description : Gestionnaire de projet
3. Cliquer sur "Créer"

**Résultat attendu** :
- ✅ Toast de succès
- ✅ Nouveau rôle dans la liste

**Statut** : ⏳ À TESTER

---

### Test 6 : Déconnexion

**Objectif** : Valider le processus de logout

**Étapes** :
1. Cliquer sur le menu utilisateur (en haut à droite)
2. Cliquer sur "Déconnexion"

**Résultat attendu** :
- ✅ Redirection vers /login
- ✅ Tokens supprimés du localStorage
- ✅ Pas d'erreur dans la console

**Vérification** :
```javascript
// Console navigateur
localStorage.getItem('accessToken')  // Doit être null
localStorage.getItem('refreshToken') // Doit être null
```

**Statut** : ⏳ À TESTER

---

### Test 7 : Protection des Routes

**Objectif** : Valider que les routes protégées ne sont pas accessibles sans authentification

**Étapes** :
1. Se déconnecter (si connecté)
2. Essayer d'accéder directement à http://localhost:3002/dashboard

**Résultat attendu** :
- ✅ Redirection automatique vers /login
- ✅ Message d'erreur ou notification (optionnel)

**Statut** : ⏳ À TESTER

---

### Test 8 : Refresh Token

**Objectif** : Valider le mécanisme de refresh automatique du token

**Contexte** : 
- Access Token : expire après 15 minutes
- Refresh Token : expire après 7 jours

**Étapes** :
1. Se connecter
2. Attendre 15 minutes
3. Effectuer une requête API (ex: naviguer vers /admin/users)

**Résultat attendu** :
- ✅ Intercepteur axios détecte le 401
- ✅ Appel automatique à /api/auth/refresh
- ✅ Nouveau access token reçu
- ✅ Requête initiale ré-essayée avec succès
- ✅ Pas de redirection vers /login

**Vérification Console** :
```javascript
// Devrait afficher 2 requêtes :
// 1. GET /api/users → 401
// 2. POST /api/auth/refresh → 200
// 3. GET /api/users → 200 (retry)
```

**Statut** : ⏳ À TESTER (nécessite 15min d'attente)

---

## 📊 Tableau Récapitulatif

| # | Test | Objectif | Statut | Date |
|---|------|----------|--------|------|
| 1 | Connexion PowerShell | API Backend | ✅ RÉUSSI | 21/01/2026 17:02 |
| 2 | Connexion Navigateur | Frontend Login | ⏳ À TESTER | - |
| 3 | Navigation Sidebar | UI/UX | ⏳ À TESTER | - |
| 4 | Gestion Utilisateurs | CRUD Users | ⏳ À TESTER | - |
| 5 | Gestion Rôles | CRUD Roles | ⏳ À TESTER | - |
| 6 | Déconnexion | Logout | ⏳ À TESTER | - |
| 7 | Protection Routes | Auth Guard | ⏳ À TESTER | - |
| 8 | Refresh Token | Token Renewal | ⏳ À TESTER | - |

---

## 🐛 Erreurs Possibles et Solutions

### Erreur 1 : "Cannot connect to server"

**Symptômes** :
- Frontend ne peut pas se connecter au backend
- Erreur réseau dans la console

**Vérification** :
```powershell
# Vérifier que les services sont actifs
Test-NetConnection -ComputerName localhost -Port 3001
Test-NetConnection -ComputerName localhost -Port 4001
```

**Solution** :
```powershell
# Redémarrer API Gateway
cd services/api-gateway
node index.js

# Redémarrer Auth Service
cd services/auth-service
node index.js
```

---

### Erreur 2 : "Invalid email or password"

**Symptômes** :
- Connexion échoue avec les bons identifiants
- Status 401

**Solution** :
```powershell
# Réinitialiser le mot de passe
cd services/auth-service
node scripts/check-user.js
```

---

### Erreur 3 : CORS Error

**Symptômes** :
```
Access to XMLHttpRequest at 'http://localhost:3001/api/auth/login' 
from origin 'http://localhost:3002' has been blocked by CORS policy
```

**Vérification** :
```javascript
// services/api-gateway/middleware/cors.js
// Doit contenir :
origin: ['http://localhost:3002', 'http://localhost:3000']
```

**Solution** :
- Vérifier le fichier cors.js
- Redémarrer l'API Gateway

---

### Erreur 4 : Module Not Found

**Symptômes** :
```
Module not found: Can't resolve '@/services/...'
```

**Solution** :
```powershell
cd frontend
npm install
```

---

## 📝 Rapport de Test

Après avoir effectué tous les tests, remplir le rapport suivant :

```
RAPPORT DE TEST - PARABELLUM ERP
================================

Date : __________
Testeur : __________

Test 1 - Connexion PowerShell : [ ] ✅ [ ] ❌
  Notes : _________________________________

Test 2 - Connexion Navigateur : [ ] ✅ [ ] ❌
  Notes : _________________________________

Test 3 - Navigation Sidebar : [ ] ✅ [ ] ❌
  Notes : _________________________________

Test 4 - Gestion Utilisateurs : [ ] ✅ [ ] ❌
  Notes : _________________________________

Test 5 - Gestion Rôles : [ ] ✅ [ ] ❌
  Notes : _________________________________

Test 6 - Déconnexion : [ ] ✅ [ ] ❌
  Notes : _________________________________

Test 7 - Protection Routes : [ ] ✅ [ ] ❌
  Notes : _________________________________

Test 8 - Refresh Token : [ ] ✅ [ ] ❌
  Notes : _________________________________

CONCLUSION GLOBALE :
[ ] Tous les tests réussis - Prêt pour production
[ ] Tests partiellement réussis - Corrections nécessaires
[ ] Tests échoués - Révision majeure nécessaire

Problèmes rencontrés :
_____________________________________________
_____________________________________________
_____________________________________________

Recommandations :
_____________________________________________
_____________________________________________
_____________________________________________
```

---

## 🚀 Après les Tests

### Si Tous les Tests Réussissent

1. **Documenter** les résultats
2. **Créer une branche git** pour sauvegarder l'état actuel
3. **Déployer** en environnement de staging
4. **Former** les utilisateurs finaux

### Si des Tests Échouent

1. **Noter** précisément l'erreur
2. **Vérifier** les logs (API Gateway + Auth Service)
3. **Consulter** la documentation de correction
4. **Appliquer** les corrections nécessaires
5. **Re-tester**

---

**Dernière mise à jour** : 21 janvier 2026 17:05 UTC
**Version** : 1.0.0
**Statut** : En cours de test
