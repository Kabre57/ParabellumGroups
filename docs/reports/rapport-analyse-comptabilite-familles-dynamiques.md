# Rapport d'analyse critique - Comptabilite et familles comptables dynamiques

Date d'analyse : 29 avril 2026

Projet : ParabellumGroups ERP

Perimetre analyse :

- module comptabilite du billing-service ;
- plan comptable ;
- familles comptables dynamiques ;
- generation des ecritures ;
- encaissements, decaissements, paiements, tresorerie ;
- ecrans frontend lies a la configuration comptable.

## 1. Synthese executive

Le module comptable possede deja une base solide. Le projet a commence a remplacer les anciens codes comptables figes par un systeme de familles comptables dynamiques. Cette approche est pertinente : au lieu d'ecrire directement dans le code des comptes comme `401`, `411`, `607`, `706`, `512` ou `531`, l'application peut maintenant resoudre le compte reel a utiliser a partir d'une famille fonctionnelle.

Exemple :

- famille `CUSTOMER_RECEIVABLE` pour les creances clients ;
- famille `SUPPLIER_PAYABLE` pour les dettes fournisseurs ;
- famille `PURCHASE_EXPENSE` pour les charges d'achat ;
- famille `REVENUE` pour les produits ;
- famille `TREASURY_BANK` pour les comptes banque ;
- famille `TREASURY_CASH` pour les comptes caisse.

Le systeme est donc dans la bonne direction. Le probleme principal n'est plus la presence de comptes hardcodes partout : les familles dynamiques representent deja une vraie avancee, et le rattachement de plusieurs comptes a une meme famille est deja en place. Le sujet prioritaire est maintenant la securisation backend, la liaison entre tresorerie operationnelle et vrais comptes comptables, et la coherence des rapports.

Le frontend filtre correctement les comptes proposes a l'utilisateur, mais le backend ne verifie pas toujours que le compte envoye correspond au type comptable attendu. Certains flux manuels peuvent contourner les familles dynamiques. La tresorerie operationnelle choisie dans les formulaires n'est pas encore reliee au compte comptable exact utilise dans les ecritures. Un bug concret a aussi ete identifie dans la generation de la balance comptable.

Conclusion generale :

Le module est exploitable pour une premiere version interne, mais il doit etre renforce avant une utilisation comptable stricte, surtout si les rapports doivent servir a la paie, a la direction, a l'audit ou a une cloture mensuelle.

## 2. Architecture constatee

### 2.1 Plan comptable

Le modele `AccountingAccount` contient les comptes comptables :

- code ;
- libelle ;
- type ;
- solde d'ouverture ;
- solde courant ;
- indicateur dynamique ;
- formule eventuelle ;
- relations avec les lignes d'ecritures, mappings et familles.

Reference :

- `services/billing-service/prisma/schema.prisma:435`

Les types de comptes sont limites aux valeurs suivantes :

- `ASSET` ;
- `LIABILITY` ;
- `EQUITY` ;
- `REVENUE` ;
- `EXPENSE`.

Reference :

- `services/billing-service/prisma/schema.prisma:583`

### 2.2 Familles comptables dynamiques

Le modele `AccountingFamilyRule` relie une famille comptable a un ou plusieurs comptes reels du plan comptable.

Reference :

- `services/billing-service/prisma/schema.prisma:461`

Chaque regle contient :

- la famille ;
- le compte cible ;
- un libelle ;
- une description ;
- un marqueur `isPrimary`.

La contrainte principale actuelle est :

- un meme compte ne peut pas etre rattache deux fois a la meme famille.

Reference :

- `services/billing-service/prisma/schema.prisma:475`

Les familles disponibles sont actuellement fixes dans un enum Prisma :

- `CUSTOMER_RECEIVABLE` ;
- `SUPPLIER_PAYABLE` ;
- `PURCHASE_EXPENSE` ;
- `MISC_EXPENSE` ;
- `REVENUE` ;
- `TREASURY_BANK` ;
- `TREASURY_CASH`.

Reference :

- `services/billing-service/prisma/schema.prisma:596`

Point important :

Les familles sont "dynamiques" pour le choix du compte rattache, mais pas pour la creation de nouvelles familles par l'utilisateur. Ajouter une nouvelle famille necessite aujourd'hui une modification du schema Prisma, une migration, une mise a jour backend et une mise a jour frontend.

### 2.3 Resolveur comptable

Le fichier central est :

- `services/billing-service/utils/accountingAccountResolver.js`

Il contient :

- la definition metier de chaque famille ;
- le type attendu pour chaque famille ;
- le chargement des regles depuis la base ;
- un cache de 60 secondes ;
- la resolution du compte principal ;
- la resolution banque/caisse selon le mode de paiement.

Reference :

- `services/billing-service/utils/accountingAccountResolver.js:3`
- `services/billing-service/utils/accountingAccountResolver.js:151`
- `services/billing-service/utils/accountingAccountResolver.js:200`

Le service est precharge au demarrage du billing-service.

Reference :

- `services/billing-service/server.js:105`

### 2.4 Ecran frontend

L'ecran de configuration est integre dans :

- `frontend/app/(dashboard)/dashboard/comptabilite/comptes/page.tsx`

Il expose deux vues :

- plan comptable ;
- familles dynamiques.

Reference :

- `frontend/app/(dashboard)/dashboard/comptabilite/comptes/page.tsx:180`
- `frontend/app/(dashboard)/dashboard/comptabilite/comptes/page.tsx:241`

Le composant de selection des comptes d'une famille est :

- `frontend/src/components/comptabilite/comptes/AccountingFamilyAccountPicker.tsx`

Reference :

- `frontend/src/components/comptabilite/comptes/AccountingFamilyAccountPicker.tsx:69`

## 3. Points positifs constates

### 3.1 Bonne orientation fonctionnelle

La logique de famille comptable est une bonne approche. Elle permet de ne pas bloquer le logiciel sur un plan comptable unique. Si l'entreprise veut utiliser un compte `411100` au lieu de `411`, ou `706100` au lieu de `706`, le principe des familles permet de le faire sans changer le code metier.

### 3.2 Separation entre usage metier et compte reel

Le code distingue deja :

- le besoin metier : "compte client", "compte fournisseur", "compte de produit" ;
- le compte comptable reel : `411`, `401`, `706`, etc.

Cette separation est saine et necessaire pour un ERP multi-entreprise.

### 3.3 Frontend plutot clair

L'ecran "Familles dynamiques" montre :

- les familles disponibles ;
- le compte principal ;
- les comptes rattaches ;
- les actions "Definir principal" et "Retirer".

Reference :

- `frontend/app/(dashboard)/dashboard/comptabilite/comptes/page.tsx:251`

### 3.4 Filtrage frontend par type de compte

Le frontend filtre les comptes selon la famille :

- client : actif ;
- fournisseur : passif ;
- achat/divers : charge ;
- produit : revenue ;
- banque/caisse : actif.

Reference :

- `frontend/app/(dashboard)/dashboard/comptabilite/comptes/page.tsx:134`

### 3.5 Les workflows achats utilisent deja les familles

Les engagements et paiements fournisseurs utilisent le resolveur de familles :

- `SUPPLIER_PAYABLE` ;
- `PURCHASE_EXPENSE` ;
- famille de tresorerie selon le mode de paiement.

Reference :

- `services/billing-service/utils/accountingWorkflow.js:12`
- `services/billing-service/utils/accountingWorkflow.js:129`

## 4. Problemes critiques

### 4.1 Validation backend insuffisante sur les familles

Probleme :

Lorsqu'un compte est rattache a une famille, le backend verifie que :

- la famille existe ;
- le compte existe ;
- le compte est actif.

Mais il ne verifie pas que le type du compte correspond au type attendu.

Reference :

- `services/billing-service/controllers/accountingFamilyRule.controller.js:43`
- `services/billing-service/controllers/accountingFamilyRule.controller.js:55`

Exemple de risque :

- rattacher un compte de charge a la famille client ;
- rattacher un compte de produit a la famille fournisseur ;
- rattacher un compte de passif a la famille caisse.

Impact :

- ecritures comptables incoherentes ;
- balance faussee ;
- rapports financiers non fiables ;
- erreurs difficiles a detecter car l'UI peut sembler correcte mais l'API accepte l'erreur.

Priorite :

Critique.

Correction recommandee :

Ajouter une validation stricte :

```text
account.type doit etre egal a FAMILY_DEFINITIONS[family].type
```

Cette validation doit etre appliquee dans :

- `validateFamilyAndAccount` ;
- `resolveAccountingAccount` lorsqu'un `preferredAccountId` est fourni.

### 4.2 Les encaissements manuels contournent les familles dynamiques

Probleme :

Lors d'un encaissement manuel, l'utilisateur selectionne un `accountingAccountId`. Le frontend filtre les comptes de type produit, mais le backend accepte directement le compte.

Reference frontend :

- `frontend/src/components/accounting/CreateEncaissementDialog.tsx:136`

Reference backend :

- `services/billing-service/controllers/encaissement.controller.js:52`
- `services/billing-service/controllers/encaissement.controller.js:163`

Impact :

Un appel API peut forcer un mauvais compte. Par exemple, un encaissement pourrait crediter un compte de charge ou un compte de tresorerie au lieu d'un compte de produit.

Priorite :

Critique.

Correction recommandee :

Verifier cote backend que le compte manuel d'encaissement est :

- actif ;
- de type `REVENUE` ;
- ou rattache a la famille `REVENUE` selon la strategie retenue.

### 4.3 Les decaissements manuels contournent aussi les familles dynamiques

Probleme :

Lors d'un decaissement manuel, l'utilisateur selectionne un `accountingAccountId`. Le frontend filtre les comptes de charge, mais le backend utilise directement le compte.

Reference frontend :

- `frontend/src/components/accounting/CreateDecaissementDialog.tsx:138`

Reference backend :

- `services/billing-service/controllers/decaissement.controller.js:205`

Impact :

Un decaissement pourrait debiter un compte client, un compte banque ou un compte produit. Cela casserait la logique comptable.

Priorite :

Critique.

Correction recommandee :

Verifier cote backend que le compte manuel de decaissement est :

- actif ;
- de type `EXPENSE` ;
- ou rattache a une famille de charges autorisee : `PURCHASE_EXPENSE` ou `MISC_EXPENSE`.

### 4.4 Le compte de tresorerie selectionne n'est pas relie au compte comptable exact

Probleme :

Les formulaires demandent un compte de tresorerie operationnel (`TreasuryAccount`). Mais le modele `TreasuryAccount` ne contient pas de lien vers `AccountingAccount`.

Reference :

- `services/billing-service/prisma/schema.prisma:360`

Le resolveur comptable choisit ensuite la famille de tresorerie seulement a partir du mode de paiement :

- especes -> `TREASURY_CASH` ;
- autres modes -> `TREASURY_BANK`.

Reference :

- `services/billing-service/utils/accountingAccountResolver.js:127`

Impact :

Si l'entreprise possede plusieurs banques, par exemple :

- Banque principale ;
- Banque secondaire ;
- Compte mobile money ;
- Caisse siege ;
- Caisse agence ;

l'ecriture comptable peut utiliser le compte principal de la famille banque/caisse au lieu du compte reel selectionne dans le formulaire.

Exemple :

L'utilisateur selectionne "Banque BOA", mais l'ecriture comptable utilise le compte principal `512 - Banque principale`.

Priorite :

Critique pour une entreprise avec plusieurs comptes de tresorerie.

Correction recommandee :

Ajouter un lien :

```text
TreasuryAccount.accountingAccountId -> AccountingAccount.id
```

Puis passer ce compte en `preferredAccountId` lors de la resolution comptable.

### 4.5 Bug dans la balance comptable

Probleme :

Dans `accountingBalance.service.js`, la boucle utilise la variable `decaissement`, mais le code appelle `d.paymentMethod`.

Reference :

- `services/billing-service/services/accountingBalance.service.js:376`
- `services/billing-service/services/accountingBalance.service.js:380`

Impact :

Risque d'erreur runtime lors de la generation de la balance lorsque des decaissements doivent etre traites.

Priorite :

Critique.

Correction recommandee :

Remplacer :

```js
String(d.paymentMethod || '')
```

par :

```js
String(decaissement.paymentMethod || '')
```

### 4.6 Configuration initiale des familles a controler sans automatisme

Probleme :

Le choix retenu est de ne pas imposer automatiquement les rattachements comptables. C'est coherent avec une logique ERP : l'administrateur doit pouvoir choisir lui-meme les comptes exacts a utiliser pour chaque famille.

Le risque n'est donc pas l'absence d'automatisation. Le vrai risque est l'absence d'un controle clair indiquant que les familles indispensables ne sont pas encore configurees.

Impact :

Si les familles sont laissees vides apres installation ou apres modification du plan comptable, les workflows qui appellent `resolveAccountingAccount` en mode strict peuvent echouer.

Exemples :

- impossible d'enregistrer un engagement si `SUPPLIER_PAYABLE` n'est pas configure ;
- impossible de valider un paiement si `TREASURY_BANK` ou `TREASURY_CASH` n'est pas configure ;
- rapports incomplets si `REVENUE` ou `CUSTOMER_RECEIVABLE` n'est pas configure.

Priorite :

Elevee.

Correction recommandee :

Ne pas ajouter de rattachement automatique.

Mettre plutot en place :

- un ecran de controle indiquant les familles obligatoires non configurees ;
- un badge "Configuration incomplete" sur la page comptabilite ;
- des messages d'erreur explicites lors d'un encaissement, decaissement ou engagement ;
- une documentation indiquant que les comptes doivent etre rattaches manuellement dans `Plan comptable > Familles dynamiques` ;
- eventuellement un endpoint de diagnostic qui retourne l'etat de chaque famille.

## 5. Problemes potentiels importants

### 5.1 Les familles ne sont pas vraiment creables dynamiquement

Probleme :

Les familles sont definies par un enum Prisma. Cela veut dire qu'un utilisateur ne peut pas creer lui-meme une nouvelle famille depuis l'application.

Reference :

- `services/billing-service/prisma/schema.prisma:596`

Impact :

Si l'entreprise veut separer :

- ventes marchandises ;
- ventes prestations ;
- produits financiers ;
- achats marchandises ;
- achats prestations ;
- taxes ;
- salaires ;
- charges sociales ;

il faudra modifier le code et la base.

Priorite :

Moyenne a elevee selon l'ambition du module comptable.

Correction possible :

Remplacer l'enum par une table `AccountingFamilyConfig`, ou garder l'enum pour les familles systemes et ajouter des familles personnalisables.

### 5.2 Plusieurs comptes principaux possibles en base

Probleme :

L'application essaie de maintenir un seul compte principal par famille, mais la base ne l'impose pas totalement.

Reference :

- `services/billing-service/prisma/schema.prisma:475`
- `services/billing-service/prisma/schema.prisma:477`

Impact :

En cas de concurrence, modification manuelle ou bug, deux comptes peuvent devenir `isPrimary = true` pour une meme famille.

Priorite :

Moyenne.

Correction recommandee :

Ajouter un index unique partiel PostgreSQL :

```sql
CREATE UNIQUE INDEX accounting_family_rules_one_primary_per_family
ON accounting_family_rules("family")
WHERE "isPrimary" = true;
```

### 5.3 Transaction incomplete lors de l'ajout d'une regle primaire

Probleme :

La creation de la nouvelle regle est dans une transaction, mais la desactivation des autres comptes principaux est faite apres.

Reference :

- `services/billing-service/controllers/accountingFamilyRule.controller.js:134`
- `services/billing-service/controllers/accountingFamilyRule.controller.js:149`

Impact :

Petite fenetre de concurrence possible ou deux comptes peuvent etre principaux.

Priorite :

Moyenne.

Correction recommandee :

Mettre la creation et l'update des autres regles dans la meme transaction.

### 5.4 Les comptes dynamiques et les familles dynamiques sont deux notions differentes

Probleme :

Le code contient aussi des comptes dynamiques bases sur des formules pour certains codes.

Reference :

- `services/billing-service/utils/accounting.js:139`

Exemples :

- `401` ;
- `411` ;
- `4456` ;
- `4457` ;
- `512` ;
- `531` ;
- `607` ;
- `706`.

Impact :

Risque de confusion fonctionnelle :

- "compte dynamique" = compte avec formule ;
- "famille dynamique" = categorie metier qui pointe vers un compte.

Ce n'est pas la meme chose. Le vocabulaire dans l'interface et la documentation doit etre clair.

Priorite :

Moyenne.

Correction recommandee :

Clarifier les libelles :

- "Familles d'imputation comptable" ;
- "Comptes a solde calcule automatiquement".

### 5.5 TVA pas totalement structuree dans les ecritures operationnelles

Probleme :

Le workflow d'engagement achat debite la charge et credite le fournisseur sur `amountTTC`.

Reference :

- `services/billing-service/utils/accountingWorkflow.js:31`
- `services/billing-service/utils/accountingWorkflow.js:39`

Impact :

La TVA deductible peut ne pas etre isolee sur un compte `4456` dans cette ecriture. Meme sujet cote produits si les ventes doivent distinguer produit HT et TVA collectee.

Priorite :

Moyenne a elevee selon les exigences comptables.

Correction recommandee :

Definir une strategie :

- comptabilite simplifiee TTC ;
- ou comptabilite detaillee HT + TVA.

Si comptabilite detaillee :

- achats : debit charge HT, debit TVA deductible, credit fournisseur TTC ;
- ventes : debit client TTC, credit produit HT, credit TVA collectee.

### 5.6 Les bons de caisse ne generent pas directement d'ecriture comptable

Probleme :

Le controleur des bons de caisse cree et met a jour les bons, mais ne cree pas directement d'ecriture dans `AccountingJournalEntry`.

Reference :

- `services/billing-service/controllers/cashVoucher.controller.js:203`
- `services/billing-service/controllers/cashVoucher.controller.js:324`

Impact :

Selon le parcours utilisateur, un bon de caisse peut exister sans ecriture comptable persistante. Les rapports peuvent compenser via des calculs ou donnees derivees, mais cela cree une difference entre :

- pieces operationnelles ;
- ecritures comptables reelles ;
- rapports reconstruits.

Priorite :

Moyenne.

Correction recommandee :

Decider si un bon de caisse valide ou decaisse doit automatiquement creer une ecriture comptable.

### 5.7 Melange entre ecritures persistantes et ecritures generees pour les rapports

Probleme :

La balance et l'overview reconstruisent certaines ecritures a partir de factures, encaissements et decaissements, tout en integrant aussi les ecritures manuelles/persistantes.

Reference :

- `services/billing-service/services/accountingBalance.service.js:313`
- `services/billing-service/controllers/accountingOverview.controller.js:520`

Impact :

Risque de :

- doublon ;
- omission ;
- ecart entre journal officiel et rapport ;
- difficulte d'audit.

Priorite :

Elevee pour la fiabilite comptable.

Correction recommandee :

Choisir une strategie cible :

1. Toutes les operations valides generent des ecritures persistantes.
2. Les rapports lisent principalement `AccountingJournalEntry`.
3. Les ecritures generees servent seulement de migration ou de fallback controle.

### 5.8 Permissions trop larges pour modifier les regles comptables

Probleme :

La modification des familles comptables utilise `ensureAccountingWriteAccess`, qui accepte des permissions depenses/paiements.

Reference :

- `services/billing-service/utils/accounting.js:44`

Impact :

Un utilisateur autorise a creer des depenses pourrait potentiellement modifier la configuration comptable si les routes lui sont accessibles.

Priorite :

Elevee.

Correction recommandee :

Creer des permissions dediees :

- `accounting.rules.read` ;
- `accounting.rules.update` ;
- `accounting.accounts.manage` ;
- `accounting.entries.validate`.

### 5.9 Migration initiale non idempotente

Probleme :

La premiere migration des familles utilise `CREATE TYPE` et `CREATE TABLE` sans `IF NOT EXISTS`.

Reference :

- `services/billing-service/prisma/migrations/20260429093000_add_accounting_family_rules/migration.sql:1`
- `services/billing-service/prisma/migrations/20260429093000_add_accounting_family_rules/migration.sql:11`

Impact :

En cas de base partiellement migree ou de reprise apres incident, la migration peut echouer.

Priorite :

Faible a moyenne, mais important pour le VPS et la CI.

Correction recommandee :

Sur une migration deja appliquee, ne pas la modifier sans strategie. Pour les prochaines migrations, renforcer l'idempotence quand on utilise du SQL manuel.

### 5.10 Absence de tests ciblant les familles dynamiques

Probleme :

La recherche dans le code ne montre pas de test specifique pour :

- `AccountingFamilyRule` ;
- `resolveAccountingAccount` ;
- validation encaissement ;
- validation decaissement ;
- generation de balance.

Impact :

Les regressions comptables peuvent passer inapercues.

Priorite :

Elevee.

Correction recommandee :

Ajouter au minimum des tests sur :

- rattachement compte/famille avec bon type ;
- rejet si mauvais type ;
- resolution du compte principal ;
- resolution banque/caisse ;
- encaissement manuel ;
- decaissement manuel ;
- balance avec decaissements.

## 6. Analyse par flux metier

### 6.1 Factures clients

Constat :

Les factures sont creees comme pieces de facturation. Les rapports reconstruisent une ecriture de vente avec :

- debit compte client ;
- credit compte produit.

Reference :

- `services/billing-service/services/accountingBalance.service.js:327`
- `services/billing-service/controllers/accountingOverview.controller.js:520`

Risque :

Si les ecritures de ventes ne sont pas persistantes au moment de l'emission, le journal officiel peut ne pas contenir l'ecriture de vente, alors que les rapports l'affichent.

Recommandation :

Creer une ecriture persistante lors de l'emission ou validation d'une facture.

### 6.2 Paiements clients

Constat :

Un paiement client cree un `Paiement`, puis cree aussi un `Encaissement`.

Reference :

- `services/billing-service/controllers/paiement.controller.js:88`
- `services/billing-service/controllers/paiement.controller.js:103`

Risque :

Le paiement n'est pas automatiquement comptabilise tant que l'encaissement n'est pas valide.

Recommandation :

Clarifier le statut :

- paiement enregistre ;
- encaissement en attente ;
- encaissement valide ;
- ecriture comptable creee.

### 6.3 Encaissements manuels

Constat :

Le frontend propose seulement des comptes de produit.

Reference :

- `frontend/src/components/accounting/CreateEncaissementDialog.tsx:136`

Mais le backend accepte directement le compte.

Reference :

- `services/billing-service/controllers/encaissement.controller.js:163`

Risque :

Contournement API possible.

Recommandation :

Valider `REVENUE` cote backend.

### 6.4 Engagements achats

Constat :

Le workflow achat utilise les familles :

- fournisseur ;
- charge achat.

Reference :

- `services/billing-service/utils/accountingWorkflow.js:12`

Risque :

La TVA n'est pas isolee dans cette ecriture.

Recommandation :

Definir si l'ERP doit comptabiliser en TTC simplifie ou en HT + TVA.

### 6.5 Decaissements

Constat :

Les decaissements lies a un engagement passent par le workflow comptable.

Reference :

- `services/billing-service/controllers/decaissement.controller.js:143`
- `services/billing-service/controllers/decaissement.controller.js:193`

Les decaissements manuels utilisent directement le compte choisi.

Reference :

- `services/billing-service/controllers/decaissement.controller.js:205`

Risque :

Contournement API possible.

Recommandation :

Valider `EXPENSE` cote backend.

### 6.6 Tresorerie

Constat :

La tresorerie operationnelle existe avec `TreasuryAccount`.

Reference :

- `services/billing-service/prisma/schema.prisma:360`

Mais elle n'est pas reliee au compte comptable.

Risque :

Mauvais compte banque/caisse dans l'ecriture comptable si plusieurs comptes existent.

Recommandation :

Ajouter une relation entre `TreasuryAccount` et `AccountingAccount`.

## 7. Plan d'action recommande

### Priorite 1 - Corrections critiques rapides

1. Corriger le bug `d.paymentMethod` dans `accountingBalance.service.js`.
2. Valider le type de compte dans `accountingFamilyRule.controller.js`.
3. Valider le type du compte dans les encaissements manuels.
4. Valider le type du compte dans les decaissements manuels.
5. Ajouter des permissions comptables dediees pour verrouiller la configuration.
6. Ajouter un controle de configuration des familles obligatoires.

### Priorite 2 - Securisation comptable

1. Ajouter un lien `TreasuryAccount.accountingAccountId`.
2. Utiliser le compte comptable lie au compte de tresorerie selectionne.
3. Ajouter un index unique partiel pour garantir un seul compte principal par famille.
4. Mettre l'ajout d'une regle primaire dans une transaction complete.
5. Clarifier les messages d'erreur pour toutes les familles non configurees.

### Priorite 3 - Fiabilite des rapports

1. Clarifier la difference entre ecritures persistantes et ecritures generees.
2. Faire des rapports a partir du journal comptable officiel.
3. Ajouter des tests sur balance, journal et familles.
4. Corriger la gestion TVA selon la politique comptable choisie.

### Priorite 4 - Evolution fonctionnelle

1. Permettre des familles personnalisables si besoin.
2. Ajouter des familles plus fines :
   - TVA deductible ;
   - TVA collectee ;
   - salaires ;
   - charges sociales ;
   - immobilisations ;
   - produits financiers ;
   - charges financieres.
3. Ajouter un tableau de bord de sante comptable :
   - familles non configurees ;
   - comptes inactifs rattaches ;
   - plusieurs comptes principaux ;
   - ecritures desequilibrees ;
   - operations sans ecriture.

## 8. Matrice des risques

| Point | Risque | Impact | Priorite |
| --- | --- | --- | --- |
| Mauvais type de compte dans une famille | Ecriture incoherente | Eleve | Critique |
| Encaissement manuel sans validation backend | Produit mal impute | Eleve | Critique |
| Decaissement manuel sans validation backend | Charge mal imputee | Eleve | Critique |
| Tresorerie non liee au compte comptable | Mauvaise banque/caisse | Eleve | Critique |
| Bug `d.paymentMethod` | Balance qui casse | Eleve | Critique |
| Familles obligatoires non configurees | Blocage des workflows comptables | Eleve | Elevee |
| Plusieurs comptes principaux | Resolution ambigue | Moyen | Moyenne |
| TVA non detaillee | Etats comptables incomplets | Moyen/Eleve | Moyenne |
| Permissions comptables trop larges | Mauvaise configuration par utilisateur non habilite | Eleve | Elevee |
| Peu de tests | Regression invisible | Eleve | Elevee |

## 9. Recommandation finale

Le module comptable doit etre considere comme une base fonctionnelle en progression, pas encore comme un noyau comptable definitivement securise.

La priorite absolue est de proteger les familles dynamiques cote backend. L'interface fait deja une partie du travail, mais une application comptable ne doit jamais faire confiance uniquement au frontend. Les controles doivent etre dans l'API.

Ensuite, il faut relier la tresorerie operationnelle aux comptes comptables reels. Sans ce lien, la selection d'une banque ou d'une caisse dans le formulaire ne garantit pas que l'ecriture comptable utilise le bon compte.

Enfin, il faut stabiliser les rapports : la balance, le journal et l'overview doivent s'appuyer sur une logique unique, testee, et coherente avec les ecritures persistantes.

Decision recommandee :

1. Corriger le bug de balance.
2. Ajouter les validations backend des familles, encaissements et decaissements.
3. Ajouter le lien entre tresorerie operationnelle et compte comptable.
4. Verrouiller les permissions comptables.
5. Ajouter le controle de configuration des familles.
6. Ajouter les tests.
7. Puis seulement enrichir les familles et la TVA.
