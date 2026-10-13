# Rapport des fichiers source de plus de 500 lignes

**Date de l’analyse : 13 octobre 2026**

## Méthode et périmètre

Le relevé couvre les fichiers source suivis par Git et les fichiers non ignorés présents dans le dépôt. Il comprend le code JavaScript/TypeScript, les styles, les schémas Prisma et les migrations SQL. Les dépendances, caches, sorties de build et fichiers de verrouillage sont exclus. Le comptage correspond aux lignes physiques : les lignes vides et les commentaires sont inclus.

Au total, **947 fichiers source** ont été parcourus. **63 dépassent 500 lignes**, pour **45 539 lignes cumulées**. Parmi eux, 13 dépassent 800 lignes et 5 dépassent 1 200 lignes.

| Catégorie | Fichiers > 500 lignes | Lignes cumulées |
|---|---:|---:|
| Frontend | 31 | 21 169 |
| Backend et scripts de service | 27 | 19 919 |
| Schémas Prisma et migration SQL | 4 | 3 922 |
| Hors runtime (`scratch`) | 1 | 529 |
| **Total** | **63** | **45 539** |

## Fichiers concernés

### Backend et scripts de service

| Lignes | Fichier |
|---:|---|
| 1 554 | `services/technical-service/controllers/intervention.controller.js` |
| 1 499 | `services/commercial-service/controllers/prospect.controller.js` |
| 1 263 | `services/billing-service/controllers/devis.controller.js` |
| 1 239 | `services/customer-service/controllers/client.controller.js` |
| 836 | `services/customer-service/prisma/seed.js` |
| 786 | `services/billing-service/controllers/accountingOverview.controller.js` |
| 760 | `services/billing-service/controllers/cashVoucher.controller.js` |
| 735 | `services/technical-service/controllers/mission.controller.js` |
| 685 | `services/billing-service/controllers/accountingFamilyRule.controller.js` |
| 677 | `services/customer-service/controllers/contrat.controller.js` |
| 675 | `services/customer-service/controllers/opportunite.controller.js` |
| 673 | `services/auth-service/src/controllers/auth.controller.js` |
| 633 | `services/technical-service/controllers/materiel.controller.js` |
| 632 | `services/procurement-service/controllers/demandeAchat/requests.controller.js` |
| 632 | `services/procurement-service/controllers/bonCommande.controller.js` |
| 589 | `services/technical-service/controllers/rapport.controller.js` |
| 588 | `services/billing-service/controllers/account.controller.js` |
| 586 | `services/customer-service/controllers/secteur.controller.js` |
| 580 | `services/billing-service/controllers/facture.controller.js` |
| 576 | `services/auth-service/src/controllers/user.controller.js` |
| 570 | `services/customer-service/controllers/interaction.controller.js` |
| 552 | `services/technical-service/controllers/ordreMission.controller.js` |
| 542 | `services/procurement-service/controllers/demandeAchat/proformas.controller.js` |
| 529 | `scratch/update-schema.js` — hors runtime |
| 523 | `services/auth-service/src/controllers/permission.controller.js` |
| 514 | `services/commercial-service/controllers/sequence.controller.js` |
| 513 | `services/customer-service/controllers/document.controller.js` |
| 507 | `services/procurement-service/controllers/demandeAchat/shared.js` |

### Frontend

| Lignes | Fichier |
|---:|---|
| 1 105 | `frontend/app/(dashboard)/dashboard/achats/devis/[id]/page.tsx` |
| 1 041 | `frontend/app/(dashboard)/dashboard/crm/clients/[id]/page.tsx` |
| 997 | `frontend/src/shared/api/billing/types.ts` |
| 924 | `frontend/src/components/hr/logipaie/logipaieLabels.ts` |
| 909 | `frontend/src/shared/api/procurement/procurement.service.ts` |
| 822 | `frontend/app/(dashboard)/dashboard/achats/commandes/page.tsx` |
| 790 | `frontend/src/components/dashboard/EnterpriseRealtimeDashboard.tsx` |
| 736 | `frontend/src/components/achat/proforma/ProformaDecisionBoard.tsx` |
| 726 | `frontend/src/components/commercial/quotes/CreateClientQuoteDialog.tsx` |
| 698 | `frontend/app/(dashboard)/dashboard/achats/page.tsx` |
| 684 | `frontend/src/components/comptabilite/comptes/AccountingFamiliesManager.tsx` |
| 659 | `frontend/src/components/technical/CreateMissionModal.tsx` |
| 657 | `frontend/app/(dashboard)/dashboard/achats/produits/page.tsx` |
| 657 | `frontend/src/hooks/useCrm.ts` |
| 653 | `frontend/app/(dashboard)/dashboard/achats/stock/page.tsx` |
| 646 | `frontend/app/(dashboard)/dashboard/commercial/page.tsx` |
| 634 | `frontend/app/(dashboard)/dashboard/messages/page.tsx` |
| 621 | `frontend/app/(dashboard)/dashboard/rh/paie/page.tsx` |
| 614 | `frontend/app/(dashboard)/dashboard/technical/missions/page.tsx` |
| 597 | `frontend/src/components/comptabilite/depenses/DepensesTable.tsx` |
| 579 | `frontend/app/(dashboard)/dashboard/comptabilite/depenses/page.tsx` |
| 578 | `frontend/src/components/commercial/quotes/QuoteDetailView.tsx` |
| 564 | `frontend/app/(dashboard)/dashboard/crm/contracts/page.tsx` |
| 564 | `frontend/src/components/commercial/CreateProspectModal.tsx` |
| 554 | `frontend/app/(dashboard)/dashboard/projets/page.tsx` |
| 547 | `frontend/src/components/commercial/EditProspectModal.tsx` |
| 534 | `frontend/app/(dashboard)/dashboard/crm/contacts/page.tsx` |
| 526 | `frontend/app/(dashboard)/dashboard/technical/materiel/page.tsx` |
| 523 | `frontend/src/shared/api/shared/types.ts` |
| 516 | `frontend/app/(dashboard)/dashboard/achats/fournisseurs/page.tsx` |
| 514 | `frontend/app/(dashboard)/dashboard/admin/users/page.tsx` |

### Schémas et migrations

| Lignes | Fichier |
|---:|---|
| 1 460 | `services/billing-service/prisma/schema.prisma` |
| 1 113 | `services/customer-service/prisma/schema.prisma` |
| 690 | `services/commercial-service/prisma/schema.prisma` |
| 659 | `services/customer-service/prisma/migrations/20260202123623_nouvelle_fonctionnalite/migration.sql` |

## Autres gros fichiers structurés

Ces fichiers ne sont pas comptés dans les 947 fichiers source ci-dessus, mais dépassent eux aussi 500 lignes :

| Lignes | Fichier | Nature |
|---:|---|---|
| 3 267 | `services/customer-service/swagger.yaml` | Contrat API OpenAPI |
| 2 109 | `services/customer-service/Parabellum-customer-service.postman_collection.json` | Collection de requêtes Postman |
| 512 | `docker-compose.yml` | Configuration de déploiement |

## Analyse

- **Plus fortes concentrations de logique métier :** les contrôleurs `intervention`, `prospect`, `devis` et `client` dépassent 1 200 lignes. Ce sont les meilleurs candidats à une revue de découpage par workflow ou par responsabilité, en vérifiant leurs tests avant chaque refactorisation.
- **Pages frontend très chargées :** les pages détail des devis d’achat et des clients CRM dépassent 1 000 lignes. Il serait utile d’identifier les formulaires, tableaux et dialogues intégrés qui peuvent être isolés en composants ou hooks dédiés.
- **La longueur ne signifie pas toujours complexité métier :** les schémas Prisma, la migration, le seed, les types et les fichiers de libellés peuvent contenir beaucoup de déclarations ou de données. Leur priorité de refactorisation est donc moindre qu’un contrôleur ou une page qui combine accès aux données, règles métier et présentation.
- **Hors runtime :** `scratch/update-schema.js` est un script de travail ponctuel, pas un module applicatif. Il dépasse néanmoins le seuil dans l’arborescence du dépôt.

Ce relevé est un indicateur de taille et de concentration. Il ne mesure pas la complexité, les duplications, la couverture des tests ou les défauts fonctionnels.
