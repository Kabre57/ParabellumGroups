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

## 4. Responsabilités par étape

| Étape | Responsable | Action |
| --- | --- | --- |
| Prospection | Commercial | Saisie des prospects dans le module |
| Création opportunité | Commercial | Qualification et entrée dans le pipeline |
| Émission devis V1 | Commercial | Création et envoi au prospect |
| Négociation / V2 | Commercial | Versionnement + suivi des échanges |
| Passage client | Commercial (ou Assistant) | Validation et déclenchement (manuel ou auto) |
| Archivage | Tous | Dépôt des documents dans la bonne section |

## 5. Délais et règles de gestion

| Règle | Valeur recommandée |
| --- | --- |
| Relance après envoi devis | J+3 (téléphone), J+7 (email) |
| Expiration devis | 30 jours (ou selon politique commerciale) |
| Nettoyage devis "Perdu" | Archiver après 90 jours sans activité |
| Passage client automatique | Immédiat dès devis signé |

## 6. Champs obligatoires

| Module | Champs obligatoires |
| --- | --- |
| Prospection | Nom société, Source, Contact principal |
| Opportunité | Valeur potentielle, Probabilité (%), Date closing estimée |
| Devis | Objet, Montant HT/TTC, Date validité, Statut |
| Client | Raison sociale, Type client, Adresse facturation |

## 7. Cas particuliers / exceptions

| Cas | Traitement |
| --- | --- |
| Devis signé mais client existant | Ne pas créer de doublon, rattacher opportunité + devis au client existant |
| Devis perdu après négociation | Renseigner le motif de perte (prix, concurrent, délai) |
| Devis signé partiellement | Créer un devis final au montant validé, l'ancien passe en "Remplacé" |
| Client sans devis (abonnement) | Créer client + opportunité, mention "Sans devis" dans l'historique |

## 8. Indicateurs de suivi (rapports)

| Indicateur | Définition |
| --- | --- |
| Taux de conversion | (Opportunités gagnées / total opportunités) × 100 |
| Taux devis → client | (Devis signés / devis envoyés) × 100 |
| Délai moyen de closing | Moyenne entre création opportunité et signature |
| Valeur moyenne devis signés | Montant total signé / nombre devis signés |
| Source la plus performante | Opportunités gagnées par source |

## 9. Schéma simplifié

```
[Prospect] ──► [Opportunité] ──► [Devis V1] ──► [Négociation] ──► [Devis V2]
                                                            │
                                                  (si signé) ▼
[Historique] ◄── [Client] ◄────────────────────── [Vente conclue]
     │
     ▼
[Documents]
```

## 10. Liens de données attendus

- Devis est lié à : Opportunité + Prospect/Client
- Opportunité est liée à : Prospects + Contacts + Devis
- Client regroupe : Contacts + Adresses + Historique + Documents

## 11. Résumé opérationnel

- La prospection nourrit le pipeline.
- Les devis suivent un cycle de versionnement.
- Le devis signé transforme le prospect en client.
- Les interactions et documents restent traçables.
