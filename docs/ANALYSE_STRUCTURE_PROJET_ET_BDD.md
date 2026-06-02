# Analyse du projet ParabellumGroups

## 1. Vue d'ensemble

Le projet est un monorepo ERP organise autour de :

- un frontend Next.js dans `frontend/`
- une API Gateway Express dans `services/api-gateway/`
- plusieurs microservices Node.js dans `services/`
- une base PostgreSQL segementee par domaine metier
- Redis pour certains services
- MinIO pour les fichiers et pieces jointes

Le flux principal est le suivant :

`Frontend -> API Gateway -> Microservice metier -> Base PostgreSQL du service`

## 2. Arborescence fonctionnelle

```text
ParabellumGroups/
|-- frontend/                     # Interface Next.js
|   |-- app/                      # Routage par pages
|   |-- src/components/           # UI metier par domaine
|   |-- src/shared/               # API client, auth, permissions, providers
|   `-- src/lib/                  # utilitaires frontend
|-- services/
|   |-- api-gateway/              # point d'entree HTTP unique
|   |-- auth-service/             # utilisateurs, roles, permissions, entreprises
|   |-- commercial-service/       # prospection, campagnes, sequences
|   |-- customer-service/         # CRM clients, contacts, contrats, opportunites
|   |-- billing-service/          # facturation, comptabilite, tresorerie, budgets
|   |-- project-service/          # projets, taches, jalons
|   |-- hr-service/               # RH, contrats, paie, exports sociaux/fiscaux
|   |-- technical-service/        # missions, interventions, rapports techniques
|   |-- procurement-service/      # demandes d'achat, proformas, bons de commande
|   |-- inventory-service/        # articles, mouvements de stock, receptions
|   |-- communication-service/    # messages, templates, campagnes
|   |-- analytics-service/        # dashboards, widgets, rapports, KPI
|   `-- notification-service/     # notifications et email logs
|-- docs/                         # documentation projet
|-- scripts/                      # bootstrap, validation, maintenance
`-- docker-compose.yml            # orchestration locale
```

## 3. Structure du code

### Frontend

- `frontend/app/` contient les pages Next.js organisees par domaine.
- `frontend/src/components/` contient la logique UI metier.
- `frontend/src/shared/` contient l'authentification, les permissions, le client API et les types partages.
- `frontend/app/(dashboard)/layout.tsx` gere l'auth, les permissions, la sidebar et la redirection par role.

Pages metier visibles dans le routage :

- `dashboard/commercial`
- `dashboard/crm`
- `dashboard/comptabilite`
- `dashboard/facturation`
- `dashboard/achats`
- `dashboard/rh`
- `dashboard/hr`
- `dashboard/projets`
- `dashboard/technical`
- `dashboard/notifications`
- `dashboard/admin`

### API Gateway

La gateway :

- ajoute securite, compression, tracing, metrics et rate limiting
- charge dynamiquement les fichiers de config de routes dans `services/api-gateway/routes/services/`
- propage des metadonnees utilisateur aux microservices via headers (`X-User-*`, `X-Service-*`, `X-Correlation-ID`)

### Microservices

Le pattern dominant est :

- `server.js` ou `index.js` pour le point d'entree
- `routes/` pour les endpoints
- `controllers/` pour la logique HTTP
- `prisma/schema.prisma` pour le modele de donnees
- `prisma/migrations/` pour les evolutions de schema
- `utils/` ou `services/` pour la logique metier

## 4. Services exposes

### API principales par domaine

- `auth-service`: `/api` avec routes utilisateurs, roles, permissions, services, entreprises
- `commercial-service`: `/api/prospects`
- `customer-service`: `/api/clients`, `/api/contacts`, `/api/contrats`, `/api/adresses`, `/api/interactions`, `/api/opportunites`
- `billing-service`: `/api/devis`, `/api/factures`, `/api/paiements`, `/api/accounting`, `/api/budgets`, `/api/investments`
- `project-service`: `/api/projets`, `/api/taches`, `/api/jalons`
- `hr-service`: `/api/employes`, `/api/contrats`, `/api/paie`, `/api/exports`, `/api/analytics`, `/api/recruitment`
- `technical-service`: `/api/missions`, `/api/interventions`, `/api/rapports`, `/api/techniciens`
- `procurement-service`: `/api/demandes-achat`, `/api/bons-commande`, `/api/fournisseurs`
- `inventory-service`: `/api/articles`, `/api/mouvements`, `/api/inventaires`, `/api/receptions`
- `communication-service`: `/api/messages`, `/api/templates`, `/api/campagnes`
- `analytics-service`: `/api/dashboards`, `/api/widgets`, `/api/rapports`, `/api/kpis`
- `notification-service`: `/api/notifications`

## 5. Architecture base de donnees

### Principe

Le projet n'utilise pas une seule base ERP centrale. Il utilise une base PostgreSQL par service metier.

Bases creees par Docker/bootstrap :

- `parabellum_auth`
- `parabellum_communication`
- `parabellum_technical`
- `parabellum_commercial`
- `parabellum_inventory`
- `parabellum_projects`
- `parabellum_procurement`
- `parabellum_customers`
- `parabellum_hr`
- `parabellum_billing`
- `parabellum_Analytics`
- `parabellum_notification`

Consequence importante pour les extractions :

- les jointures SQL inter-domaines ne se font pas dans une seule base metier
- les liens entre domaines passent souvent par des IDs metier stockes comme champs simples (`enterpriseId`, `serviceId`, `clientId`, `prospectId`, `crmClientId`)
- pour une extraction transverse, il faut soit :
  - interroger plusieurs bases
  - construire un entrepot ou une vue consolidee
  - ou s'appuyer sur les APIs metier

### Deploiement schema

Au demarrage, plusieurs services executent :

- `prisma migrate deploy`
- puis `prisma db push --accept-data-loss --skip-generate`

Cela signifie que le schema est pousse automatiquement a l'execution. C'est pratique en local, mais a surveiller en environnement sensible.

## 6. Poids relatif des schemas Prisma

Nombre de modeles detectes par service :

- `billing-service`: 56
- `hr-service`: 41
- `customer-service`: 30
- `commercial-service`: 17
- `procurement-service`: 11
- `auth-service`: 10
- `technical-service`: 10
- `inventory-service`: 8
- `analytics-service`: 5
- `project-service`: 4
- `communication-service`: 4
- `notification-service`: 2

Conclusion :

- la base la plus riche pour les extractions est `parabellum_billing`
- les autres zones tres structurantes sont `parabellum_hr`, `parabellum_customers` et `parabellum_commercial`

## 7. Structure BDD utile pour les extractions

### 7.1 Auth / structure organisationnelle

Base : `parabellum_auth`

Tables structurantes :

- `Role`
- `User`
- `Service`
- `Permission`
- `RolePermission`
- `UserPermission`
- `Enterprise`
- `AuditLog`

Usage extraction :

- dimension utilisateur
- dimension role
- dimension service
- dimension entreprise
- audit et tracabilite

Chemins utiles :

- `Enterprise -> Service -> User`
- `Role -> User`
- `Permission -> RolePermission -> Role`
- `Permission -> UserPermission -> User`

### 7.2 Commercial / prospection

Base : `parabellum_commercial`

Tables principales :

- `Prospect`
- `ProspectActivity`
- `DocumentProspect`
- `NoteProspect`
- `CompetitorProspect`
- `ProspectionCampaign`
- `CampaignProspect`
- `ProspectionSequence`
- `SequenceStep`
- `SequenceAssignment`
- `SequenceActivity`
- `SalesTarget`
- `AdvancedReport`
- `SyncCRM`

Usage extraction :

- pipeline de prospection
- suivi des relances
- campagnes
- conversions prospect -> client

Chemins utiles :

- `Prospect -> ProspectActivity`
- `Prospect -> CampaignProspect -> ProspectionCampaign`
- `Prospect -> SequenceAssignment -> SequenceActivity`
- `Prospect -> SyncCRM`

### 7.3 CRM / clients

Base : `parabellum_customers`

Tables principales :

- `TypeClient`
- `SecteurActivite`
- `Client`
- `Contact`
- `AdresseClient`
- `Contrat`
- `Opportunite`
- `LigneProduit`
- `Facture`
- `LigneFacture`
- `InteractionClient`
- `DocumentClient`
- `TicketCRM`
- `SondageSatisfaction`
- `RelanceAutomatique`

Usage extraction :

- portefeuille clients
- segmentation
- opportunites
- contrats
- facturation CRM
- satisfaction et support

Chemins utiles :

- `TypeClient -> Client`
- `SecteurActivite -> Client`
- `Client -> Contact`
- `Client -> Contrat`
- `Client -> Opportunite -> LigneProduit`
- `Client -> Facture -> LigneFacture`
- `Client -> TicketCRM`
- `Client -> ReponseSondage`

Attention :

- le CRM contient deja des tables de facturation (`Facture`, `LigneFacture`) qui ne sont pas la meme chose que le moteur de facturation/comptabilite du `billing-service`

### 7.4 RH / paie

Base : `parabellum_hr`

Tables principales :

- `Employe`
- `Contrat`
- `VariablesMensuelle`
- `BulletinPaie`
- `CumulAnnuel`
- `GestionConge`
- `Absence`
- `PretAvance`
- `DeclarationCnps`
- `DeclarationFiscale`
- `Disa`
- `EcritureComptable`
- `Evaluation`
- `OffreEmploi`
- `Candidature`
- `Formation`

Usage extraction :

- masse salariale
- paie mensuelle
- compliance sociale/fiscale
- conges et absences
- recrutement

Chemins utiles :

- `Employe -> Contrat`
- `Employe -> VariablesMensuelle -> BulletinPaie`
- `Employe -> CumulAnnuel`
- `Employe -> GestionConge`
- `Employe -> Absence`
- `Employe -> Evaluation`

Point d'extraction deja implemente :

- `GET /api/exports/disa`
- `GET /api/exports/its`
- `GET /api/exports/payslip/:bulletinId`

### 7.5 Achats

Base : `parabellum_procurement`

Tables principales :

- `Fournisseur`
- `DemandeAchat`
- `LigneDemandeAchat`
- `Proforma`
- `LigneProforma`
- `BonCommande`
- `LigneCommande`
- `BonCommandeValidationLog`
- `DemandeAchatApprovalLog`
- `ProcurementOutboxEvent`

Usage extraction :

- suivi de la demande d'achat au bon de commande
- analyse fournisseurs
- audit des validations

Chemins utiles :

- `Fournisseur -> DemandeAchat`
- `DemandeAchat -> LigneDemandeAchat`
- `DemandeAchat -> Proforma -> LigneProforma`
- `DemandeAchat -> BonCommande -> LigneCommande`
- `BonCommande -> BonCommandeValidationLog`

### 7.6 Stock / inventaire

Base : `parabellum_inventory`

Tables principales :

- `Article`
- `MouvementStock`
- `Inventaire`
- `LigneInventaire`
- `Equipement`
- `MaintenanceEquipement`
- `Reception`
- `LigneReception`

Usage extraction :

- stock theorique et mouvements
- receptions fournisseurs
- inventaires et ecarts
- parc equipement et maintenance

Chemins utiles :

- `Article -> MouvementStock`
- `Inventaire -> LigneInventaire -> Article`
- `Reception -> LigneReception -> Article`
- `Equipement -> MaintenanceEquipement`

### 7.7 Projets

Base : `parabellum_projects`

Tables principales :

- `Projet`
- `Tache`
- `TacheAssignation`
- `Jalon`

Usage extraction :

- avancement projets
- charge taches
- jalons et retards

Chemins utiles :

- `Projet -> Tache -> TacheAssignation`
- `Projet -> Jalon`

### 7.8 Technique

Base : `parabellum_technical`

Tables principales :

- `Specialite`
- `Technicien`
- `Mission`
- `MissionTechnicien`
- `Intervention`
- `InterventionTechnicien`
- `Materiel`
- `SortieMateriel`
- `Rapport`
- `OrdreMission`

Usage extraction :

- activite terrain
- productivite techniciens
- rapports d'intervention
- affectation materiel

Chemins utiles :

- `Specialite -> Technicien`
- `Mission -> MissionTechnicien -> Technicien`
- `Mission -> Intervention -> Rapport`
- `Intervention -> SortieMateriel -> Materiel`
- `Technicien -> Rapport`

### 7.9 Facturation / comptabilite / finance

Base : `parabellum_billing`

Sous-domaines principaux :

- ventes : `Devis`, `Facture`, `Paiement`, `Avoir`
- engagements : `PurchaseCommitment`, `FactureFournisseur`, `Encaissement`, `Decaissement`
- tresorerie : `TreasuryAccount`, `TreasuryClosure`, `CashVoucher`
- comptabilite generale : `FiscalYear`, `AccountingPeriod`, `AccountingJournal`, `AccountingAccount`, `AccountingJournalEntry`, `AccountingJournalLine`
- gouvernance comptable : `AccountingClosing`, `AccountingReportSnapshot`, `AccountingDiagnosticRun`, `AccountingDiagnosticIssue`
- budget / analytique : `Budget`, `BudgetVersion`, `AnalyticCenter`, `BudgetAllocation`, `CostCenter`, `AnalyticAxis`, `AnalyticValue`, `AnalyticAllocation`
- placements / investissements : `InvestmentPortfolio`, `InvestmentAsset`, `InvestmentHolding`, `InvestmentTransaction`, `InvestmentValuation`, etc.

Usage extraction :

- grand livre
- balance generale
- bilan / compte de resultat
- journal comptable
- tresorerie
- budget
- placements

Chemins utiles :

- `FiscalYear -> AccountingPeriod`
- `AccountingJournalEntry -> AccountingJournalLine -> AccountingAccount`
- `AccountingJournalEntry -> AccountingPeriod`
- `AccountingJournalEntry -> FiscalYear`
- `Budget -> BudgetVersion -> BudgetAllocation`
- `InvestmentPortfolio -> InvestmentHolding -> InvestmentTransaction -> InvestmentValuation`

Point cle pour le reporting :

- la structure la plus importante est `AccountingJournalEntry` / `AccountingJournalLine`
- c'est elle qui alimente les extractions de type balance, grand livre et etats financiers

### 7.10 Analytics

Base : `parabellum_Analytics`

Cette base stocke surtout :

- la configuration des dashboards (`Dashboard`)
- les widgets (`Widget`)
- les definitions de rapports (`Rapport`)
- l'historique d'execution (`RapportExecution`)
- des KPI calcules (`KPI`)

Important :

- cette base n'est pas un data warehouse transverse
- elle stocke surtout du meta-reporting
- l'implementation de generation de rapport est encore partiellement simulee

### 7.11 Communication et notifications

Bases :

- `parabellum_communication`
- `parabellum_notification`

Tables principales :

- communication : `Message`, `Template`, `Notification`, `CampagneMail`
- notification : `Notification`, `EmailLog`

Usage extraction :

- volume de campagnes
- historiques d'envoi
- traces de notification

## 8. Extractions de donnees deja visibles dans le code

### RH

Le service RH expose deja des extractions metier :

- DISA via aggregation de `BulletinPaie`
- ITS via aggregation de `BulletinPaie`
- generation PDF de bulletin

### Comptabilite

Le backend expose :

- `GET /api/accounting/overview`
- `GET /api/accounting/balance`
- `GET /api/accounting/general-ledger`
- `GET /api/accounting/trial-balance`
- `GET /api/accounting/ledger`
- `POST /api/accounting/regulatory-reports/syscoa`

Le frontend construit deja des exports :

- CSV de tresorerie
- CSV d'ecritures comptables
- CSV du plan comptable
- CSV de balance
- impression HTML de rapport comptable

### Analytics

Le service analytics possede :

- des endpoints CRUD pour rapports et dashboards
- un utilitaire ExcelJS capable de produire des workbooks

Mais :

- l'execution reelle de rapport est encore simulee
- le telechargement renvoie surtout un nom de fichier et une URL logique

## 9. Lecture extraction par domaine

### Si tu veux extraire la paie

Source principale :

- `parabellum_hr`

Chemin de jointure :

- `Employe -> VariablesMensuelle -> BulletinPaie`

Filtres utiles :

- `periode`
- `matricule`
- `statutPaiement`

### Si tu veux extraire le pipeline commercial

Sources principales :

- `parabellum_commercial`
- `parabellum_customers`

Chemins utiles :

- prospection : `Prospect -> ProspectActivity`
- conversion : `Prospect.customerId` ou `Client.prospectId`
- opportunites : `Client -> Opportunite`

### Si tu veux extraire la comptabilite

Source principale :

- `parabellum_billing`

Chemin de jointure :

- `AccountingJournalEntry -> AccountingJournalLine -> AccountingAccount`

Filtres utiles :

- `periodId`
- `fiscalYearId`
- `enterpriseId`
- `entryDate`
- `status = POSTED`

### Si tu veux extraire achats + stock

Sources principales :

- `parabellum_procurement`
- `parabellum_inventory`

Chemins utiles :

- achats : `DemandeAchat -> Proforma -> BonCommande`
- reception : `BonCommande.id -> Reception.bonCommandeId`
- stock : `Article -> MouvementStock`

## 10. Points d'attention techniques

### Ce qui est bien structure

- separation claire par domaines
- un schema Prisma par service
- bonnes relations internes a chaque domaine
- dimensions `enterpriseId` et `serviceId` presentes dans plusieurs services
- routes de reporting comptable deja riches

### Ce qui complique les extractions transverses

- pas de base analytique consolidee unique
- presence de duplications metier entre services (exemple facture CRM vs facture comptable)
- liens inter-services souvent portes par des IDs simples et non par des foreign keys SQL inter-bases

### Ce qui semble incomplet

- `analytics-service` ne genere pas encore de vrais fichiers de rapport bout en bout
- la route de download analytics ne sert pas le fichier physique

## 11. Recommandation pratique pour les extractions

Pour extraire proprement la donnee, je te conseille 3 niveaux :

1. Extractions par domaine :
   utiliser directement la base du service cible (`hr`, `billing`, `customers`, etc.)

2. Extractions transverses :
   creer un schema de consolidation ou un petit ETL interne qui rapproche :
   - `Enterprise`
   - `Service`
   - `User`
   - `Client`
   - `Prospect`
   - `Projet`
   - `AccountingJournalEntry`
   - `BulletinPaie`

3. Reporting utilisateur :
   reutiliser les endpoints comptables existants et completer `analytics-service`

## 12. Resume executif

Le projet est solide sur le plan modulaire. La vraie structure de donnee est distribuee par service, pas centralisee dans une seule base. Pour les extractions de donnees, les noyaux les plus importants sont :

- `parabellum_billing` pour la comptabilite et la finance
- `parabellum_hr` pour la paie et les obligations sociales
- `parabellum_customers` pour le CRM
- `parabellum_commercial` pour la prospection
- `parabellum_procurement` + `parabellum_inventory` pour achats et stock

Si tu veux, la suite logique est que je te prepare soit :

- une cartographie SQL d'extraction par base
- un schema Mermaid du projet
- ou une liste de requetes SQL pretes a l'emploi pour RH, CRM, achats et comptabilite
