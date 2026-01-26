# 🎉 PARABELLUM ERP - Guide de Test Complet

## ✅ État Actuel du Système

### Services Backend
- ✅ **API Gateway** : Port 3001 - Running
- ✅ **Auth Service** : Port 4001 - Running
- ⏳ **Autres services** : À démarrer au besoin

### Frontend
- ✅ **Next.js Dev** : Port 3002 - Running
- ✅ **URL** : http://localhost:3002

### Utilisateur Test
- ✅ **Email** : admin@parabellum.com
- ✅ **Password** : admin123
- ✅ **Rôle** : ADMIN

---

## 🧪 Tests à Effectuer

### Test 1 : Connexion

1. **Ouvrir le navigateur** :
   ```
   http://localhost:3002/login
   ```

2. **Saisir les identifiants** :
   - Email : `admin@parabellum.com`
   - Password : `admin123`

3. **Cliquer "Se connecter"**

4. **Résultat attendu** :
   - ✅ Redirection vers `/dashboard`
   - ✅ Header affiche le nom de l'utilisateur
   - ✅ Sidebar visible avec tous les modules
   - ✅ Pas d'erreur dans la console (F12)

5. **Vérifier localStorage** (F12 → Application → Local Storage) :
   - ✅ `accessToken` présent
   - ✅ `refreshToken` présent

---

### Test 2 : Navigation Sidebar

1. **Cliquer sur les catégories** :
   - ✅ Tableau de Bord
   - ✅ CRM & Commercial
   - ✅ Services Techniques
   - ✅ Gestion de Projets
   - ✅ Achats & Logistique
   - ✅ Comptabilité & Finances
   - ✅ Ressources Humaines
   - ✅ Communication

2. **Vérifier l'expansion/collapse** :
   - ✅ Les sous-menus s'ouvrent/ferment
   - ✅ L'icône change (ChevronDown ↔ ChevronRight)

3. **Cliquer sur un lien enfant** :
   - ✅ La page change
   - ✅ Le lien actif est mis en surbrillance

---

### Test 3 : Pages Admin

1. **Accéder à "Utilisateurs"** :
   ```
   http://localhost:3002/admin/users
   ```

   **Résultat attendu** :
   - ✅ Liste des utilisateurs affichée
   - ✅ Bouton "Nouvel utilisateur"
   - ✅ Pagination fonctionnelle
   - ✅ Boutons Activer/Désactiver/Supprimer

2. **Créer un utilisateur** :
   - Cliquer "Nouvel utilisateur"
   - Remplir le formulaire :
     - Nom : `Test User`
     - Email : `test@parabellum.com`
     - Password : `test123`
   - Cliquer "Créer"

   **Résultat attendu** :
   - ✅ Toast de succès affiché
   - ✅ Utilisateur apparaît dans la liste
   - ✅ Modal se ferme

3. **Accéder à "Rôles"** :
   ```
   http://localhost:3002/admin/roles
   ```

   **Résultat attendu** :
   - ✅ Liste des rôles affichée
   - ✅ Bouton "Nouveau rôle"
   - ✅ Affichage nombre de permissions par rôle

4. **Créer un rôle** :
   - Cliquer "Nouveau rôle"
   - Remplir :
     - Nom : `Test Manager`
     - Description : `Rôle de test`
   - Cliquer "Créer"

   **Résultat attendu** :
   - ✅ Toast de succès
   - ✅ Rôle apparaît dans la liste

---

### Test 4 : Header

1. **Barre de recherche** :
   - Cliquer dans le champ de recherche
   - Taper du texte
   - ✅ Le texte s'affiche

2. **Toggle Thème** :
   - Cliquer sur le bouton Lune/Soleil
   - ✅ Le thème passe de clair à sombre
   - ✅ L'icône change
   - ✅ Toute la page change de couleur

3. **Notifications** :
   - Cliquer sur l'icône cloche
   - ✅ Le menu de notifications s'ouvre
   - ✅ Les notifications de démo s'affichent
   - ✅ Badge avec nombre de non lus visible

4. **Menu Profil** :
   - Cliquer sur l'avatar
   - ✅ Menu utilisateur s'ouvre
   - ✅ Nom, email, rôle affichés
   - ✅ Lien "Mon profil"
   - ✅ Lien "Paramètres"
   - ✅ Bouton "Se déconnecter"

5. **Déconnexion** :
   - Cliquer "Se déconnecter"
   - ✅ Redirection vers `/login`
   - ✅ localStorage vide (tokens supprimés)

---

### Test 5 : Footer

1. **Vérifier l'affichage** :
   - Scroll vers le bas de la page
   - ✅ Footer visible
   - ✅ Copyright avec année actuelle (2026)
   - ✅ Version 1.0.0 affichée
   - ✅ Icône cœur (Heart) visible

2. **Cliquer sur les liens** :
   - ✅ Politique de confidentialité
   - ✅ Conditions d'utilisation
   - ✅ Contact
   - ✅ Aide
   - ✅ Email support (support@parabellum.com)

3. **Réseaux sociaux** :
   - ✅ Icône GitHub visible
   - ✅ Icône Twitter visible
   - ✅ Icône LinkedIn visible

---

### Test 6 : Responsive (Mobile)

1. **Ouvrir DevTools** (F12)
2. **Activer mode mobile** (Ctrl+Shift+M)
3. **Sélectionner iPhone 12 Pro**

4. **Vérifier Header** :
   - ✅ Bouton hamburger visible
   - ✅ Barre de recherche centrée
   - ✅ Icônes header visibles

5. **Cliquer hamburger** :
   - ✅ Sidebar s'ouvre
   - ✅ Overlay sombre visible
   - ✅ Cliquer overlay ferme le menu

6. **Navigation** :
   - ✅ Les liens fonctionnent
   - ✅ Le menu se ferme après clic

---

### Test 7 : Performance

1. **Ouvrir Network (F12 → Network)**
2. **Rafraîchir la page**

3. **Vérifier** :
   - ✅ Requête `/api/auth/login` : 200 OK
   - ✅ Temps de chargement < 2s
   - ✅ Pas de requêtes en erreur (404, 500)

4. **Lighthouse (F12 → Lighthouse)** :
   - Lancer audit "Performance"
   - ✅ Score > 80

---

### Test 8 : Console Erreurs

1. **Ouvrir Console (F12 → Console)**
2. **Naviguer dans l'app**

3. **Vérifier** :
   - ✅ Pas d'erreur rouge
   - ✅ Pas d'erreur `getAxiosInstance is not a function`
   - ✅ Pas d'erreur `Module not found`
   - ✅ Pas d'erreur `ECONNRESET`

---

## 🔍 Points de Vérification Spécifiques

### Authentification

| Test | Attendu | Status |
|------|---------|--------|
| Login avec bons identifiants | ✅ Connexion réussie | ⏳ À tester |
| Login avec mauvais password | ❌ Erreur affichée | ⏳ À tester |
| Login avec email inexistant | ❌ Erreur affichée | ⏳ À tester |
| Token expiré | 🔄 Refresh automatique | ⏳ À tester |
| Déconnexion | ✅ Redirection /login | ⏳ À tester |

### Pages Admin

| Page | Fonctionnalités | Status |
|------|-----------------|--------|
| `/admin/users` | Liste, Créer, Activer/Désactiver, Supprimer | ⏳ À tester |
| `/admin/roles` | Liste, Créer, Activer/Désactiver, Supprimer | ⏳ À tester |

### Layout

| Composant | Fonctionnalités | Status |
|-----------|-----------------|--------|
| Header | Recherche, Thème, Notifications, Profil | ⏳ À tester |
| Sidebar | Navigation, Expansion, Accès rapide | ⏳ À tester |
| Footer | Liens, Réseaux sociaux, Email | ⏳ À tester |

---

## 🐛 Problèmes Connus

### 1. Port 3002 au lieu de 3000
**Cause** : Ports 3000 et 3001 occupés  
**Impact** : Aucun (fonctionnel)  
**Solution** : Arrêter les services sur 3000/3001 si besoin du port 3000

### 2. Warnings npm install
**Cause** : Dépendances deprecated  
**Impact** : Aucun (warnings seulement)  
**Action** : À corriger lors de la mise à jour Next.js

### 3. Security vulnerabilities (4 total)
**Cause** : Next.js 14.1.0 a des vulnérabilités connues  
**Impact** : Faible (dev uniquement)  
**Action** : Mettre à jour vers Next.js 14.2+ après validation

---

## 📊 Rapport de Test (À Compléter)

### Session de Test

**Date** : _____________________  
**Testeur** : _____________________  
**Navigateur** : _____________________  
**OS** : _____________________

### Résultats

| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Test 1 : Connexion | ☐ | ☐ | |
| Test 2 : Navigation Sidebar | ☐ | ☐ | |
| Test 3 : Pages Admin | ☐ | ☐ | |
| Test 4 : Header | ☐ | ☐ | |
| Test 5 : Footer | ☐ | ☐ | |
| Test 6 : Responsive | ☐ | ☐ | |
| Test 7 : Performance | ☐ | ☐ | |
| Test 8 : Console Erreurs | ☐ | ☐ | |

### Bugs Découverts

1. _____________________________________________________
2. _____________________________________________________
3. _____________________________________________________

### Améliorations Suggérées

1. _____________________________________________________
2. _____________________________________________________
3. _____________________________________________________

---

## 🚀 Prochaines Étapes Après Tests

### Si Tests OK ✅

1. Démarrer Technical Service (port 4006)
2. Tester pages Missions techniques
3. Démarrer Customer Service (port 4007)
4. Tester pages Clients
5. Continuer avec les autres services

### Si Tests KO ❌

1. Noter les erreurs rencontrées
2. Vérifier les logs API Gateway
3. Vérifier les logs Auth Service
4. Vérifier la console browser (F12)
5. Créer des captures d'écran
6. Reporter les bugs

---

## 📞 Support

En cas de problème :

1. **Vérifier les services backend** :
   ```powershell
   netstat -ano | findstr "3001 4001"
   ```

2. **Vérifier les logs** :
   - API Gateway : Terminal 1
   - Auth Service : Terminal 2
   - Frontend : Terminal 3

3. **Redémarrer les services** :
   - Ctrl+C dans chaque terminal
   - Relancer `npm start` ou `npm run dev`

4. **Vider le cache** :
   - Browser : Ctrl+Shift+Delete
   - Next.js : `rm -rf .next` puis `npm run dev`

---

**Date de création** : 21 janvier 2026  
**Version** : 1.0  
**Status** : ✅ PRÊT POUR TESTS
