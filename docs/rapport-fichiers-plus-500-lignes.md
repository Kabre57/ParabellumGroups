# Rapport de modularisation et de taille des fichiers

**Date : 13 octobre 2026**

## Bilan

Les 39 fichiers suivis initialement releves au-dessus de 500 lignes ont ete modularises. Le dernier relevement ne trouve aucun fichier JavaScript, TypeScript, JSX, CSS ou SCSS actif au-dessus de 500 lignes.

Le releve source couvre 1 191 fichiers et 168 089 lignes, en excluant les dependances, les caches, les sorties de compilation, les fichiers de verrouillage, les contrats JSON/YAML, les archives de schema et l'instantane SQL ignore a la racine. Quatre fichiers de schema ou de migration restent au-dessus du seuil : trois schemas Prisma et une migration SQL. Ils restent dans leur format canonique de chargement et d'historique de deploiement.

Les fichiers applicatifs decomposes conservent leurs chemins d'import publics et leurs exports attendus par les routes. Les tests existants verifient les facades, les modules partages et les imports. Le seed a ete separe en phases ordonnees sans executer d'ecriture en base.

## Derniers decoupages realises

| Domaine | Facade / composant | Modules extraits |
|---|---:|---|
| Dashboard achats | 371 lignes | Hook de donnees et fenetres de dialogue |
| Stock | 376 lignes | Hook de donnees et fenetres de dialogue |
| Dashboard entreprise | 299 lignes | Types et utilitaires (121), donnees (321), indicateurs (271) |
| Decision proformas | 176 lignes | Profil, classement, grille de commission et comparatif |
| Table des depenses | 141 lignes | Cinq panneaux par onglet et constantes |
| Fiche devis | 395 lignes | Hook d'etat et d'actions (352) |
| Mission technique | 402 lignes | Hook de formulaire et de donnees (415) |
| Familles comptables | 429 lignes | Hook de mutations et de filtrage (422) |
| Types API partages | 6 lignes | Modules communs, entites, authentification et prospection |
| Seed clients | 79 lignes | Phases de clients (209), relations (207), commercial (175), dossiers (226) |
| Resolver comptable | 204 lignes | Cache et regles de familles (359) |
| Controleur entreprises | 440 lignes | Suppression d'entreprise (76) |
| Proxy archive | 320 lignes | Helpers proxy (287) |
| Outil de schema scratch | 38 lignes | Trois fragments Prisma, tous sous 500 lignes |
| Demandes opérationnelles frontend | 454 lignes | Modal formulaire (174), modal bon de caisse (129), détail (358), constantes et types (93) |
| Service demandes opérationnelles | 45 lignes | Contrôleur principal (224), traitement financier (186), pièces jointes (68), partagés (103), auth (113), routes (89), outbox (90) |

Les autres pages, hooks, types, services et controleurs decomposes dans les lots precedents sont egalement sous le seuil. Les modules de presentation, les hooks et les utilitaires gardent une responsabilite plus ciblee, et les facades historiques restent disponibles.

## Fichiers de schema et de migration encore au-dessus de 500 lignes

| Lignes | Fichier | Traitement |
|---:|---|---|
| 1 663 | `services/billing-service/prisma/schema.prisma` | Schema canonique Prisma, conserve tel quel |
| 1 203 | `services/customer-service/prisma/schema.prisma` | Schema canonique Prisma, conserve tel quel |
| 715 | `services/commercial-service/prisma/schema.prisma` | Schema canonique Prisma, conserve tel quel |
| 829 | `services/customer-service/prisma/migrations/20260202123623_nouvelle_fonctionnalite/migration.sql` | Fichier unique de l'historique de migration |

Le schema de sauvegarde `services/billing-service/prisma/schema.prisma.bak` fait 1 085 lignes; il est classe comme archive et n'est pas utilise par le runtime.

## Autres fichiers suivis de plus de 500 lignes

Ces fichiers sont des contrats, de la documentation, de la configuration ou des dependances generees; ils ne sont pas inclus dans le compteur de code applicatif.

| Lignes | Fichier | Nature |
|---:|---|---|
| 534 | `docker-compose.yml` | Configuration des services |
| 795 | `frontend/README.md` | Documentation |
| 3 403 | `frontend/pnpm-lock.yaml` | Verrouillage de dependances |
| 1 845 | `services/analytics-service/pnpm-lock.yaml` | Verrouillage de dependances |
| 3 789 | `services/api-gateway/pnpm-lock.yaml` | Verrouillage de dependances |
| 6 167 | `services/auth-service/pnpm-lock.yaml` | Verrouillage de dependances |
| 3 011 | `services/billing-service/pnpm-lock.yaml` | Verrouillage de dependances |
| 1 205 | `services/commercial-service/pnpm-lock.yaml` | Verrouillage de dependances |
| 1 992 | `services/communication-service/pnpm-lock.yaml` | Verrouillage de dependances |
| 1 205 | `services/customer-service/pnpm-lock.yaml` | Verrouillage de dependances |
| 1 862 | `services/inventory-service/pnpm-lock.yaml` | Verrouillage de dependances |
| 1 276 | `services/notification-service/pnpm-lock.yaml` | Verrouillage de dependances |
| 1 288 | `services/procurement-service/pnpm-lock.yaml` | Verrouillage de dependances |
| 1 205 | `services/project-service/pnpm-lock.yaml` | Verrouillage de dependances |
| 3 295 | `services/technical-service/pnpm-lock.yaml` | Verrouillage de dependances |
| 2 109 | `services/customer-service/Parabellum-customer-service.postman_collection.json` | Collection Postman |
| 3 399 | `services/customer-service/swagger.yaml` | Contrat OpenAPI |

L'instantane SQL ignore `billing-before-prisma-resolve.sql` est exclu du relevement suivi. Sa derniere mesure documentee etait de 4 619 lignes.

## Validation

`pnpm run validate` passe : verification TypeScript, syntaxe JavaScript frontend et backend, compilation du service de notifications et tests de services.

| Parcours valide | Tests reussis |
|---|---:|
| Interventions techniques | 13 |
| Prospection commerciale | 5 |
| Achats et approvisionnement | 8 |
| Authentification | 8 |
| API Gateway | 8 |
| Facturation et comptabilite | 25 |
| Gestion clients | 19 |
| **Total** | **86** |

`pnpm run test:scripts` passe egalement avec 18 tests. Le relevement de syntaxe backend couvre 507 fichiers JavaScript. Le seed, les phases de seed, le proxy archive et le resolver comptable passent aussi les controles de syntaxe ou de chargement effectues pendant le decoupage.

## Suite possible

Les seuls fichiers metier encore au-dessus du seuil sont les schemas canoniques et la migration historique. Les autres fichiers volumineux sont de la documentation, des contrats, de la configuration, des archives ou des fichiers de verrouillage; leur taille n'est pas un indicateur de taille de module applicatif.

La taille seule ne permet pas de conclure a une complexite ou a un defaut. Les tests de modules ne remplacent pas les essais d'integration des parcours complets avec une base PostgreSQL.
