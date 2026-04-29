# Rapport des modifications apportees - Module comptabilite

Date : 29 avril 2026
Projet : ParabellumGroups ERP
Perimetre : Billing service, Auth service, Frontend comptabilite, documentation Docker/VPS

## 1. Objectif de l'intervention

L'objectif etait de corriger les risques identifies sur le module comptable, en particulier autour des familles comptables dynamiques, des comptes de tresorerie et des permissions systeme.

Les priorites traitees etaient :

- corriger le bug de balance lie a `d.paymentMethod` ;
- imposer le type de compte attendu cote backend pour les familles comptables ;
- imposer le type de compte attendu pour les encaissements et decaissements manuels ;
- relier les comptes de tresorerie aux vrais comptes comptables ;
- renforcer les permissions comptables dediees ;
- ajouter un diagnostic explicite des familles comptables obligatoires ;
- appliquer la migration Prisma et resynchroniser les permissions systeme ;
- documenter les commandes a executer sur le VPS.

## 2. Corrections backend - Billing service

### 2.1 Validation des familles comptables dynamiques

Le backend verifie maintenant que le compte rattache a une famille comptable correspond bien au type attendu.

Exemples :

- `CUSTOMER_RECEIVABLE` doit pointer vers un compte de type creance/client attendu ;
- `SUPPLIER_PAYABLE` doit pointer vers un compte de dette/fournisseur attendu ;
- `REVENUE` doit pointer vers un compte de produit ;
- `PURCHASE_EXPENSE` et `MISC_EXPENSE` doivent pointer vers des comptes de charge ;
- `TREASURY_BANK` et `TREASURY_CASH` doivent pointer vers des comptes d'actif.

Impact :

- l'interface ne reste plus la seule protection ;
- un mauvais appel API est refuse par le backend ;
- les familles comptables dynamiques deviennent plus fiables.

Fichiers concernes :

- `services/billing-service/controllers/accountingFamilyRule.controller.js`
- `services/billing-service/utils/accountingAccountResolver.js`

### 2.2 Diagnostic des familles comptables

Un endpoint de diagnostic a ete ajoute pour controler l'etat des familles comptables obligatoires.

Endpoint ajoute :

```text
GET /billing/accounting/family-rules/diagnostic
```

Le diagnostic retourne notamment :

- l'etat global `healthy` ;
- le nombre total de familles ;
- le nombre de familles configurees ;
- les familles manquantes ;
- les familles invalides ;
- les comptes principaux rattaches ;
- les problemes detectes par famille.

Important :

Ce changement ne cree pas de seed automatique pour les familles comptables. Il ajoute un controle de sante explicite, afin de laisser l'administrateur comptable configurer les familles selon le plan comptable reel de l'entreprise.

Fichiers concernes :

- `services/billing-service/controllers/accountingFamilyRule.controller.js`
- `services/billing-service/routes/accountingFamilyRule.routes.js`
- `frontend/src/shared/api/billing/index.ts`

### 2.3 Validation des encaissements manuels

Les encaissements manuels valident maintenant le compte comptable selectionne cote backend.

Regle ajoutee :

- un encaissement manuel doit utiliser un compte comptable actif de type `REVENUE`.

Impact :

- impossible de crediter un compte de charge, tresorerie ou dette par erreur via l'API ;
- les ecritures generees deviennent plus coherentes.

Fichier concerne :

- `services/billing-service/controllers/encaissement.controller.js`

### 2.4 Validation des decaissements manuels

Les decaissements manuels valident maintenant le compte comptable selectionne cote backend.

Regle ajoutee :

- un decaissement manuel doit utiliser un compte comptable actif de type `EXPENSE`.

Impact :

- impossible d'enregistrer une depense manuelle sur un compte produit, banque ou client ;
- les erreurs de saisie API sont bloquees plus tot.

Fichier concerne :

- `services/billing-service/controllers/decaissement.controller.js`

### 2.5 Liaison Tresorerie -> Compte comptable

Les comptes de tresorerie peuvent maintenant etre lies a un compte comptable reel.

Champ ajoute :

```text
TreasuryAccount.accountingAccountId
```

Relation ajoutee :

```text
TreasuryAccount -> AccountingAccount
```

Regle ajoutee :

- le compte comptable lie a un compte de tresorerie doit etre actif et de type `ASSET`.

Impact :

- une banque ou une caisse peut pointer vers son vrai compte comptable ;
- les flux de tresorerie ne dependent plus uniquement d'une famille generique ;
- le systeme devient compatible avec plusieurs banques et plusieurs caisses.

Fichiers concernes :

- `services/billing-service/prisma/schema.prisma`
- `services/billing-service/controllers/treasuryAccount.controller.js`
- `services/billing-service/utils/treasury.js`
- `services/billing-service/utils/accountingWorkflow.js`

### 2.6 Migration Prisma ajoutee

Une migration Prisma a ete ajoutee pour creer la colonne et la contrainte de liaison.

Migration :

```text
services/billing-service/prisma/migrations/20260429113000_link_treasury_accounts_to_accounting_accounts/migration.sql
```

Operations effectuees par la migration :

- ajout de la colonne `accountingAccountId` dans `treasury_accounts` ;
- creation de l'index sur `accountingAccountId` ;
- creation de la cle etrangere vers `accounting_accounts(id)` ;
- comportement `ON DELETE SET NULL` pour eviter de casser un compte de tresorerie si le compte comptable lie est supprime.

### 2.7 Balance et rapports comptables

Le bug identifie dans la balance a ete corrige.

Correction :

- remplacement de la reference incorrecte `d.paymentMethod` par `decaissement.paymentMethod`.

Amelioration ajoutee :

- les rapports reconstruits utilisent maintenant le compte comptable lie au compte de tresorerie quand il existe ;
- en absence de compte lie, le systeme conserve le comportement de secours via les mappings existants.

Impact :

- correction d'un risque d'erreur runtime dans la balance ;
- meilleure coherence des soldes lorsque plusieurs banques ou caisses existent.

Fichiers concernes :

- `services/billing-service/services/accountingBalance.service.js`
- `services/billing-service/controllers/accountingOverview.controller.js`

## 3. Renforcement des permissions comptables

### 3.1 Nouveaux droits systeme

Les permissions comptables dediees ont ete ajoutees dans le service d'authentification.

Permissions ajoutees :

```text
accounting.read
accounting.accounts.manage
accounting.rules.read
accounting.rules.update
accounting.entries.create
accounting.treasury.manage
accounting.diagnostics.read
```

Fichiers concernes :

- `services/auth-service/scripts/seed-permissions.js`
- `services/auth-service/prisma/seed-complete-permissions.js`
- `services/auth-service/src/utils/roleTemplates.js`

### 3.2 Permissions appliquees cote Billing service

Les controles backend ont ete rendus plus precis.

Avant :

- plusieurs actions comptables reutilisaient encore des permissions larges comme `expenses.*` ou `payments.*`.

Apres :

- gestion du plan comptable : `accounting.accounts.manage` ;
- gestion des regles/familles : `accounting.rules.update` ;
- creation d'ecritures : `accounting.entries.create` ;
- gestion des comptes de tresorerie : `accounting.treasury.manage` ;
- lecture et diagnostic : `accounting.read`, `accounting.rules.read`, `accounting.diagnostics.read`.

Fichiers concernes :

- `services/billing-service/utils/accounting.js`
- `services/billing-service/controllers/account.controller.js`
- `services/billing-service/controllers/accountingFamilyRule.controller.js`
- `services/billing-service/controllers/journalEntry.controller.js`
- `services/billing-service/controllers/treasuryAccount.controller.js`

## 4. Modifications frontend

### 4.1 Creation de compte de tresorerie

Le formulaire de creation de compte de tresorerie permet maintenant de selectionner un compte comptable lie.

Filtre applique cote interface :

- seuls les comptes comptables actifs de type `asset` sont proposes.

Fichier concerne :

- `frontend/src/components/accounting/CreateTreasuryAccountDialog.tsx`

### 4.2 Liste des comptes de tresorerie

La liste des comptes de tresorerie affiche maintenant le compte comptable lie, quand il existe.

Fichier concerne :

- `frontend/src/components/comptabilite/tresorerie/TresorerieAccountsList.tsx`

### 4.3 Types API frontend

Les types TypeScript de l'API billing ont ete mis a jour pour supporter :

- `TreasuryAccount.accountingAccountId` ;
- `TreasuryAccount.accountingAccount` ;
- le diagnostic des familles comptables ;
- les payloads de creation/mise a jour de tresorerie avec `accountingAccountId`.

Fichier concerne :

- `frontend/src/shared/api/billing/index.ts`

## 5. Documentation ajoutee

### 5.1 Commandes VPS

La documentation Docker contient maintenant les commandes a executer sur le VPS pour :

- recuperer les changements ;
- reconstruire les services concernes ;
- appliquer la migration Prisma ;
- resynchroniser les roles et permissions ;
- verifier la presence de la colonne `accountingAccountId` ;
- verifier la presence des permissions `accounting.*`.

Fichier concerne :

- `docs/TUTORIEL_DOCKER.md`

Section ajoutee :

```text
Mise a jour comptabilite: migration Prisma et permissions
```

Commandes principales documentees :

```bash
cd ~/apps/ParabellumGroups
git pull

docker compose build billing-service auth-service
docker compose up -d billing-service auth-service

docker compose exec -T billing-service npx prisma migrate deploy
docker compose exec -T auth-service npm run sync:roles

docker compose exec -T billing-service npx prisma migrate status
docker compose ps billing-service auth-service
```

## 6. Application locale effectuee

Les operations suivantes ont ete executees en local via Docker :

```bash
docker compose build billing-service auth-service
docker compose up -d billing-service auth-service
docker compose exec -T billing-service npx prisma migrate deploy
docker compose exec -T auth-service npm run sync:roles
docker compose exec -T billing-service npx prisma migrate status
docker compose ps billing-service auth-service
```

Resultat :

- les images `billing-service` et `auth-service` ont ete reconstruites ;
- les deux conteneurs ont ete relances ;
- la migration Prisma est appliquee ;
- le statut Prisma indique que le schema est a jour ;
- les roles et permissions systeme sont resynchronises ;
- les nouveaux droits `accounting.*` sont presents en base.

Note :

La commande `migrate deploy` a indique qu'il n'y avait plus de migration en attente, car l'entrypoint du conteneur avait deja applique la migration au demarrage.

## 7. Verifications realisees

### 7.1 Verification de la migration

La colonne suivante existe bien dans la base billing :

```text
treasury_accounts.accountingAccountId
```

Type verifie :

```text
text
```

### 7.2 Verification des permissions

Les permissions comptables suivantes sont presentes dans la base auth :

```text
accounting.accounts.manage
accounting.diagnostics.read
accounting.entries.create
accounting.read
accounting.rules.read
accounting.rules.update
accounting.treasury.manage
```

### 7.3 Verification des services

Les services suivants sont demarres :

- `billing-service`
- `auth-service`

## 8. Points importants

### 8.1 Pas de seed automatique des familles comptables

Aucun seed automatique n'a ete ajoute pour rattacher les familles comptables a des comptes par defaut.

Raison :

- la configuration des familles doit rester une decision comptable explicite ;
- un mauvais rattachement automatique pourrait produire de mauvaises ecritures ;
- le nouveau diagnostic permet de voir ce qui manque sans forcer une configuration.

### 8.2 Compatibilite avec l'existant

Quand aucun compte comptable n'est lie a un compte de tresorerie, le systeme conserve le comportement existant via les mappings et familles de secours.

Cela limite le risque de rupture immediate sur les donnees existantes.

### 8.3 Impact fonctionnel

Les administrateurs peuvent maintenant :

- configurer plus proprement les familles comptables ;
- detecter les familles manquantes ou invalides ;
- lier chaque banque ou caisse a son compte comptable ;
- mieux separer les droits comptables des droits depenses/paiements.

## 9. Risques restants et recommandations

### 9.1 Tester les workflows complets

Il faut encore tester sur une base representative :

- creation d'un compte de tresorerie avec compte comptable lie ;
- encaissement manuel ;
- decaissement manuel ;
- paiement fournisseur ;
- consultation balance ;
- consultation grand livre ou vue comptable ;
- diagnostic familles comptables.

### 9.2 Ajouter des tests automatises cibles

Tests recommandes :

- refuser une famille comptable avec un compte de mauvais type ;
- refuser un encaissement manuel avec un compte non `REVENUE` ;
- refuser un decaissement manuel avec un compte non `EXPENSE` ;
- utiliser le compte comptable lie a la banque dans la balance ;
- verifier le diagnostic quand une famille obligatoire manque.

### 9.3 Nettoyer les anciennes permissions a terme

Certaines compatibilites avec `expenses.*` ou `payments.*` existent encore pour eviter de bloquer brutalement les utilisateurs.

Recommandation :

- migrer progressivement vers les permissions `accounting.*` uniquement pour les actions purement comptables.

## 10. Conclusion

Les modifications apportees renforcent fortement la securite et la coherence du module comptable.

Le module ne depend plus uniquement de controles frontend ou de mappings generiques. Les regles importantes sont maintenant controlees cote backend, les comptes de tresorerie peuvent pointer vers de vrais comptes comptables, les permissions comptables sont plus propres, et un diagnostic permet d'identifier les configurations manquantes sans imposer de seed automatique.

