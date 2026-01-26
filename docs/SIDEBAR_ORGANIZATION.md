# Organisation de la Sidebar - Architecture Microservices

## 📋 Nouvelle Structure

La sidebar a été réorganisée pour refléter l'architecture microservices du backend. Chaque catégorie correspond maintenant à un microservice spécifique.

### 1. 📊 Tableau de Bord (Analytics Service)
**Microservice :** `analytics-service`

- Tableau de bord général
- Analytics & rapports

---

### 2. 🎯 Commercial (Commercial Service)
**Microservice :** `commercial-service` ✨ **NOUVEAU**

**Routes :**
- `/dashboard/commercial/prospects` - Workflow de prospection (7 étapes)
- `/dashboard/commercial/pipeline` - Pipeline commercial
- `/dashboard/commercial/quotes` - Devis & propositions

**Fonctionnalités :**
- Gestion complète du workflow de prospection
- Conversion prospect → client
- Suivi des activités commerciales
- Statistiques de conversion

---

### 3. 👥 CRM & Clients (Customer Service)
**Microservice :** `customer-service`

**Routes :**
- `/dashboard/clients` - Liste des clients
- `/dashboard/contacts` - Contacts clients
- `/dashboard/clients/interactions` - Historique des interactions

**Séparation logique :**
- **Commercial** = Avant-vente (prospects, pipeline, devis)
- **CRM** = Après-vente (clients existants, suivi relation)

---

### 4. 🧾 Facturation (Billing Service)
**Microservice :** `billing-service`

**Routes :**
- `/dashboard/facturation` - Gestion des factures
- `/dashboard/facturation/paiements` - Suivi des paiements
- `/dashboard/facturation/avoirs` - Avoirs & remboursements

---

### 5. 🔧 Services Techniques (Technical Service)
**Microservice :** `technical-service`

**Routes :**
- `/dashboard/technical/interventions` - Planning des interventions
- `/dashboard/technical/missions` - Gestion des missions
- `/dashboard/technical/techniciens` - Équipe technique
- `/dashboard/technical/specialites` - Spécialités techniques
- `/dashboard/technical/rapports` - Rapports d'intervention

**Corrections apportées :**
- ✅ Correction du lien vers Missions : `/dashboard/technical/missions` (au lieu de `/dashboard/missions`)
- ✅ Correction du lien vers Techniciens : `/dashboard/technical/techniciens` (au lieu de `/dashboard/techniciens`)
- ❌ Suppression de "Parc Matériel" (à implémenter ultérieurement)

---

### 6. 📁 Gestion de Projets (Project Service)
**Microservice :** `project-service`

**Routes :**
- `/dashboard/projets` - Liste des projets
- `/dashboard/projets/taches` - Tâches & planning
- `/dashboard/projets/jalons` - Jalons (milestones)
- `/dashboard/projets/planning` - Planning Gantt
- `/dashboard/timesheets` - Feuilles de temps

**Améliorations :**
- Ajout explicite des Tâches et Jalons (modèles Prisma)
- Planning Gantt pour visualisation
- Séparation claire projet/tâches

---

### 7. 🛒 Achats & Logistique (Procurement Service)
**Microservice :** `procurement-service`

**Routes :**
- `/dashboard/achats/produits` - Catalogue produits
- `/dashboard/achats/fournisseurs` - Fournisseurs
- `/dashboard/achats/commandes` - Commandes d'achat
- `/dashboard/achats/receptions` - Réceptions
- `/dashboard/achats/stock` - Gestion des stocks
- `/dashboard/achats/audit` - Audit stock

---

### 8. 👨‍💼 Ressources Humaines (HR Service)
**Microservice :** `hr-service`

**Routes :**
- `/dashboard/rh/employes` - Effectifs
- `/dashboard/rh/contrats` - Contrats
- `/dashboard/rh/paie` - Paie & salaires
- `/dashboard/rh/conges` - Gestion des congés
- `/dashboard/rh/prets` - Avances & prêts
- `/dashboard/rh/evaluations` - Évaluations

---

### 9. 💬 Communication
**Microservice :** `messaging-service` (à créer)

**Routes :**
- `/dashboard/messages` - Messagerie interne
- `/dashboard/contacts` - Contacts clients
- `/dashboard/email-campaigns` - Campagnes email

---

### 10. ⚙️ Administration (Auth Service)
**Microservice :** `auth-service`

**Routes :**
- `/dashboard/admin/users` - Gestion des utilisateurs ✨ **NOUVELLE PAGE**
- `/dashboard/admin/services` - Gestion des services
- `/dashboard/admin/permissions` - Gestion des permissions
- `/dashboard/settings` - Paramètres système

---

## 🔄 Mapping Ancien → Nouveau

| Ancienne URL | Nouvelle URL | Raison |
|--------------|--------------|--------|
| `/dashboard/prospects` | `/dashboard/commercial/prospects` | Alignement microservice |
| `/dashboard/missions` | `/dashboard/technical/missions` | Regroupement technique |
| `/dashboard/techniciens` | `/dashboard/technical/techniciens` | Regroupement technique |
| `/dashboard/calendar` | `/dashboard/projets/planning` | Clarification contexte |
| `/dashboard/documents` | `/dashboard/projets/taches` | Intégration dans projets |

---

## 📂 Architecture des Microservices

```
services/
├── auth-service/          # Authentification & permissions
├── commercial-service/    # ✨ NOUVEAU - Prospection commerciale
├── customer-service/      # CRM & gestion clients
├── billing-service/       # Facturation & paiements
├── technical-service/     # Interventions techniques
├── project-service/       # Gestion de projets
├── procurement-service/   # Achats & stocks
├── hr-service/            # Ressources humaines
└── analytics-service/     # Analytics & rapports
```

---

## 🎨 Avantages de cette Organisation

### 1. **Clarté Fonctionnelle**
Chaque section de la sidebar correspond à un domaine métier distinct :
- Commercial = Avant-vente
- CRM = Relation client
- Facturation = Finance client
- Technique = Opérations terrain
- Projets = Gestion de projets
- Achats = Supply chain
- RH = Gestion du personnel

### 2. **Scalabilité**
- Chaque microservice peut évoluer indépendamment
- Ajout de nouvelles fonctionnalités sans impacter les autres modules

### 3. **Maintenance**
- Code organisé par domaine métier
- Équipes peuvent travailler en parallèle
- Tests isolés par service

### 4. **Performance**
- Services déployables indépendamment
- Possibilité de scaler horizontalement les services les plus sollicités

---

## 🚀 Services Implémentés

### ✅ Complets
- **auth-service** : Authentification, utilisateurs, permissions
- **technical-service** : Interventions, missions, techniciens, spécialités
- **commercial-service** : Workflow de prospection (nouveau !)

### 🔄 Partiels (à compléter)
- **billing-service** : Factures (à connecter au frontend)
- **customer-service** : Clients (à connecter au frontend)
- **project-service** : Projets (à connecter au frontend)
- **procurement-service** : Achats (à connecter au frontend)
- **hr-service** : RH (à connecter au frontend)

### ❌ À créer
- **analytics-service** : Dashboard & rapports
- **messaging-service** : Communication interne

---

## 🔑 Permissions par Microservice

### Commercial Service
- `prospects.create` - Créer un prospect
- `prospects.read` - Consulter les prospects
- `prospects.update` - Modifier un prospect
- `prospects.delete` - Supprimer un prospect
- `prospects.assign` - Assigner des prospects
- `prospects.activities` - Gérer les activités
- `prospects.convert` - Convertir en client

### Technical Service
- `interventions.create/read/update/delete`
- `missions.create/read/update/delete`
- `techniciens.create/read/update/delete`
- `specialites.create/read/update/delete`

### Project Service
- `projects.create/read/update/delete`
- `projects.tasks.create/assign`
- `projects.milestones`
- `projects.time.track`

*(Voir `IMPLEMENTATION_STATUS.md` pour la liste complète)*

---

## 📝 Notes Importantes

1. **Cohérence des URLs** : Toutes les routes techniques sont maintenant sous `/dashboard/technical/`
2. **Pas de données mockées** : Tous les composants utilisent des appels API réels
3. **Sidebar responsive** : Adaptation mobile/desktop automatique
4. **Permissions** : Chaque lien vérifie les permissions de l'utilisateur
5. **Search** : Barre de recherche intégrée dans la sidebar

---

## 🛠️ Prochaines Étapes

1. ✅ Créer la page Gestion des Utilisateurs
2. ✅ Réorganiser la sidebar selon les microservices
3. ⏳ Connecter les pages existantes aux backends réels
4. ⏳ Implémenter le système de permissions granulaires
5. ⏳ Créer les services manquants (analytics, messaging)
6. ⏳ Tester l'intégration complète

---

## 🎯 Objectif Final

Une application ERP modulaire où :
- Chaque module est **autonome** et **testable**
- La **sidebar reflète l'architecture** backend
- Les **permissions** sont gérées de manière **granulaire**
- Le système est **scalable** et **maintenable**
