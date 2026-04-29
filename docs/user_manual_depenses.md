# Manuel d'Utilisation : Module Dépenses et Trésorerie

Ce manuel décrit les procédures d'utilisation du module de gestion des dépenses et de la trésorerie de ParabellumGroups.

## 1. Enregistrement d'un Encaissement (Recette)

L'encaissement permet d'enregistrer une entrée de fonds directe dans la caisse ou sur un compte bancaire.

**Étapes :**
1. Allez dans l'onglet **Encaissements**.
2. Cliquez sur **Nouvel Encaissement**.
3. Remplissez les informations :
   - **Tiers/Client** : La personne ou entité versant les fonds.
   - **Service / Entité** : Sélectionnez le centre de coût (ex: PROGI-TECK, CABINE, etc.).
   - **Mode de règlement** : Espèces, Chèque, Virement ou Carte.
   - **Compte de Trésorerie** : Le compte de destination (filtré selon le mode de règlement).
   - **Imputation Comptable** : Sélectionnez le compte de revenu (Classe 7) associé à cette recette.
4. Cliquez sur **Valider**.

## 2. Enregistrement d'un Décaissement (Dépense)

Le décaissement permet d'enregistrer une sortie de fonds.

**Étapes :**
1. Allez dans l'onglet **Décaissements**.
2. Cliquez sur **Nouveau Décaissement**.
3. Remplissez les informations :
   - **Bénéficiaire** : Le fournisseur ou la personne recevant les fonds.
   - **Service / Entité** : Sélectionnez le centre de coût responsable de la dépense.
   - **Mode de règlement** : Sélectionnez comment vous payez.
   - **Compte à Débiter** : La source des fonds.
   - **Imputation Comptable** : Sélectionnez le compte de charge (Classe 6) correspondant.
4. Cliquez sur **Confirmer**.

## 3. Impression des Bons de Caisse

Le système génère automatiquement des pièces justificatives au standard professionnel.

**Caractéristiques de l'impression :**
- **Format** : A4 Standard.
- **Double Exemplaire** : Chaque impression génère deux exemplaires sur la même feuille :
  1. **Exemplaire Souche** (à conserver par la comptabilité).
  2. **Exemplaire Bénéficiaire** (à remettre au tiers).
- **Zéro Publicité** : Les mentions légales inutiles (SARL, RCCM, etc.) ont été retirées pour un design épuré, ne conservant que le logo et les informations du mouvement financier.

**Procédure :**
1. Dans le tableau des mouvements, cliquez sur l'icône d'imprimante dans la colonne **Actions**.
2. Un aperçu avant impression s'affiche.
3. Vérifiez la disposition et cliquez sur **Imprimer**.

## 4. Vue Consolidée

L'onglet **Vue consolidée** regroupe tous les mouvements (Engagements, Bons de caisse, Flux directs). 
- Utilisez la barre de recherche pour filtrer par **Numéro de pièce**, **Tiers** ou **Service**.
- La colonne **Service / Entité** permet de suivre la consommation budgétaire par centre de profit.



Dans le flux métier qu’on a posé, le bon de caisse ne doit pas être enregistré au moment où on valide une DPA ou au moment où la facturation marque une facture payée.

Le bon moment, c’est quand la comptabilité / caisse émet réellement la pièce de caisse.

Concrètement, aujourd’hui dans le projet il faut distinguer 4 choses sur la page Dépenses:

Engagement achat : la DPA ou la proforma retenue devient visible pour le comptable.
Décaissement : la compta prépare la sortie d’argent.
Encaissement : la facturation déclare qu’un paiement client a été reçu, mais il reste à valider par la compta.
Bon de caisse : la pièce de caisse elle-même, créée manuellement via le flux dédié, pas automatiquement.
Donc le bon enchaînement est:

Achat
DPA validée
si une proforma est retenue, elle remonte dans Engagements achats
le comptable valide l’engagement
quand on décide de payer, on crée le décaissement
si on veut une vraie pièce de caisse, on enregistre le bon de caisse à ce moment-là
après validation finale, ça passe en écriture comptable
Vente / facture client
la facturation enregistre le paiement
cela crée un encaissement en attente
la compta contrôle et valide
après validation, on génère l’écriture comptable
si vous utilisez une pièce de caisse pour l’encaissement, le bon de caisse s’émet au niveau caisse, pas au simple clic “facture payée”
Dans le code actuel, ça se voit bien:

la création d’un bon de caisse est manuelle dans cashVoucher.controller.js (line 203)
les encaissements et décaissements passent par des mutations séparées dans depenses/page.tsx (line 122)
le décaissement est créé via son propre dialogue dans CreateDecaissementDialog.tsx (line 1)
Donc ta logique est bonne:

pas d’écriture comptable directe
d’abord visibilité et validation comptable
ensuite pièce de caisse / décaissement / encaissement
puis écriture comptable

le  services/procurement-service/controllers/demandeAchat.controller.js fait 2055 ligne c'est trop trop long nous somme en microservice c'est pour rendre notre projet modulaire comme controllers/
└── purchaseQuotes/
    ├── index.js                 # Export principal et création du contrôleur
    ├── permissions.js           # Gestion des permissions
    ├── quoteHelpers.js          # Helpers spécifiques aux quotes
    ├── proformaHelpers.js       # Helpers spécifiques aux proformas
    ├── payloads.js              # Construction des payloads d'événements
    ├── validation.js            # Validation des données
    ├── committeeHelpers.js      # Évaluation de commission
    ├── queries.js               # Requêtes base de données
    ├── eventHandlers.js         # Gestion des événements outbox
    ├── quoteHandlers.js         # Handlers pour les DPA
    ├── proformaHandlers.js      # Handlers pour les proformas
    └── statsHandlers.js         # Handlers pour les statistiques une remarque si on a un fichier qui fais 500 ligne rend ca modulaire stp 