# Manuel d’utilisation — Comptabilité

## 1. Objet du module

Le module **Comptabilité** centralise le suivi des encaissements et décaissements, le traitement comptable des achats, la trésorerie, le plan comptable, les écritures et les rapports financiers. Il comprend également des vues de suivi budgétaire et de placements.

Les écrans se trouvent dans le menu **Comptabilité** du tableau de bord. Les URL directes sont indiquées ci-dessous. Les données monétaires de l’interface sont affichées en francs CFA (XOF).

| Écran | Accès direct | Usage |
|---|---|---|
| Tableau de bord comptable | `/dashboard/comptabilite` | Indicateurs et raccourcis de pilotage |
| Bons de caisse | `/dashboard/comptabilite/depenses` | Engagements achats, pièces, encaissements et décaissements |
| Trésorerie | `/dashboard/comptabilite/tresorerie` | Comptes de trésorerie, flux et clôtures |
| Plan comptable | `/dashboard/comptabilite/comptes` | Comptes généraux et familles d’imputation |
| Écritures | `/dashboard/comptabilite/ecritures` | Consulter, rechercher, exporter et saisir des écritures |
| Grand livre | `/dashboard/comptabilite/grand-livre` | Consulter les mouvements regroupés par compte |
| Balance | `/dashboard/comptabilite/balance` | Consulter débits, crédits et soldes par compte |
| Rapports comptables | `/dashboard/comptabilite/rapports` | Indicateurs financiers, bilan, résultat et états SYSCOA |
| Budget | `/dashboard/comptabilite/budget` | Suivre les budgets et dépenses par centre analytique |
| Placements | `/dashboard/comptabilite/placements` | Suivre les portefeuilles et placements financiers |

## 2. Accès et rôles

Les pages et actions sont contrôlées par les rôles et permissions. Un administrateur dispose d’un accès étendu. Selon la configuration des utilisateurs, les permissions pertinentes comprennent notamment :

- `accounting.read` : consultation des écrans comptables ;
- `accounting.accounts.manage` : création et gestion des comptes comptables ;
- `accounting.entries.create` : création d’écritures ;
- `accounting.rules.read` / `accounting.rules.update` : consultation et gestion des familles ;
- `accounting.treasury.manage` : gestion de certains éléments de trésorerie ;
- `expenses.read`, `expenses.create`, `expenses.approve`, `expenses.update`, `expenses.import` : consultation et traitement des bons de caisse ;
- `payments.read` / `payments.validate` : accès et validation de paiements ;
- `reports.read_financial` / `reports.export` : consultation et export des rapports.

Un écran vide ou un message d’accès refusé peut donc signaler une permission manquante, et pas nécessairement l’absence de données. Les utilisateurs non autorisés à choisir une entreprise sont limités à leur entreprise de rattachement.

## 3. Démarrage et paramétrage conseillé

Avant de saisir les opérations courantes, le responsable comptable devrait :

1. Vérifier que la bonne entreprise est sélectionnée et que son profil utilisateur possède les permissions nécessaires.
2. Ouvrir **Comptabilité → Comptes** et vérifier le plan comptable : codes, libellés, types (actif, passif, capital, produits ou charges), comptes actifs et soldes d’ouverture.
3. Dans l’onglet **Familles des comptes**, vérifier les familles d’imputation et les comptes réels associés. Une famille sert à retrouver plus facilement le compte approprié lors de la saisie. Le compte principal peut être défini comme compte par défaut.
4. Dans **Trésorerie**, créer les comptes de caisse ou de banque nécessaires et les rattacher au compte comptable correspondant. Les bons demandent un compte de trésorerie compatible avec le moyen de paiement.
5. Vérifier les périodes, exercices et données de départ avant d’utiliser les états comptables. Certaines sélections d’exercice visibles sur la Balance/Grand livre ne sont pas encore alimentées dans l’interface actuelle.

Les codes de comptes, imputations, taux de TVA et soldes d’ouverture doivent être confirmés par le responsable comptable selon le référentiel et la réglementation réellement applicables à l’entreprise.

## 4. Tableau de bord comptable

Le tableau de bord `/dashboard/comptabilite` présente une synthèse sur une période sélectionnable (semaine, mois, trimestre, année ou toutes les périodes), notamment :

- produits et charges comptabilisés ;
- montants encaissés et décaissés ;
- créances clients et engagements restant à solder ;
- résultat net calculé par l’application ;
- flux de trésorerie et solde de clôture ;
- structure simplifiée du bilan et répartition par moyen de règlement ;
- derniers mouvements de trésorerie et dernières écritures.

Utiliser ce tableau pour repérer les tendances puis ouvrir l’écran concerné pour examiner le détail. Les indicateurs dépendent des opérations présentes et de leur statut : une opération en attente n’a pas nécessairement le même effet qu’une opération validée ou comptabilisée.

## 5. Bons de caisse et cycle achats

L’écran **Bons de caisse** regroupe cinq vues : **Vue globale**, **Engagements achats**, **Décaissements**, **Encaissements** et **Pièces de caisse**. Les listes peuvent être recherchées/filtrées par période et entreprise ; l’écran propose également des statistiques, l’impression d’une pièce et des actions d’import selon les permissions.

### 5.1 Traiter un engagement venant des Achats

Les demandes et commandes qualifiées par le service Achats remontent dans **Engagements achats**. Le dossier montre notamment la source d’achat, le fournisseur, l’entreprise, le montant TTC, le statut Achats et le statut comptable.

Parcours opérationnel prévu :

1. Vérifier le dossier, son fournisseur, son entreprise, les pièces justificatives et le montant.
2. Si le statut Achats est admissible (par exemple commande confirmée, demande approuvée ou proforma approuvée), sélectionner **Valider compta**. Le dossier devient un engagement comptable (`ENGAGE`).
3. À l’étape **Engagé**, sélectionner **Saisir facture** et renseigner la facture fournisseur (référence, fournisseur, dates, montants HT/TVA/TTC et informations demandées par le formulaire).
4. Une fois l’engagement liquidé (`LIQUIDE`) ou ordonnancé (`ORDONNANCE`), sélectionner **Créer le paiement**. Renseigner le bénéficiaire, la date, le montant, le moyen de règlement, le compte de trésorerie, l’imputation comptable et, si nécessaire, le compte de TVA.
5. Confirmer le décaissement lorsque le paiement a effectivement été réalisé. Le statut `DECAISSE` indique le paiement confirmé et comptabilisé.

Le suivi peut afficher les statuts Achats (par exemple demande soumise, approuvée, commande confirmée, proforma retenue, livrée) séparément des statuts comptables. Ne pas confondre validation de l’achat et comptabilisation/paiement.

### 5.2 Enregistrer un encaissement

Dans **Encaissements**, créer un bon d’encaissement et renseigner :

1. la source ou le nom du client ;
2. l’entreprise concernée ;
3. la date, la description et éventuellement la référence (chèque/virement) ;
4. le moyen de règlement (espèces, chèque, virement ou carte) et le compte de trésorerie correspondant ;
5. les montants HT et TVA ; le TTC est calculé automatiquement comme HT + TVA ;
6. le compte comptable d’imputation et, si une TVA est renseignée, le compte de TVA collectée ;
7. les notes éventuelles, puis **Valider l’encaissement**.

La création place l’opération en attente de validation comptable. Un utilisateur autorisé la valide ensuite depuis la liste avec **Valider en compta**. Une fois validée (`VALIDE`), elle est transmise aux écritures comptables. Imprimer le bon pour conserver une pièce justificative.

### 5.3 Enregistrer un décaissement / une pièce de caisse

Pour un règlement fournisseur ou une dépense diverse, créer un décaissement ou une pièce de caisse selon l’action disponible. Saisir le bénéficiaire, le motif, l’entreprise, la date, la référence justificative, les montants HT/TVA/TTC, le moyen de paiement, le compte de trésorerie, le compte de charge et, en cas de TVA, le compte de TVA déductible. Un paiement lié à un engagement reprend les informations connues du dossier ; vérifier les montants avant validation.

Cycle de statut usuel d’une pièce de caisse : `BROUILLON` → `EN_ATTENTE` → `VALIDE` → `DECAISSE`. L’approbateur valide la pièce, puis confirme le paiement réalisé. Le décaissement confirmé est comptabilisé. Une opération annulée porte le statut `ANNULE`. Pour les décaissements issus d’engagements, le statut métier peut également passer par `ENGAGE`, `LIQUIDE` et `ORDONNANCE` avant le paiement.

### 5.4 Vue globale, recherche, import et impression

La **Vue globale** rassemble sur une chronologie les engagements, encaissements, décaissements et pièces de caisse avec dates, références, contreparties, montants et étapes. Les listes disposent de filtres de période, d’entreprise et de recherche. Les actions d’import sont réservées aux utilisateurs habilités ; contrôler le fichier, l’entreprise, le type de flux et le statut par défaut avant import. Les bons individuels et la liste peuvent être imprimés depuis les commandes proposées à l’écran.

## 6. Trésorerie

L’écran `/dashboard/comptabilite/tresorerie` permet de consulter les flux et soldes, gérer les comptes de trésorerie et suivre les clôtures.

### Comptes de trésorerie

**Nouveau compte** permet de saisir un nom, une banque éventuelle, un numéro de compte, une devise, un compte comptable lié et le compte par défaut. La modification est disponible pour les utilisateurs autorisés. Créer des comptes distincts pour les caisses et comptes bancaires réellement utilisés.

### Consultation des mouvements

Choisir une période (jour, semaine, mois, trimestre, année, toutes les périodes) ou une plage de dates personnalisée. La période journalière permet de choisir le jour. Filtrer ensuite par compte de trésorerie ou par clôture. Les indicateurs résument les encaissements, décaissements et solde de clôture ; le tableau détaille date, type, catégorie, compte, description, montant et solde après mouvement.

Les commandes **Imprimer le journal** et **Exporter Excel** produisent une sortie des mouvements filtrés. Vérifier les filtres avant export ou impression.

### Transfert interne entre caisses

Le bouton **Transfert interne** déplace des fonds d’un compte de trésorerie vers un autre, par exemple de la caisse principale vers une caisse secondaire. Sélectionner la caisse source et la caisse destinataire, saisir le montant, la date et une référence. Les deux comptes doivent être actifs, utiliser la même devise et être associés à des comptes comptables actifs de type **Actif**. Le montant ne peut pas dépasser le solde disponible de la caisse source.

L’application enregistre les deux mouvements dans une seule transaction : débit du compte comptable lié à la caisse destinataire et crédit de celui lié à la caisse source. Les soldes des deux comptes de trésorerie sont mis à jour ensemble. Le journal affiche une sortie sur la caisse source et une entrée sur la caisse destinataire. Aucune famille de charge ou de produit n’intervient dans cette opération. La référence permet de retrouver le transfert dans le journal.

### Clôture de caisse

1. Ouvrir **Clôturer la caisse**.
2. Sélectionner le compte et la période, puis renseigner les informations et montants demandés dans la fenêtre.
3. Enregistrer la clôture.
4. Un utilisateur possédant les permissions de validation peut ensuite valider la clôture depuis le tableau.

Contrôler les mouvements et justificatifs de la période avant validation. Une clôture validée sert de point de contrôle pour le suivi historique.

## 7. Plan comptable et familles

### Comptes

Dans l’onglet **Plan comptable**, la recherche porte sur le code ou le libellé et le filtre peut limiter les comptes à un type. Les indicateurs donnent le nombre de comptes et des totaux par catégories. Ouvrir le détail pour voir code, libellé, type, solde courant, date de dernière transaction et description.

Avec les droits nécessaires, **Nouveau compte** permet de renseigner code, libellé, type, description et solde d’ouverture. Les comptes existants peuvent être modifiés ou supprimés si les actions sont autorisées. Avant suppression, vérifier les écritures et règles liées ; une suppression peut être refusée si le compte est déjà utilisé.

### Familles des comptes

L’onglet **Familles des comptes** associe des familles fonctionnelles (charge, produit, dette, trésorerie, créance, capital, etc.) à un ou plusieurs comptes réels compatibles. Les familles facilitent l’imputation automatique ou guidée des opérations.

- Créer une famille avec un code, un libellé, un type comptable, un type d’affichage et éventuellement une description.
- Ajouter un ou plusieurs comptes réels compatibles avec le type.
- Marquer un compte principal/par défaut lorsque pertinent.
- Modifier le libellé et les paramètres, changer le compte par défaut, rattacher ou retirer un compte.
- Supprimer une famille si elle n’est plus utile et si le backend l’autorise.

Avant de modifier ces règles, vérifier les opérations qui s’appuient sur elles afin d’éviter une imputation incorrecte.

## 8. Écritures comptables

La page **Écritures** affiche les écritures et leurs lignes, avec leurs journaux, références, entreprise, comptes, totaux débit/crédit et libellés. La recherche porte sur le libellé, la référence, l’entreprise et les comptes ; un filtre permet de choisir une entreprise accessible. **Exporter Excel** exporte la liste filtrée.

Pour créer une écriture, sélectionner **Nouvelle écriture** puis :

1. renseigner la date, le code et le libellé du journal (par défaut `OD` / Opérations diverses), la référence de pièce et le libellé de l’écriture ;
2. ajouter au moins deux lignes ;
3. choisir une famille puis un compte réel (ou directement un compte si aucune famille n’est configurée) ;
4. saisir le libellé de chaque ligne et un montant au débit ou au crédit ; une ligne ne peut pas avoir les deux côtés simultanément ;
5. vérifier que le total débit est égal au total crédit ; le formulaire contrôle cet équilibre ;
6. soumettre l’écriture.

Tenir les justificatifs et références de pièces à jour. Les écritures automatiques issues des opérations validées peuvent aussi apparaître dans cette liste.

## 9. Grand livre et balance

Le **Grand livre** regroupe les mouvements issus du journal par compte et vise le contrôle détaillé des débits/crédits. La page propose un champ de filtre par codes/identifiants de comptes et une actualisation. L’interface affiche aussi des commandes d’export et des champs de dates.

La **Balance des comptes** présente la balance basée sur le journal comptable persistant, avec les colonnes de comptes, débits, crédits et soldes. Elle propose une actualisation, une période/exercice, une recherche et des commandes d’impression/export.

**Limite à connaître :** dans la version examinée, les sélecteurs d’exercice des pages Balance et Grand livre ne sont pas renseignés dynamiquement, les dates de Grand livre ne pilotent pas encore clairement le chargement et les boutons d’export/impression de la Balance ainsi que l’export PDF du Grand livre n’ont pas de traitement visible dans ces pages. Utiliser ces écrans pour la consultation uniquement après vérification manuelle des résultats ; ne pas considérer ces exports ou filtres comme opérationnels sans validation dans votre instance.

## 10. Rapports comptables et états SYSCOA

La page **Rapports comptables** propose une période (mois, trimestre ou année), des cartes synthétiques et des vues du bilan, du compte de résultat, de la trésorerie, des engagements et des indicateurs financiers. Le bouton **Balance** ouvre la balance des comptes.

Les utilisateurs autorisés à exporter peuvent produire les exports CSV/Excel et PDF proposés dans l’en-tête. Sélectionner la période avant l’export.

### Générer un état réglementaire SYSCOA

1. Cliquer **Générer États réglementaires (SYSCOA)**.
2. Lancer la génération pour l’exercice courant et l’entreprise associée à l’utilisateur.
3. Après réussite, noter l’identifiant du snapshot puis télécharger le PDF.

Le système indique que les états générés (bilan, compte de résultat et tableau de flux de trésorerie) reposent sur les écritures validées et sont archivés sous forme de snapshots immuables pour l’audit. Le dialogue actuel ne propose pas de choix manuel d’exercice : il transmet `CURRENT`. Vérifier le résultat, le périmètre entreprise et les montants avant toute transmission réglementaire.

## 11. Budget

La page **Budget** affiche, pour l’année courante, des statistiques globales, un graphique et un tableau par centre analytique/responsabilité. Le tableau compare budget alloué, consommé (réel), reliquat et taux de consommation. Un taux supérieur à 100 % ou un reliquat négatif signale un dépassement.

Dans l’interface examinée, cette page est une vue de consultation : aucun formulaire de création/modification d’enveloppes budgétaires ni sélecteur d’année n’est présent. Les données budgétaires doivent donc être alimentées par les mécanismes configurés côté application ou service.

## 12. Placements

La page **Placements** affiche les statistiques d’un portefeuille, ses positions et une répartition par classe d’actifs. Le bouton **Nouveau placement** permet de saisir une désignation, un émetteur/institution, un type d’actif (action, obligation, TCN ou immobilier), une quantité, un prix d’acquisition unitaire, une date, une devise et des notes. Le coût total estimé est calculé à partir de la quantité et du prix. La création enregistre une opération d’achat dans le portefeuille utilisé par l’application.

**Limites à connaître :** dans l’écran actuel, le portefeuille affiché est le portefeuille sélectionné par le composant ou, par défaut, le premier portefeuille renvoyé par le service. L’onglet **Historique** affiche encore un message de chargement au lieu d’une liste de transactions. Les composants d’ajout de cours/valorisation présents dans le dépôt ne sont pas reliés au tableau de bord visible. Les opérations financières doivent être rapprochées de leurs pièces et de leur traitement comptable.

## 13. Contrôles de fin de période

À la fin d’une journée, d’un mois ou d’un exercice :

1. traiter les engagements achats et pièces en attente ; confirmer uniquement les paiements réellement exécutés ;
2. vérifier les encaissements et décaissements par rapport aux justificatifs et relevés bancaires ;
3. clôturer les caisses et vérifier les soldes par compte de trésorerie ;
4. examiner les écritures, rechercher les écarts débit/crédit et contrôler les comptes d’imputation ;
5. consulter le grand livre et la balance sur le périmètre voulu ;
6. comparer bilan, résultat, créances, engagements et trésorerie dans les rapports ;
7. générer le snapshot SYSCOA une fois les écritures vérifiées, puis archiver le PDF et les pièces sources.

Une différence entre une vue de gestion et un rapport peut provenir d’opérations en attente, d’un exercice/périmètre différent, ou de données comptables non encore validées. Contrôler les statuts et filtres avant de conclure.

## 14. Limites et points à confirmer dans la version actuelle

Ce manuel décrit l’interface et les parcours retrouvés dans le dépôt. Certaines commandes visibles peuvent nécessiter une vérification dans l’instance en cours :

- les sélecteurs de période/exercice et boutons d’export des pages Grand livre et Balance paraissent partiellement implémentés ;
- l’écran Budget affiche des résultats, sans gestion de budget dans l’interface ;
- la génération SYSCOA utilise l’exercice courant automatiquement ;
- les fonctions détaillées des placements dépendent des champs actifs du formulaire et des données disponibles ;
- la création d’un bon n’équivaut pas toujours à sa validation comptable : suivre les statuts jusqu’à l’étape comptabilisée.

Les états produits par l’application sont des outils de gestion et de préparation. Faire valider les paramétrages, imputations et déclarations par le responsable comptable avant usage officiel.
