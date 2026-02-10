# 📖 MANUEL UTILISATEUR - Parabellum ERP

## Table des matières
1. [Introduction](#introduction)
2. [Connexion](#connexion)
3. [Interface principale](#interface-principale)
4. [Modules disponibles](#modules-disponibles)
5. [Gestion des permissions](#gestion-des-permissions)
6. [Administration](#administration)

---

## 1. Introduction

Parabellum ERP est un système de gestion d'entreprise intégré permettant de gérer :
- 👥 La relation client (CRM)
- 💰 La facturation et les paiements
- 🔧 Les services techniques
- 📊 Les projets
- 📦 Les achats et les stocks
- 👨‍💼 Les ressources humaines
- 📧 La communication

---

## 2. Connexion

### Accès à l'application
1. Ouvrez votre navigateur
2. Accédez à `http://localhost:3000` (développement) ou l'URL fournie par votre administrateur
3. Vous serez redirigé vers la page de connexion

### Identifiants par défaut

**Administrateur :**
- Email : `admin@parabellum.com`
- Mot de passe : `Admin@2026!`

**Employé standard :**
- Créé par l'administrateur via le module Users

### Première connexion
1. Entrez votre email professionnel
2. Entrez votre mot de passe
3. Cliquez sur "Se connecter"
4. Vous serez redirigé vers le tableau de bord

### Mot de passe oublié
*(Fonctionnalité à venir)*
- Contactez votre administrateur système

---

## 3. Interface principale

### Structure de l'interface

```
┌─────────────────────────────────────────────────────┐
│  HEADER                                             │
│  [Logo] Parabellum ERP        [🔔] [👤 User Menu]  │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ SIDEBAR  │         CONTENU PRINCIPAL               │
│          │                                          │
│ • Dashboard                                         │
│ • Commercial                                        │
│ • CRM                                               │
│ • Facturation                                       │
│ • Services Techniques                               │
│ • Projets                                           │
│ • Achats                                            │
│ • RH                                                │
│ • Communication                                     │
│                                                     │
│ [ADMINISTRATION] (Admin only)                       │
│ • Utilisateurs                                      │
│ • Rôles                                             │
│ • Services                                          │
│ • Permissions                                       │
│ • Paramètres                                        │
│                                                     │
└──────────┴──────────────────────────────────────────┘
```

### Barre latérale (Sidebar)

#### Recherche rapide
- Barre de recherche en haut de la sidebar
- Permet de filtrer rapidement les menus
- Tapez quelques lettres pour filtrer

#### Navigation par catégories
Cliquez sur une catégorie pour déplier/replier ses sous-menus :
- ▶ **Tableau de Bord** : Vue d'ensemble et analytics
- ▶ **Commercial** : Gestion des prospects et devis
- ▶ **CRM** : Clients, contacts, contrats
- ▶ **Facturation** : Factures, paiements, avoirs
- ▶ **Services Techniques** : Interventions, missions, techniciens
- ▶ **Projets** : Gestion de projets, tâches, planning
- ▶ **Achats** : Commandes, fournisseurs, stock
- ▶ **RH** : Employés, congés, paie
- ▶ **Communication** : Messages, emails, campagnes

#### Section Administration
**Visible uniquement pour les Administrateurs**

Permet de gérer :
- 👥 Utilisateurs
- 🛡️ Rôles
- 🏢 Services
- ✅ Permissions
- ⚙️ Paramètres

### Menu utilisateur (en haut à droite)

Cliquez sur votre avatar ou nom pour accéder à :
- **Mon profil** : Voir et modifier vos informations
- **Paramètres** : Préférences personnelles
- **Déconnexion** : Se déconnecter de l'application

---

## 4. Modules disponibles

### 📊 Tableau de Bord (Dashboard)

**Accès** : Page d'accueil par défaut

**Fonctionnalités** :
- Vue d'ensemble de l'activité
- KPIs (indicateurs de performance)
  - Chiffre d'affaires
  - Nombre de clients actifs
  - Projets en cours
  - Factures impayées
  - Taux de conversion
  - Interventions actives
- Graphiques d'évolution
  - Revenus mensuels
  - Top clients
- Alertes et notifications
  - Interventions en cours
  - Rapports en attente
  - Alertes de stock

**Période d'analyse** :
- Sélecteur en haut à droite : "30 derniers jours", "90 jours", "12 mois"

---

### 🎯 Commercial

#### Workflow Prospection
**Chemin** : `Commercial > Workflow Prospection`

**Fonctionnalités** :
- Pipeline commercial visuel (Kanban)
- Gestion des prospects par étapes :
  - Lead
  - Qualifié
  - Proposition
  - Négociation
  - Gagné/Perdu
- Actions sur les prospects :
  - Ajouter une note
  - Ajouter une activité (appel, email, rendez-vous)
  - Uploader des documents
  - Déplacer dans le pipeline
  - Convertir en client

#### Devis & Propositions
**Chemin** : `Commercial > Devis & Propositions`

**Fonctionnalités** :
- Créer un devis
- Gérer les devis en cours
- Envoyer par email
- Suivre l'état (brouillon, envoyé, accepté, refusé)
- Convertir en facture

---

### 👥 CRM (Gestion Clients)

#### Clients
**Chemin** : `CRM > Clients`

**Vue liste** :
- Tableau de tous les clients
- Filtres : statut, secteur, type
- Recherche par nom, email, téléphone
- Colonnes : Nom, Type, Secteur, Contact principal, CA total

**Fiche client** (clic sur un client) :
- Informations générales
- Contacts associés
- Contrats en cours
- Historique des interactions
- Documents liés
- Opportunités commerciales
- Statistiques (CA, factures, projets)

#### Contacts
**Chemin** : `CRM > Contacts`

**Fonctionnalités** :
- Ajouter un contact
- Lier à un client
- Gérer les coordonnées
- Historique des échanges
- Notes internes

#### Contrats
**Chemin** : `CRM > Contrats`

**Fonctionnalités** :
- Créer un contrat
- Gérer la durée et le renouvellement
- Suivi des échéances
- Archivage automatique

---

### 💰 Facturation

#### Factures
**Chemin** : `Facturation > Factures`

**Actions disponibles** :
- ➕ Créer une nouvelle facture
- ✏️ Modifier une facture (si brouillon)
- 📧 Envoyer par email
- 📄 Télécharger en PDF
- 💳 Enregistrer un paiement
- 🗑️ Supprimer (si non payée)

**États des factures** :
- 🟡 Brouillon
- 🔵 Envoyée
- 🟢 Payée
- 🔴 En retard
- ⚫ Annulée

#### Suivi Paiements
**Chemin** : `Facturation > Suivi Paiements`

**Fonctionnalités** :
- Liste de tous les paiements reçus
- Rapprochement bancaire
- Historique par client
- Export comptable

#### Avoirs & Remboursements
**Chemin** : `Facturation > Avoirs & Remboursements`

**Fonctionnalités** :
- Créer un avoir
- Lier à une facture
- Suivre les remboursements

---

### 🔧 Services Techniques

#### Planning Interventions
**Chemin** : `Services Techniques > Planning Interventions`

**Vue calendrier** :
- Affichage jour/semaine/mois
- Interventions planifiées
- Techniciens assignés
- Drag & drop pour réaffecter

**Créer une intervention** :
1. Cliquer sur "Nouvelle Intervention"
2. Sélectionner le client
3. Choisir le technicien
4. Définir la date/heure
5. Décrire le besoin
6. Valider

#### Gestion des Missions
**Chemin** : `Services Techniques > Gestion des Missions`

**Fonctionnalités** :
- Créer une mission (projet technique multi-interventions)
- Assigner une équipe
- Suivre l'avancement
- Gérer les sous-tâches
- Clôturer et générer le rapport

#### Équipe Technique
**Chemin** : `Services Techniques > Équipe Technique`

**Gestion des techniciens** :
- Fiche technicien (spécialités, disponibilité)
- Planning individuel
- Historique des interventions
- Évaluation de performance

#### Rapports d'Intervention
**Chemin** : `Services Techniques > Rapports d'Intervention`

**Fonctionnalités** :
- Consulter les rapports
- Valider les interventions
- Exporter en PDF
- Envoyer au client

---

### 📁 Gestion de Projets

#### Projets
**Chemin** : `Gestion de Projets > Projets`

**Créer un projet** :
1. Nom du projet
2. Client associé
3. Dates de début/fin
4. Budget
5. Chef de projet
6. Description

**Tableau de bord projet** :
- Vue d'ensemble (budget, avancement, équipe)
- Tâches (en cours, terminées, en retard)
- Jalons (milestones)
- Documents
- Temps passé

#### Tâches & Planning
**Chemin** : `Gestion de Projets > Tâches & Planning`

**Vue Kanban** :
- À faire / En cours / À réviser / Terminé
- Assigner une tâche
- Définir une priorité
- Ajouter une échéance
- Suivre le temps passé

#### Planning Gantt
**Chemin** : `Gestion de Projets > Planning Gantt`

**Fonctionnalités** :
- Vue chronologique des tâches
- Dépendances entre tâches
- Chemin critique
- Ajustement drag & drop

#### Feuilles de Temps
**Chemin** : `Gestion de Projets > Feuilles de Temps`

**Pour les employés** :
- Saisir le temps passé par projet/tâche
- Validation hebdomadaire
- Historique personnel

**Pour les managers** :
- Valider les feuilles de temps
- Exporter pour facturation
- Analyser la productivité

---

### 🛒 Achats & Logistique

#### Fournisseurs
**Chemin** : `Achats & Logistique > Fournisseurs`

**Fonctionnalités** :
- Créer une fiche fournisseur
- Évaluer (notation)
- Historique des commandes
- Documents (RIB, SIRET, etc.)

#### Commandes d'Achat
**Chemin** : `Achats & Logistique > Commandes d'Achat`

**Processus** :
1. Créer un bon de commande
2. Ajouter des lignes (articles)
3. Envoyer au fournisseur
4. Réceptionner
5. Valider la facture fournisseur

**États** :
- Brouillon
- Envoyée
- Partiellement reçue
- Reçue
- Facturée

#### Gestion des Stocks
**Chemin** : `Achats & Logistique > Gestion des Stocks`

**Fonctionnalités** :
- Consulter le stock actuel
- Alertes de seuil minimum
- Mouvements de stock (entrées/sorties)
- Inventaires
- Valorisation du stock

---

### 👨‍💼 Ressources Humaines

#### Effectifs
**Chemin** : `Ressources Humaines > Effectifs`

**Gestion des employés** :
- Créer une fiche employé
- Coordonnées et informations RH
- Documents (CV, diplômes, contrat)
- Historique (postes, évaluations, formations)

#### Contrats
**Chemin** : `Ressources Humaines > Contrats`

**Fonctionnalités** :
- Gérer les contrats de travail (CDI, CDD, stage)
- Avenants
- Renouvellement automatique
- Archivage

#### Gestion des Congés
**Chemin** : `Ressources Humaines > Gestion des Congés`

**Pour les employés** :
- Soumettre une demande de congé
- Consulter le solde de congés
- Historique des demandes

**Pour les managers** :
- Approuver/rejeter les demandes
- Vue calendrier d'équipe
- Gestion des soldes

#### Paie & Salaires
**Chemin** : `Ressources Humaines > Paie & Salaires`

**Fonctionnalités** :
- Génération des fiches de paie
- Export comptable
- Historique des salaires
- Primes et avances

---

### 📧 Communication

#### Messagerie Interne
**Chemin** : `Communication > Messagerie Interne`

**Fonctionnalités** :
- Envoyer un message à un utilisateur
- Conversations de groupe
- Pièces jointes
- Notifications en temps réel

#### Campagnes Email
**Chemin** : `Communication > Campagnes Email`

**Fonctionnalités** :
- Créer une campagne email
- Gérer les listes de destinataires
- Templates personnalisables
- Suivi des statistiques (taux d'ouverture, clics)

---

## 5. Gestion des permissions

### Concept

Parabellum ERP utilise un **système d'autorisation graduelle** :
- Chaque utilisateur possède un **rôle** (Administrateur, Employé, etc.)
- Chaque rôle possède des **permissions** de base
- Les permissions peuvent être **personnalisées par utilisateur**

### Types de permissions

Pour chaque ressource (users, invoices, projects, etc.), il existe **5 actions** :

| Action | Description | Exemple |
|--------|-------------|---------|
| **View** (Voir) | Consulter les données | Voir la liste des clients |
| **Create** (Créer) | Ajouter de nouvelles entrées | Créer une facture |
| **Edit** (Modifier) | Modifier des données existantes | Modifier un projet |
| **Delete** (Supprimer) | Supprimer des données | Supprimer un utilisateur |
| **Approve** (Valider) | Approuver des actions | Valider une demande de congé |

### Catégories de permissions

```
dashboard       → Tableau de bord
users           → Gestion des utilisateurs
roles           → Gestion des rôles
services        → Gestion des services
permissions     → Gestion des permissions
customers       → Gestion clients (CRM)
invoices        → Facturation
payments        → Paiements
quotes          → Devis
projects        → Gestion de projets
tasks           → Tâches
missions        → Missions techniques
interventions   → Interventions
techniciens     → Techniciens
purchases       → Achats
suppliers       → Fournisseurs
inventory       → Stock
employees       → Employés RH
leaves          → Congés
contracts       → Contrats RH
salaries        → Paie
messages        → Messagerie
```

### Héritage des permissions

1. **Permissions du rôle** (base) : Tous les utilisateurs d'un même rôle partagent les mêmes permissions
2. **Permissions utilisateur** (override) : Peuvent surcharger les permissions du rôle

**Exemple** :
- Rôle "Employé" : peut **voir** les clients, mais pas les **créer**
- Utilisateur "Jean Dupont" (Employé) : permission spéciale pour **créer** des clients
- Résultat : Jean Dupont peut créer des clients, contrairement aux autres employés

### Vérification dans l'interface

Les éléments de l'interface s'affichent **automatiquement** selon vos permissions :
- ✅ Si vous avez la permission → l'élément est visible
- ❌ Si vous n'avez pas la permission → l'élément est masqué

**Exemple** :
- Menu "Administration" → visible uniquement pour les administrateurs
- Bouton "Supprimer" → visible uniquement si vous avez `canDelete` pour cette ressource

---

## 6. Administration

**⚠️ Section réservée aux Administrateurs**

### Utilisateurs

**Chemin** : `Administration > Utilisateurs`

#### Créer un utilisateur
1. Cliquer sur "Nouvel Utilisateur"
2. Remplir le formulaire :
   - Email (identifiant de connexion)
   - Prénom et Nom
   - Rôle
   - Service (optionnel)
   - Mot de passe initial
3. Enregistrer
4. L'utilisateur reçoit ses identifiants par email

#### Gérer un utilisateur
- **Modifier** : Changer les informations, le rôle, le service
- **Activer/Désactiver** : Bloquer l'accès temporairement sans supprimer
- **Permissions personnalisées** : Ajouter des permissions spécifiques
- **Réinitialiser le mot de passe**
- **Supprimer** : ⚠️ Action irréversible

#### Permissions utilisateur
**Chemin** : Cliquer sur un utilisateur > Onglet "Permissions"

**Fonctionnalités** :
- Voir les permissions héritées du rôle (grisées)
- Ajouter des permissions supplémentaires (surlignées en vert)
- Retirer des permissions du rôle (surlignées en rouge)

---

### Rôles

**Chemin** : `Administration > Rôles`

#### Rôles système (non modifiables)
- **Administrateur** (`ADMIN`) : Accès complet au système
- **Employé** (`EMPLOYEE`) : Accès de base

#### Créer un rôle personnalisé
1. Cliquer sur "Nouveau Rôle"
2. Définir :
   - Nom du rôle (ex: "Responsable Commercial")
   - Code (ex: "SALES_MANAGER")
   - Description
3. Enregistrer
4. Attribuer les permissions (voir ci-dessous)

#### Attribuer des permissions à un rôle
**Chemin** : Cliquer sur un rôle > Onglet "Permissions"

**Interface** :
```
┌─────────────────────────────────────────────────────┐
│ Permission: Clients (customers)                     │
├─────────┬────────┬────────┬────────┬────────────────┤
│ ☑ View  │ ☑ Create │ ☑ Edit │ ☐ Delete │ ☐ Approve │
└─────────┴────────┴────────┴────────┴────────────────┘
```

1. Parcourir les catégories de permissions
2. Cocher les actions autorisées (View, Create, Edit, Delete, Approve)
3. Enregistrer

**Exemple de configuration "Responsable Commercial"** :
- Clients : ✅ View, ✅ Create, ✅ Edit, ❌ Delete
- Devis : ✅ View, ✅ Create, ✅ Edit, ✅ Approve
- Factures : ✅ View, ❌ Create, ❌ Edit, ❌ Delete
- Projets : ✅ View, ❌ Create, ❌ Edit, ❌ Delete

---

### Services

**Chemin** : `Administration > Services`

#### Créer un service
Les services représentent les départements de l'entreprise :
- Commercial
- Technique
- Comptabilité
- Ressources Humaines
- Direction

**Utilité** :
- Filtrer les utilisateurs par service
- Assigner des permissions par service
- Générer des rapports par département

---

### Permissions

**Chemin** : `Administration > Permissions`

#### Créer une nouvelle permission
**⚠️ Fonctionnalité avancée - Réservée aux administrateurs système**

1. Cliquer sur "Nouvelle Permission"
2. Définir :
   - Nom (format: `category.action`, ex: `reports.export`)
   - Description
   - Catégorie (pour le regroupement)
3. Enregistrer
4. Attribuer la permission à des rôles

**Exemples d'usage** :
- Créer une permission `analytics.advanced` pour les statistiques avancées
- Créer une permission `data.export` pour l'export de données sensibles

---

### Paramètres

**Chemin** : `Administration > Paramètres`

#### Paramètres généraux
- Nom de l'entreprise
- Logo
- Coordonnées
- Devise par défaut
- Fuseau horaire

#### Paramètres de facturation
- Numérotation automatique des factures
- Mentions légales
- Conditions de paiement par défaut
- TVA par défaut

#### Paramètres de notification
- Emails automatiques (factures, relances)
- Templates d'emails
- Configuration SMTP

#### Paramètres de sécurité
- Complexité des mots de passe
- Durée de session
- Authentification à deux facteurs (2FA)

---

## 🆘 Support et Aide

### En cas de problème

1. **Vérifier votre connexion internet**
2. **Actualiser la page** (F5 ou Ctrl+R)
3. **Vider le cache du navigateur** (Ctrl+Shift+R)
4. **Contacter votre administrateur système**

### Signaler un bug

Fournir les informations suivantes :
- Page/Module concerné
- Action effectuée
- Erreur affichée (capture d'écran)
- Navigateur utilisé (Chrome, Firefox, etc.)
- Date et heure de l'incident

### Demander une nouvelle fonctionnalité

Contacter l'équipe projet avec :
- Description détaillée du besoin
- Cas d'usage concret
- Bénéfice attendu

---

## 📞 Contact

**Équipe projet Parabellum ERP**
- Email : support@parabellum.com
- Documentation technique : [GitHub](https://github.com/parabellum/erp)
- Support : Ticket interne via la plateforme

---

**Version du manuel** : 1.0  
**Dernière mise à jour** : Février 2026  
**Application** : Parabellum ERP v1.0.0
