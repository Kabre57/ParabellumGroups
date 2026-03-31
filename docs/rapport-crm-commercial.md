# Rapport d'utilisation CRM & Commercial

Ce document décrit l'usage attendu des modules Prospection, Pipeline Commercial, Devis & Propositions, Clients et CRM, ainsi que les règles métier de versionnement des devis et la transformation automatique en client.

## 1. Parcours global (vision d'ensemble)

Flux principal :

PROSPECTION → OPPORTUNITÉS → PIPELINE → DEVIS → CLIENTS → HISTORIQUE/DOCUMENTS → RAPPORTS

Objectif :
- Le Commercial alimente le CRM.
- Le CRM conserve l'historique, les documents et l'analyse.

## 2. Devis modifié après négociation (versionnement)

Règle :
- On ne supprime jamais un devis envoyé.
- Chaque nouvelle version crée un devis V2, V3, etc.

Processus recommandé :
1. Le devis V1 passe en statut "Remplacé".
2. Le devis V2 est créé (lié à la même opportunité).
3. Les PDF sont archivés dans Documents de l'opportunité.
4. L'historique interactions enregistre : "Devis V2 envoyé suite à négociation".
5. Le montant de l'opportunité est mis à jour si la négociation change le total.

Statuts devis à utiliser :
- Brouillon
- Envoyé
- En négociation
- Remplacé
- Signé
- Expiré
- Perdu

## 3. Devis signé → Client (automatisation)

Déclencheur :
Devis = "Signé"

Actions automatiques attendues :
1. Création du client (à partir du prospect/opportunité).
2. Liaison des contacts existants.
3. Opportunité = "Gagnée".
4. Pipeline = "Vente conclue".
5. Notification au commercial.

Si automatisation indisponible :
Le commercial réalise les actions manuellement avec un suivi clair.

## 4. Liens de données attendus

- Devis est lié à : Opportunité + Prospect/Client
- Opportunité est liée à : Prospects + Contacts + Devis
- Client regroupe : Contacts + Adresses + Historique + Documents

## 5. Résumé opérationnel

- La prospection nourrit le pipeline.
- Les devis suivent un cycle de versionnement.
- Le devis signé transforme le prospect en client.
- Les interactions et documents restent traçables.

