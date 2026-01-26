# 🔧 Correction - Base de Données Technical-Service

## 🐛 Problème Identifié

**Erreur** : `The table '(not available)' does not exist in the current database`

**Cause** : Les tables du technical-service n'ont pas été créées dans PostgreSQL.

---

## ✅ Solution - Instructions Simples

### Option 1 : Script Automatique (Recommandé)

**⚠️ IMPORTANT : Arrêtez d'abord le technical-service (Ctrl+C dans son terminal)**

Puis exécutez :

```powershell
cd services\technical-service
.\init-db.ps1
```

Ce script va :
1. ✅ Générer le client Prisma
2. ✅ Créer des données de test (spécialités, techniciens, missions)

Ensuite, **redémarrez le technical-service** :

```powershell
cd services\technical-service
npm start
```

Actualisez votre navigateur (F5).

---

### Option 2 : Commandes Manuelles

**⚠️ Arrêtez le technical-service d'abord (Ctrl+C)**

```powershell
# 1. Aller dans le dossier
cd services\technical-service

# 2. Générer le client Prisma
npm run prisma:generate

# 3. Seeder la base de données
node prisma\seed.js

# 4. Redémarrer le service
npm start
```

---

## 📊 Données de Test Créées

### Spécialités (5)
- Électricité
- Plomberie
- Climatisation
- Chauffage
- Sécurité

### Techniciens (4)
- Jean Dupont (Électricité)
- Marie Martin (Climatisation)
- Paul Bernard (Plomberie)
- Aya Kouadio (Sécurité)

### Missions (2)
- MISS-2026-001 : Installation électrique immeuble
- MISS-2026-002 : Maintenance climatisation

---

## 🧪 Vérification

Après redémarrage :

1. Ouvrir `/dashboard/technical/techniciens`
2. Vous devriez voir **4 techniciens**
3. Ouvrir `/dashboard/technical/specialites`
4. Vous devriez voir **5 spécialités**
5. Ouvrir `/dashboard/technical/missions`
6. Vous devriez voir **2 missions**

Plus d'erreur "table does not exist" ! ✅

---

**Date** : 2026-01-22  
**Urgence** : 🔴 HAUTE (requis pour la présentation)
