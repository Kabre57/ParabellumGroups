# Manuel d'utilisation et analyse de l'application Parabellum Groups

## 1. Vue d'ensemble

Parabellum Groups est un ERP modulaire construit autour :

- d'un frontend `Next.js` avec navigation par permissions ;
- d'un `API Gateway` qui centralise l'authentification, le proxy et le contrôle d'accès ;
- de `12 microservices` métier ;
- d'une infrastructure `PostgreSQL + Redis + MinIO + Nginx`.

### Architecture applicative

| Couche | Emplacement | Rôle |
|---|---|---|
| Frontend | `frontend/` | Interface utilisateur, tableaux de bord, formulaires, impression |
| Gateway | `services/api-gateway/` | Entrée unique `/api`, propagation des headers utilisateur, permissions |
| Authentification | `services/auth-service/` | Connexion, utilisateurs, rôles, permissions, audit |
| Services métier | `services/*-service/` | Domaines fonctionnels séparés |
| Données | `services/*/prisma/schema.prisma` | Modèles et relations métier |

### Microservices présents

| Service | Domaine |
|---|---|
| `auth-service` | Authentification, rôles, permissions, audit |
| `analytics-service` | KPIs, dashboards, rapports |
| `commercial-service` | Prospection commerciale |
| `customer-service` | CRM clients |
| `billing-service` | Factures, devis, paiements |
| `technical-service` | Missions, interventions, techniciens, rapports |
| `project-service` | Projets, tâches, jalons |
| `procurement-service` | Fournisseurs, demandes, bons de commande |
| `inventory-service` | Articles, stock, mouvements, réceptions, équipements |
| `hr-service` | Employés, congés, contrats, paie, prêts, évaluations |
| `communication-service` | Messages, templates, campagnes email, notifications internes |
| `notification-service` | Notifications applicatives |

### Navigation principale côté utilisateur

La navigation visible est pilotée par les permissions et organisée en catégories :

- Tableau de bord
- Commercial
- CRM
- Facturation
- Services techniques
- Gestion de projets
- Achats & logistique
- Ressources humaines
- Communication
- Administration

### Logique d'accès

Le frontend masque ou affiche :

- les catégories du menu ;
- les pages ;
- les actions `créer / modifier / supprimer / approuver / exporter`.

Les règles sont principalement pilotées depuis le service d'authentification via des permissions comme :

- `customers.*`
- `missions.*`
- `projects.*`
- `purchase_orders.*`
- `inventory.*`
- `employees.*`
- `messages.*`
- `permissions.*`

## 2. Analyse fonctionnelle globale

### Forces actuelles

- Architecture métier déjà très large et cohérente.
- Couverture fonctionnelle solide sur CRM, technique, achats/stock, administration et dashboards.
- Permissions fines déjà intégrées jusqu'au niveau des actions.
- Génération de documents et impressions présentes sur plusieurs modules.
- Synchronisations inter-domaines déjà visibles entre CRM, technique, achats et analytics.

### Points de vigilance

Certaines zones existent dans l'interface mais ne sont pas au même niveau de maturité.

#### Modules robustes et connectés

- Authentification et administration
- CRM
- Prospection commerciale
- Technique
- Projets
- Achats, stock, réceptions, audit
- Communication interne
- Notifications
- Analytics

#### Modules partiellement finalisés

- Facturation : liste, création et consultation OK, mais certaines actions PDF/email restent en placeholder sur les pages facture.
- RH : employés, congés, paie, prêts et contrats sont branchés ; certaines cartes RH restent décoratives et les évaluations utilisent encore des données simulées côté page.
- Paramètres système : interface présente, mais non reliée à un backend de configuration.

#### Zones secondaires ou legacy

Le dépôt contient aussi des routes parallèles ou historiques, parfois hors menu principal :

- `/dashboard/billing/*`
- `/dashboard/hr/*`
- `/dashboard/prospects`
- `/dashboard/quotes`
- `/dashboard/comptabilite/*`

Pour l'usage quotidien, il faut privilégier les parcours visibles dans la sidebar.

## 3. Parcours utilisateur transversal

### Connexion

Entrée : `/login`

Parcours :

1. Saisir email et mot de passe.
2. Le service d'authentification retourne le profil et les permissions.
3. L'utilisateur est redirigé vers :
   - le dashboard global s'il est administrateur ;
   - sinon le premier dashboard métier autorisé.

### En-tête et shell applicatif

Le layout protégé gère :

- la sidebar ;
- l'en-tête ;
- le contrôle d'accès à la route courante ;
- la redirection automatique si l'utilisateur n'a pas le droit d'ouvrir la page.

### Notifications et messages

Deux flux coexistent :

- les notifications applicatives ;
- la messagerie interne utilisateur à utilisateur.

### Impression et exports

Déjà présents sur plusieurs domaines :

- technique : fiches mission, ordres de mission, rapports, fiches technicien, spécialités ;
- RH : bulletins et documents imprimables ;
- facturation : structure prévue, mais certaines actions restent à finaliser côté page ;
- achats : impression de commandes prévue via les écrans dédiés.

## 4. Manuel d'utilisation par module

## 4.1 Authentification et contrôle d'accès

### Objectif

Gérer la connexion, les utilisateurs, les rôles et le périmètre fonctionnel visible.

### Sous-modules

- Connexion
- Inscription
- Mot de passe oublié
- Profil utilisateur
- Rôles et permissions

### Utilisation

1. Ouvrir `/login`.
2. Se connecter avec un compte actif.
3. Vérifier la sidebar : elle reflète les modules autorisés.
4. En cas d'accès refusé, vérifier le rôle, les permissions héritées et les surcharges utilisateur.

### Entités principales

- `User`
- `Role`
- `Permission`
- `UserPermission`
- `PermissionChangeRequest`
- `AuditLog`

### Dépendances

- Tous les autres modules.

### Remarques

- Les permissions peuvent venir du rôle ou d'overrides individuels.
- Un workflow d'approbation existe pour les changements sensibles.

## 4.2 Dashboard global et analytics

### Objectif

Donner une lecture transversale de l'activité de l'entreprise.

### Pages principales

- `/dashboard`
- `/dashboard/analytics`
- `/dashboard/technical/analytics`
- `/dashboard/hr/analytics`
- `/dashboard/billing/analytics`

### Ce que l'utilisateur peut faire

- consulter les KPIs globaux ;
- voir le chiffre d'affaires, les clients actifs, les projets et les missions ;
- visualiser les alertes stock ;
- ouvrir les dashboards spécialisés :
  - vue d'ensemble ;
  - financier ;
  - technique ;
  - RH ;
  - clients.

### Entités principales

- `Dashboard`
- `Widget`
- `KPI`
- `Rapport`
- `RapportExecution`

### Dépendances

- analytics consomme les données des autres services.

### Remarques

- Les onglets analytics affichés dépendent des permissions.

## 4.3 Administration

### Objectif

Administrer les comptes, services, rôles, permissions et journaux d'audit.

### Sous-modules

- Utilisateurs
- Permissions utilisateur
- Rôles
- Services
- Journal d'audit
- Workflow d'approbation des permissions

### Utilisateurs

Chemin : `/dashboard/admin/users`

Actions disponibles :

- rechercher un utilisateur ;
- filtrer par rôle ;
- créer un compte ;
- modifier un compte ;
- activer ou désactiver un compte ;
- gérer les surcharges de permissions par utilisateur.

### Rôles

Chemin : `/dashboard/admin/roles-management`

Actions disponibles :

- consulter les rôles système ;
- créer des rôles personnalisés ;
- supprimer un rôle personnalisé s'il n'est pas utilisé.

### Permissions

Chemin : `/dashboard/admin/permissions`

Actions disponibles :

- consulter toutes les permissions ;
- filtrer par catégorie ;
- créer, modifier, supprimer ;
- naviguer vers la gestion par rôle ou par utilisateur ;
- ouvrir le workflow d'approbation.

### Workflow d'approbation

Chemin : `/dashboard/admin/permissions/workflow`

Actions disponibles :

- lister les demandes en attente ;
- approuver ou rejeter une demande ;
- créer une demande de changement ;
- créer un rôle à partir de templates.

### Services

Chemin : `/dashboard/admin/services`

Actions disponibles :

- créer un service ;
- éditer un service ;
- le rattacher à un responsable ;
- activer ou désactiver le service.

### Journal d'audit

Chemin : `/dashboard/admin/audit-logs`

Actions disponibles :

- filtrer par niveau ;
- filtrer par action, entité et période ;
- consulter les événements de sécurité et d'administration.

### Entités principales

- `User`
- `Role`
- `Service`
- `Permission`
- `AuditLog`
- `PermissionChangeRequest`

## 4.4 Commercial

### Objectif

Piloter la prospection et transformer les leads en opportunités puis en clients.

### Pages principales

- `/dashboard/commercial/prospects`
- `/dashboard/commercial/pipeline`
- `/dashboard/commercial/quotes`

### Prospection

Chemin : `/dashboard/commercial/prospects`

Actions disponibles :

- créer un prospect ;
- rechercher par entreprise, contact, email ou téléphone ;
- filtrer par étape et priorité ;
- ouvrir une fiche prospect ;
- modifier ou supprimer ;
- suivre les statistiques de conversion.

Étapes gérées :

- `preparation`
- `research`
- `contact`
- `discovery`
- `proposal`
- `won`
- `lost`

### Pipeline commercial

Chemin : `/dashboard/commercial/pipeline`

Actions disponibles :

- suivre les opportunités CRM sous forme de pipeline ;
- filtrer par étape ;
- consulter le montant du pipeline ;
- éditer le nom, la valeur, la probabilité, l'étape et le statut ;
- supprimer une opportunité.

### Devis et propositions

Chemin : `/dashboard/commercial/quotes`

Actions disponibles :

- consulter les devis commerciaux ;
- filtrer par statut ;
- voir les montants et échéances ;
- modifier le statut ;
- supprimer un devis.

### Entités principales

- `Prospect`
- `ProspectActivity`
- `ProspectionCampaign`
- `EmailTemplate`
- `SalesTarget`
- `Opportunite` via le CRM
- `Devis` via la facturation

### Dépendances

- conversion vers CRM ;
- devis reliés au service de facturation.

## 4.5 CRM

### Objectif

Centraliser les données client, contrats, documents, interactions et opportunités.

### Pages principales

- `/dashboard/crm`
- `/dashboard/crm/clients`
- `/dashboard/crm/clients/[id]`
- `/dashboard/crm/type-clients`
- `/dashboard/crm/contacts`
- `/dashboard/crm/addresses`
- `/dashboard/crm/contracts`
- `/dashboard/crm/documents`
- `/dashboard/crm/interactions`
- `/dashboard/crm/opportunities`
- `/dashboard/crm/reports`
- `/dashboard/crm/email-campaigns`

### Dashboard CRM

Chemin : `/dashboard/crm`

Usage :

- consulter les indicateurs clients ;
- voir les top clients ;
- voir les factures en retard ;
- ouvrir rapidement les sous-modules CRM.

### Clients

Chemins :

- `/dashboard/crm/clients`
- `/dashboard/crm/clients/[id]`

Actions disponibles :

- rechercher par nom, raison sociale, email ou référence ;
- filtrer par statut ;
- créer un client ;
- consulter la fiche détaillée ;
- archiver un client ;
- ouvrir ses adresses, contacts et interactions.

### Types de clients

Chemin : `/dashboard/crm/type-clients`

Usage :

- définir les catégories de clientèle ;
- activer ou désactiver un type.

### Contacts

Chemin : `/dashboard/crm/contacts`

Usage :

- créer et maintenir les contacts associés aux clients ;
- retrouver un contact par client, email ou nom.

### Adresses

Chemin : `/dashboard/crm/addresses`

Usage :

- gérer plusieurs adresses par client ;
- désigner une adresse principale.

### Contrats

Chemin : `/dashboard/crm/contracts`

Actions disponibles :

- créer un contrat ;
- choisir le type ;
- saisir dates, montants, TVA, renouvellement ;
- changer le statut ;
- suivre les contrats à échéance proche.

### Documents

Chemin : `/dashboard/crm/documents`

Actions disponibles :

- ajouter un document ;
- choisir le type ;
- associer le document à un client ;
- qualifier la confidentialité ;
- marquer la validité ;
- modifier ou supprimer.

### Interactions

Chemin : `/dashboard/crm/interactions`

Actions disponibles :

- enregistrer appel, email, réunion, visite, support ;
- lier l'interaction à un client et éventuellement à un contact ;
- suivre le résultat et les actions à prévoir ;
- modifier ou supprimer.

### Opportunités

Chemin : `/dashboard/crm/opportunities`

Actions disponibles :

- créer une opportunité ;
- renseigner montant, probabilité, date de fermeture ;
- suivre l'étape et le statut ;
- mesurer le taux de conversion.

### Campagnes email

Chemin : `/dashboard/crm/email-campaigns`

Actions disponibles :

- créer une campagne depuis un template ;
- définir les destinataires ;
- planifier l'envoi ;
- suivre taux d'ouverture et statut.

### Entités principales

- `Client`
- `Contact`
- `AdresseClient`
- `TypeClient`
- `Contrat`
- `AvenantContrat`
- `InteractionClient`
- `DocumentClient`
- `Opportunite`

### Dépendances

- commercial pour la conversion des prospects ;
- billing pour la visibilité financière ;
- technique pour les missions liées au client.

## 4.6 Facturation

### Objectif

Émettre des devis, gérer les factures et enregistrer les paiements.

### Pages principales

- `/dashboard/facturation`
- `/dashboard/facturation/factures`
- `/dashboard/facturation/factures/[num]`
- `/dashboard/facturation/paiements`
- `/dashboard/commercial/quotes`

### Tableau de bord facturation

Chemin : `/dashboard/facturation`

Usage :

- suivre le CA total ;
- voir les montants en attente et en retard ;
- consulter les dernières factures ;
- lire la tendance mensuelle.

### Factures

Chemin : `/dashboard/facturation/factures`

Actions disponibles :

- rechercher et filtrer par statut ;
- créer une facture ;
- consulter une facture ;
- modifier une facture ;
- supprimer une facture.

### Détail facture

Chemin : `/dashboard/facturation/factures/[num]`

Usage :

- lire les lignes ;
- consulter les paiements associés ;
- suivre les montants HT, TVA, TTC.

### Paiements

Chemin : `/dashboard/facturation/paiements`

Actions disponibles :

- filtrer par méthode ;
- enregistrer un paiement ;
- remonter à la facture liée.

### Entités principales

- `Facture`
- `LigneFacture`
- `Paiement`
- `Devis`
- `LigneDevis`

### Dépendances

- CRM pour les clients ;
- commercial pour la dimension proposition commerciale.

### Limites actuelles

- certaines actions PDF et envoi email sont encore affichées en placeholder sur les pages facture ;
- l'écran détail paiement est encore minimal.

## 4.7 Services techniques

### Objectif

Gérer les compétences, les équipes terrain, les missions, interventions, ordres de mission, rapports et le matériel technique.

### Pages principales

- `/dashboard/technical`
- `/dashboard/technical/analytics`
- `/dashboard/technical/specialites`
- `/dashboard/technical/techniciens`
- `/dashboard/technical/missions`
- `/dashboard/technical/interventions`
- `/dashboard/technical/ordres-mission`
- `/dashboard/technical/rapports`
- `/dashboard/technical/materiel`
- `/dashboard/technical/equipment`

### Spécialités

Chemin : `/dashboard/technical/specialites`

Actions disponibles :

- créer une spécialité ;
- modifier ;
- imprimer ;
- supprimer si elle n'est plus affectée.

### Techniciens

Chemin : `/dashboard/technical/techniciens`

Actions disponibles :

- créer un technicien ;
- rechercher et filtrer par statut ;
- modifier la fiche ;
- imprimer ;
- supprimer sous conditions.

### Missions

Chemin : `/dashboard/technical/missions`

Actions disponibles :

- créer une mission ;
- filtrer par statut ;
- modifier ;
- changer le statut ;
- resynchroniser depuis le CRM ;
- imprimer la fiche mission ;
- générer ou imprimer des ordres de mission ;
- exporter en PDF.

### Interventions

Chemin : `/dashboard/technical/interventions`

Actions disponibles :

- créer une intervention ;
- affecter des techniciens ;
- ajouter du matériel ;
- clôturer l'intervention ;
- imprimer l'intervention ou son rapport ;
- générer un ordre de mission nominatif.

### Ordres de mission

Chemin : `/dashboard/technical/ordres-mission`

Actions disponibles :

- rechercher par mission, technicien, dates, statut ;
- réimprimer ;
- marquer comme imprimé ;
- télécharger le PDF ;
- éditer le contenu.

### Rapports d'intervention

Chemin : `/dashboard/technical/rapports`

Actions disponibles :

- créer un rapport ;
- consulter les rapports existants ;
- filtrer par mot-clé ;
- imprimer le rapport complet ;
- consulter les photos associées.

### Matériel technique

Chemins :

- `/dashboard/technical/materiel`
- `/dashboard/technical/equipment`

Usage :

- créer ou modifier du matériel ;
- suivre stock et seuils d'alerte ;
- repérer les ruptures ;
- suivre l'état des équipements.

### Entités principales

- `Specialite`
- `Technicien`
- `Mission`
- `Intervention`
- `Rapport`
- `OrdreMission`
- `Materiel`
- `SortieMateriel`

### Dépendances

- CRM pour les clients et adresses de mission ;
- MinIO pour les photos de rapport ;
- analytics pour les tableaux de bord.

## 4.8 Gestion de projets

### Objectif

Planifier les projets, piloter les tâches et suivre les jalons.

### Pages principales

- `/dashboard/projets`
- `/dashboard/projets/[id]`
- `/dashboard/projets/taches`
- `/dashboard/projets/jalons`
- `/dashboard/projets/planning`
- `/dashboard/calendar`

### Projets

Chemin : `/dashboard/projets`

Actions disponibles :

- créer un projet ;
- filtrer par statut et client ;
- éditer le budget, le manager, les dates ;
- ouvrir la fiche projet.

### Tâches

Chemin : `/dashboard/projets/taches`

Actions disponibles :

- créer une tâche ;
- filtrer par projet, statut, recherche ;
- assigner un collaborateur ;
- modifier ;
- clôturer une tâche avec durée réelle.

### Jalons

Chemin : `/dashboard/projets/jalons`

Actions disponibles :

- créer un jalon ;
- le rattacher à un projet ;
- suivre son échéance ;
- marquer un jalon comme atteint.

### Planning Gantt

Chemin : `/dashboard/projets/planning`

Usage :

- afficher une vue chronologique simple des tâches et jalons ;
- filtrer par projet.

### Planning projet / calendrier

Chemin : `/dashboard/calendar`

Usage :

- centraliser les événements projets et planning personnel.

### Entités principales

- `Projet`
- `Tache`
- `TacheAssignation`
- `Jalon`

## 4.9 Achats, logistique et stock

### Objectif

Gérer les fournisseurs, demandes, commandes, réceptions, articles, mouvements et audits de stock.

### Pages principales

- `/dashboard/achats`
- `/dashboard/achats/fournisseurs`
- `/dashboard/achats/commandes`
- `/dashboard/achats/receptions`
- `/dashboard/achats/produits`
- `/dashboard/achats/stock`
- `/dashboard/achats/audit`

### Vue d'ensemble achats

Chemin : `/dashboard/achats`

Usage :

- suivre commandes du mois, commandes en attente et budget restant ;
- ouvrir rapidement commandes et stock.

### Fournisseurs

Chemin : `/dashboard/achats/fournisseurs`

Actions disponibles :

- créer un fournisseur ;
- modifier ses coordonnées ;
- suivre son statut et sa note ;
- supprimer.

### Commandes d'achat

Chemin : `/dashboard/achats/commandes`

Actions disponibles :

- créer une commande ;
- filtrer par statut ;
- consulter le détail ;
- éditer ;
- supprimer ;
- initier une réception à partir d'une commande.

### Réceptions

Chemin : `/dashboard/achats/receptions`

Actions disponibles :

- suivre les réceptions en attente, partielles, complètes et vérifiées ;
- consulter les lignes reçues ;
- valider une réception ;
- visualiser le montant total reçu.

### Produits / catalogue

Chemin : `/dashboard/achats/produits`

Actions disponibles :

- créer un article ;
- gérer catégorie, unité, prix, seuils, emplacement ;
- modifier ou supprimer.

### Stock

Chemin : `/dashboard/achats/stock`

Actions disponibles :

- voir les articles en stock ;
- filtrer par catégorie ;
- ne montrer que le stock faible ;
- créer un mouvement de stock ;
- créer un article ;
- consulter l'historique des mouvements.

### Audit de stock

Chemin : `/dashboard/achats/audit`

Actions disponibles :

- comparer stock théorique et réel ;
- lancer un audit ;
- créer un ajustement de stock.

### Entités principales

- `Fournisseur`
- `DemandeAchat`
- `BonCommande`
- `LigneCommande`
- `Article`
- `MouvementStock`
- `Inventaire`
- `Reception`
- `LigneReception`
- `Equipement`

### Dépendances

- procurement-service pour commandes et fournisseurs ;
- inventory-service pour articles, réceptions, mouvements et audits.

## 4.10 Ressources humaines

### Objectif

Gérer les employés, contrats RH, congés, paie, prêts et évaluations.

### Pages principales

- `/dashboard/rh`
- `/dashboard/rh/employes`
- `/dashboard/rh/employes/[id]`
- `/dashboard/rh/contrats`
- `/dashboard/rh/conges`
- `/dashboard/rh/paie`
- `/dashboard/rh/prets`
- `/dashboard/rh/evaluations`

### Dashboard RH

Chemin : `/dashboard/rh`

Usage :

- suivre effectif, employés en congé et masse salariale ;
- ouvrir les sous-modules RH.

### Employés

Chemins :

- `/dashboard/rh/employes`
- `/dashboard/rh/employes/new`
- `/dashboard/rh/employes/[id]`

Actions disponibles :

- rechercher un employé ;
- filtrer par département, statut et type de contrat ;
- créer un employé ;
- consulter la fiche ;
- modifier la fiche.

### Contrats RH

Chemin : `/dashboard/rh/contrats`

Usage :

- gérer les contrats de travail ;
- suivre statut, dates, employé et pièces associées.

### Congés

Chemin : `/dashboard/rh/conges`

Actions disponibles :

- créer une demande ;
- filtrer par statut ;
- approuver ;
- rejeter ;
- consulter le calendrier des absences.

### Paie

Chemin : `/dashboard/rh/paie`

Actions disponibles :

- générer la paie d'une période ;
- consulter brut, net, charges et impôts ;
- valider un bulletin ;
- marquer un bulletin comme payé ;
- télécharger le PDF ;
- recalculer certains montants.

### Prêts et avances

Chemin : `/dashboard/rh/prets`

Actions disponibles :

- créer une avance ou un prêt ;
- définir montant, déduction mensuelle et dates ;
- clôturer ou supprimer.

### Évaluations

Chemin : `/dashboard/rh/evaluations`

Usage actuel :

- afficher des évaluations de performance ;
- filtrer par statut ;
- ouvrir ou modifier les fiches affichées.

### Entités principales

- `Employe`
- `Conge`
- `Presence`
- `Evaluation`
- `Contrat`
- `Payroll`
- `Loan`

### Limites actuelles

- la page évaluations repose encore sur des données simulées côté frontend ;
- certaines cartes du dashboard RH sont décoratives ou incomplètes ;
- le suivi des prêts est plus abouti que les indicateurs de dashboard associés.

## 4.11 Communication

### Objectif

Faciliter la communication interne et l'envoi de campagnes email.

### Pages principales

- `/dashboard/messages`
- `/dashboard/crm/email-campaigns`
- `/dashboard/notifications`

### Messagerie interne

Chemin : `/dashboard/messages`

Actions disponibles :

- lister les conversations ;
- rechercher par interlocuteur ou contenu ;
- filtrer par statut ;
- composer un message ;
- répondre à une conversation ;
- envoyer, marquer lu, archiver.

### Campagnes email

Chemin : `/dashboard/crm/email-campaigns`

Actions disponibles :

- créer une campagne ;
- choisir un template ;
- saisir les destinataires ;
- planifier ou modifier la campagne ;
- suivre les stats d'envoi et d'ouverture.

### Notifications

Chemin : `/dashboard/notifications`

Actions disponibles :

- consulter toutes les notifications ;
- marquer une notification comme lue ;
- tout marquer comme lu ;
- ouvrir le lien associé.

### Entités principales

- `Message`
- `Template`
- `CampagneMail`
- `Notification`

## 4.12 Profil et paramètres

### Profil utilisateur

Chemin : `/dashboard/profile`

Usage :

- consulter ses informations ;
- mettre à jour certaines données personnelles.

### Paramètres système

Chemin : `/dashboard/settings`

Sections visibles :

- général ;
- base de données ;
- notifications ;
- email ;
- sécurité ;
- localisation.

### Limite actuelle

- page principalement statique, utile comme maquette d'administration mais non connectée à un backend de configuration.

## 5. Dépendances métier entre modules

### Flux les plus importants

- `Commercial -> CRM`
  - conversion des prospects en clients et opportunités.
- `CRM -> Technique`
  - missions rattachées à des clients et synchronisation CRM.
- `CRM -> Facturation`
  - factures, devis et contrats reposent sur les clients CRM.
- `Achats -> Stock`
  - commandes et réceptions alimentent les articles et mouvements.
- `Technique -> Analytics`
  - missions, interventions et rapports enrichissent les KPIs.
- `RH -> Analytics`
  - effectifs, paie et congés alimentent les tableaux RH.
- `Auth -> Tous les modules`
  - rôles, permissions, audit, visibilité.

## 6. Recommandations d'usage

### Pour un administrateur

1. Créer les services.
2. Créer les rôles.
3. Créer les permissions ou ajuster les existantes.
4. Créer les utilisateurs.
5. Vérifier le journal d'audit.

### Pour l'équipe commerciale

1. Créer les prospects.
2. Alimenter les activités.
3. Convertir en opportunités CRM.
4. Transformer en client.
5. Produire les devis.

### Pour l'équipe technique

1. Maintenir les spécialités et techniciens.
2. Créer la mission.
3. Créer les interventions.
4. Affecter les techniciens.
5. Générer les ordres de mission.
6. Produire le rapport d'intervention.

### Pour les achats

1. Créer les fournisseurs.
2. Émettre les commandes.
3. Créer ou valider les réceptions.
4. Vérifier le stock.
5. Corriger via audit si nécessaire.

### Pour les RH

1. Créer les employés.
2. Maintenir contrats et congés.
3. Générer la paie.
4. Gérer prêts et avances.

## 7. Synthèse de maturité

| Module | Niveau actuel | Commentaire |
|---|---|---|
| Auth / Admin | Élevé | Très structuré, permissions fines et audit présents |
| Analytics | Élevé | Bon niveau de synthèse transverse |
| Commercial | Élevé | Prospection et pipeline bien posés |
| CRM | Élevé | Large couverture des objets métier |
| Technique | Élevé | Module le plus complet côté opérationnel |
| Projets | Bon | Base solide pour pilotage projet |
| Achats / Stock | Élevé | Couverture large et cohérente |
| Facturation | Bon | Fonctionnel, quelques actions UI encore à finaliser |
| RH | Moyen à bon | Cœur branché, quelques écrans encore partiels |
| Communication | Bon | Messages, campagnes et notifications présents |
| Paramètres | Faible | Interface surtout démonstrative |
| Comptabilité | Faible / secondaire | Présence de pages legacy hors navigation principale |

## 8. Conclusion

L'application est déjà une base ERP riche, avec un cœur métier opérationnel autour de :

- l'administration et la sécurité ;
- la relation client ;
- les opérations techniques ;
- les achats et le stock ;
- les dashboards transverses.

Les principaux chantiers de finition se situent sur :

- certains écrans RH ;
- quelques actions facturation encore en placeholder ;
- les paramètres système ;
- les routes secondaires ou legacy à rationaliser.
