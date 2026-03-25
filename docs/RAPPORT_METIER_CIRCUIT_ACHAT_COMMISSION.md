# Rapport Metier

## Circuit achat et commission achat

### 1. Objectif

Ce document presente le fonctionnement metier du nouveau circuit achat dans Parabellum Groups.
Le but est de permettre :

- aux services demandeurs de creer des DPA internes de maniere simple ;
- au service achat de comparer plusieurs offres fournisseurs ;
- a la Direction Generale de valider les bonnes decisions ;
- a l'entreprise de garder une trace claire des prix, delais, disponibilites et justifications de choix.

### 2. Acteurs du processus

Les acteurs concernes sont les suivants :

- le service demandeur ;
- le service achat ;
- la Direction Generale ;
- les fournisseurs ;
- le service reception ;
- la comptabilite, en aval si necessaire.

### 3. Definition des objets metier

#### 3.1. DPA interne

La DPA est la demande de base. Elle est creee au nom d'un service.
Elle contient :

- l'objet de la demande ;
- le service demandeur ;
- la description du besoin ;
- le fournisseur propose ou un fournisseur libre si absent du referentiel ;
- les lignes d'achat ;
- les quantites ;
- les prix unitaires ;
- la TVA ;
- le montant total estime.

#### 3.2. Proforma fournisseur

La proforma est une offre fournisseur rattachee a une DPA deja validee au premier niveau.
Une DPA peut avoir plusieurs proformas.
Chaque proforma contient :

- un fournisseur ;
- des lignes de prix ;
- un delai de livraison ;
- une disponibilite ;
- des observations achat ;
- un montant global ;
- un statut ;
- un indicateur de recommandation achat ;
- un indicateur de selection finale pour le bon de commande.

#### 3.3. Commission achat

La commission achat est la vue de decision et d'arbitrage.
Elle permet de comparer les proformas sur des criteres homogenes :

- prix ;
- delai ;
- disponibilite ;
- fiabilite fournisseur ;
- justification du choix ;
- decision retenue.

### 4. Workflow metier

#### 4.1. Creation de la DPA

Le service demandeur cree une DPA interne.
La DPA est saisie dans une grille ERP avec plusieurs lignes si necessaire.
L'utilisateur peut choisir un fournisseur existant ou saisir un nouveau fournisseur libre.

#### 4.2. Soumission de la DPA

Quand la DPA est complete, elle est soumise au DG.
Le statut passe alors de brouillon a soumis.

#### 4.3. Validation de la DPA

Le DG peut :

- valider la DPA ;
- rejeter la DPA.

Si la DPA est rejetee, elle revient dans le circuit pour correction.
Si la DPA est validee, le service achat peut commencer la gestion des proformas.

#### 4.4. Enregistrement des proformas

Le service achat saisit une ou plusieurs proformas liees a la DPA.
Chaque proforma peut presenter une offre differente, un delai different, une disponibilite differente et des observations particulieres.

#### 4.5. Analyse commission achat

Le systeme calcule une vue de comparaison entre les proformas.
Cette vue sert a la commission achat et au service achat pour arbitrer.

Les elements de comparaison sont :

- le total TTC ;
- le score prix ;
- le delai annonce ;
- le score delai ;
- la disponibilite ;
- le score de disponibilite ;
- le score fournisseur ;
- le score total ;
- la justification de choix.

#### 4.6. Recommandation achat

Le service achat peut recommander une proforma.
Il peut aussi retenir automatiquement le moins-disant.
Cette recommandation n'est pas encore la decision finale du DG, mais une proposition formelle.

#### 4.7. Validation DG de la proforma retenue

Le DG examine la proforma recommandee ou toute autre proforma disponible.
Il peut :

- valider la proforma ;
- rejeter la proforma.

La proforma validee devient la base officielle du bon de commande.

#### 4.8. Generation du bon de commande

Apres validation de la proforma retenue, le service achat genere le bon de commande.
Le bon de commande est donc rattache a :

- une DPA ;
- une proforma validee ;
- un fournisseur final.

#### 4.9. Reception

Une fois la commande executee, le service reception enregistre les biens recus.
Cela permet de rapprocher :

- la demande initiale ;
- la decision achat ;
- la commande ;
- la reception.

### 5. Regles metier principales

- une DPA appartient a un seul service demandeur ;
- une DPA peut avoir plusieurs lignes ;
- une DPA peut etre soumise au DG ;
- une DPA validee peut recevoir plusieurs proformas ;
- une proforma appartient a une seule DPA ;
- une seule proforma peut etre retenue pour la creation du bon de commande ;
- la recommandation achat ne remplace pas la validation DG ;
- le bon de commande ne peut etre genere qu'a partir d'une proforma validee ;
- la reception est rattachee au bon de commande.

### 6. Logique du score fournisseur

La vue commission achat repose sur un score d'aide a la decision.
Ce score n'est pas la decision finale, mais un outil d'arbitrage.

Le score prend en compte :

- le prix, avec avantage a l'offre la moins-disante ;
- le delai, avec avantage au delai le plus court ;
- la disponibilite, avec avantage aux offres en stock ou immediates ;
- la note fournisseur, si disponible dans le referentiel.

Le score total facilite la comparaison rapide entre les offres.
La justification de choix permet d'expliquer pourquoi une offre est recommandee ou retenue.

### 7. Vue commission achat exportable

Le systeme propose une vue exportable de commission achat sous forme imprimable.
Cette vue contient :

- les references de la DPA ;
- le service demandeur ;
- le tableau comparatif complet des proformas ;
- le moins-disant ;
- la proposition du service achat ;
- la decision retenue ;
- le motif ou la justification ;
- un proces-verbal de decision ;
- les zones de signature.

Cette impression peut servir de document de controle interne ou de piece justificative de decision.

### 8. Benefices attendus

Le nouveau circuit apporte plusieurs gains metier :

- meilleure lisibilite des achats ;
- meilleure separation entre demande interne et consultation fournisseur ;
- capacite a comparer plusieurs offres sur une meme DPA ;
- traçabilite de la recommandation achat et de la validation DG ;
- justification formelle du choix fournisseur ;
- meilleure base documentaire pour audit et controle.

### 9. Resume simple du fonctionnement

1. Le service demandeur cree une DPA.
2. Le DG valide ou rejette la DPA.
3. Le service achat saisit une ou plusieurs proformas.
4. La commission achat compare les offres.
5. Le service achat recommande une proforma.
6. Le DG valide la proforma retenue.
7. Le service achat genere le bon de commande.
8. Le service reception enregistre les biens recus.

### 10. Conclusion

Le nouveau fonctionnement metier renforce la qualite de la decision achat.
Il permet de passer d'une simple demande interne a un processus de selection fournisseur structure, justifie et tracable.
La vue commission achat donne a l'entreprise un outil d'arbitrage clair, exploitable et exportable.
