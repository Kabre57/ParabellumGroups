# Rapport metier - Module RH / Paie PBL

## Objectif

Le module RH doit fonctionner comme un logiciel de gestion de paie adapte au contexte ivoirien et au cahier des charges PBL.

## Exigences couvertes

- Conformite legale CI : Code du travail, CNPS, CMU/CNAM, DGI, ITS
- Effectif cible : 25-30 salaries au depart, extensible a 100
- Calcul automatique de la paie
- Generation des bulletins PDF
- Exports RH / paie pour traitement DISA et DGI
- Rapports RH et masse salariale
- Mode cloud / SaaS dans l'ERP

## Fonctionnement

### 1. Cockpit RH

Le dashboard RH affiche :

- l'effectif total et l'effectif actif
- la masse salariale nette
- le cout employeur
- le nombre de bulletins generes, valides et payes
- la couverture CNPS et CMU/CNAM
- les taux legaux actifs (SMIG, CNPS, CMU/CNAM, FDFP)

### 2. Module Paie

Le module Paie est organise en trois vues :

- Vue executive
- Bulletins
- Conformite et exports

### 3. Bulletins de paie

Pour chaque periode :

- generation automatique des bulletins
- validation RH / comptable
- marquage des bulletins payes
- telechargement PDF
- ajustement des primes, indemnites, retenues et heures supplementaires

### 4. Conformite

Le module controle les points suivants :

- couverture CNPS des salaries
- couverture CMU/CNAM
- base de calcul IGR / DGI
- capacite de prise en charge jusqu'a 100 salaries
- disponibilite des exports paie

### 5. Exports

Deux exports sont produits par periode :

- Export DISA : informations sociales et cotisations
- Export DGI : brut, net imposable, IGR, retenues, net a payer

## Valeur metier

Ce fonctionnement permet a PBL et a la RH de :

- disposer d'une paie plus fiable
- reduire les calculs manuels
- preparer les declarations sociales et fiscales
- suivre la conformite legale
- piloter l'evolution de l'effectif et du cout salarial
