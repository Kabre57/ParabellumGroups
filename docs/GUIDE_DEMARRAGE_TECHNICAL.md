# Guide de Démarrage - Module Technical

## ⚠️ Problèmes Actuels Identifiés

### 1. Service Technical Backend Non Démarré
**Symptômes:**
- "Erreur lors du chargement des techniciens"
- "Erreur lors du chargement des rapports"
- Données vides dans les listes

**Solution:**
Le service Technical backend doit être démarré. Vérifiez dans `services/technical-service/` qu'il existe et démarrez-le.

### 2. Pages 404 Résolues ✅
**Avant:** `/missions/new` et `/interventions/new` retournaient 404  
**Après:** Pages créées avec formulaires complets

**Fichiers créés:**
- `frontend/app/(dashboard)/dashboard/technical/missions/new/page.tsx`
- `frontend/app/(dashboard)/dashboard/technical/interventions/new/page.tsx`

### 3. Clarification Spécialités ✅
**Problème:** Confusion sur le rôle de la page "Spécialités"  
**Solution:** Description mise à jour pour clarifier qu'il s'agit des spécialités des techniciens (Électricité, Plomberie, Climatisation, etc.)

---

## 🚀 Démarrage des Services

### Prérequis
1. PostgreSQL démarré et base de données `parabellum_erp` créée
2. Variables d'environnement configurées dans chaque service
3. Node.js 22.20.0 installé

### Ordre de Démarrage

#### 1. API Gateway (Port 3001)
```powershell
cd services/api-gateway
npm install
npm run dev
```

#### 2. Service Auth (Port 3002)
```powershell
cd services/auth-service
npm install
npm run dev
```

#### 3. Service Technical (Port à vérifier)
```powershell
cd services/technical-service
npm install
npx prisma generate
npx prisma db push
npm run dev
```

#### 4. Frontend (Port 3000)
```powershell
cd frontend
npm install
npm run dev
```

---

## 🔍 Vérification que Tout Fonctionne

### 1. Tester l'API Gateway
```powershell
curl http://localhost:3001/health
```
**Résultat attendu:** `{"status":"ok"}`

### 2. Tester Service Auth
```powershell
curl http://localhost:3002/health
```
**Résultat attendu:** `{"status":"ok","service":"auth"}`

### 3. Tester Service Technical
```powershell
# Vérifier le port dans services/technical-service/.env ou package.json
curl http://localhost:<PORT>/health
```

### 4. Tester Frontend
Ouvrir http://localhost:3000 dans le navigateur

---

## 📋 Checklist Post-Démarrage

### Module Technical - Pages Fonctionnelles

- [ ] **Spécialités** (`/dashboard/technical/specialites`)
  - [ ] Liste des spécialités chargée depuis BDD
  - [ ] Bouton "Nouvelle Spécialité" ouvre le formulaire
  - [ ] Création fonctionne
  - [ ] Modification fonctionne
  - [ ] Suppression fonctionne

- [ ] **Techniciens** (`/dashboard/technical/techniciens`)
  - [ ] Liste des techniciens chargée depuis BDD
  - [ ] Affichage des spécialités associées
  - [ ] Bouton "Nouveau Technicien" ouvre le formulaire
  - [ ] Select "Spécialité" rempli dynamiquement
  - [ ] CRUD complet fonctionnel

- [ ] **Missions** (`/dashboard/technical/missions`)
  - [ ] Liste des missions chargée depuis BDD
  - [ ] Bouton "Nouvelle Mission" ouvre le formulaire
  - [ ] CRUD complet fonctionnel
  - [ ] Page `/missions/new` accessible

- [ ] **Interventions** (`/dashboard/technical/interventions`)
  - [ ] Liste des interventions chargée depuis BDD
  - [ ] Bouton "Nouvelle Intervention" ouvre le formulaire
  - [ ] Select "Mission" rempli dynamiquement
  - [ ] CRUD complet fonctionnel
  - [ ] Page `/interventions/new` accessible

- [ ] **Matériel** (`/dashboard/technical/equipment`)
  - [ ] Liste du matériel chargée depuis BDD
  - [ ] Alertes stock fonctionnelles
  - [ ] CRUD complet fonctionnel

- [ ] **Rapports** (`/dashboard/technical/rapports`)
  - [ ] Liste des rapports chargée depuis BDD
  - [ ] Modal détail fonctionne
  - [ ] Affichage photos fonctionne

---

## 🐛 Diagnostic des Erreurs Courantes

### "Erreur lors du chargement des techniciens"

**Causes possibles:**
1. Service Technical backend non démarré
2. Erreur dans la route `/technical/techniciens`
3. Problème de CORS
4. Base de données non migrée

**Vérifications:**
```powershell
# Vérifier que le service Technical tourne
Get-Process -Name "node" | Where-Object {$_.Path -like "*technical*"}

# Tester directement l'endpoint
curl http://localhost:<TECHNICAL_PORT>/api/techniciens

# Vérifier les logs du service Technical
# (dans le terminal où il tourne)
```

### "Erreur lors du chargement des rapports"

**Même diagnostic que techniciens, endpoint `/technical/rapports`**

### Données vides même si le service fonctionne

**Solution:** Vérifier que Prisma a bien migré les tables

```powershell
cd services/technical-service
npx prisma studio
# Vérifier visuellement les tables et données
```

---

## ✅ Confirmations après Corrections

### Données Mockées Supprimées ✅
Aucune donnée en dur dans le code. Toutes les données proviennent du backend PostgreSQL via Prisma.

**Vérification effectuée:**
```bash
grep -r "queryFn.*return \[" frontend/app/**/*.tsx
# Résultat: Aucune correspondance
```

### Formulaires CRUD Complets ✅
Tous les formulaires sont connectés au backend:
- MaterielForm ✅
- MissionForm ✅
- InterventionForm ✅
- TechnicienForm ✅
- SpecialiteForm ✅

### Pages /new Créées ✅
- `/dashboard/technical/missions/new` ✅
- `/dashboard/technical/interventions/new` ✅

---

## 📝 Prochaines Étapes Recommandées

1. **Démarrer le service Technical** si non existant, ou vérifier sa configuration
2. **Tester chaque endpoint** individuellement avec curl/Postman
3. **Vérifier les logs** backend pour voir les erreurs éventuelles
4. **Peupler la BDD** avec quelques données de test pour chaque entité
5. **Connecter les boutons Print** aux composants d'impression PDF

---

## 🔗 Architecture des Services

```
┌─────────────────┐
│   Frontend      │
│   Port 3000     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Gateway    │
│   Port 3001     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────────┐
│  Auth  │ │  Technical   │
│  3002  │ │  (Port TBD)  │
└────────┘ └──────────────┘
```

Tous les services passent par l'API Gateway qui route les requêtes et vérifie l'authentification JWT.
