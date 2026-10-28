# Demandes opérationnelles — backend

## Architecture des dossiers

```text
controllers/       Contrôleurs métier et transactions Prisma
middleware/        JWT, permissions et périmètre entreprise
prisma/
  schema.prisma    Modèle PostgreSQL de production
  migrations/      Migrations SQL versionnées
routes/            Routes Express
utils/             Client HTTP Billing, outbox, constantes et stockage
tests/             Tests unitaires existants
test/
  helpers/
    testPrisma.ts   Client Prisma SQLite en mémoire, migrations et contraintes
    billingStub.ts  Serveur Express Billing sur port aléatoire
    webCashVoucherFlow.ts  Chargement de la mutation et des services web réels
  integration/
    linkCashVoucher.test.ts  Parcours HTTP de liaison avec écritures réelles
```

## Exécution des tests

Node.js 24 et pnpm sont nécessaires. Depuis ce dossier :

```sh
pnpm install --frozen-lockfile
pnpm --dir ../../frontend install --frozen-lockfile
pnpm test
pnpm run test:integration
pnpm run typecheck:test
```

`pnpm test` exécute les tests unitaires et d'intégration. Les serveurs de test
écoutent uniquement sur `127.0.0.1`, avec des ports attribués par le système.
Les URL Billing et Auth et le secret JWT sont remplacés temporairement puis
restaurés. Les jetons passent par les vrais middlewares JWT et permissions.
Aucun contrôleur, helper Billing ou modèle Prisma n'est simulé.
Les dépendances du frontend sont nécessaires pour exécuter son véritable client
Axios et ses intercepteurs dans les tests du parcours web.

Chaque scénario ouvre une nouvelle base SQLite `:memory:` via Prisma et
`better-sqlite3`, crée sa demande avec `prisma.operationalRequest.create()`, puis
ferme la base et les serveurs. `DATABASE_URL` n'est jamais utilisé pour cette
base. Le helper vérifie aussi que SQLite n'a ouvert aucun fichier de base.

Prisma 5.14 reste la version de production et celle de la commande `prisma`.
Le client de test utilise Prisma 6.19, réservé aux dépendances de développement,
pour conserver les champs JSON et les enums du modèle avec SQLite. Sa génération
utilise une API interne versionnée de Prisma et reste isolée dans
`node_modules/.cache/integration-prisma/`. L'override local de `better-sqlite3`
12.4.1 permet son utilisation avec Node.js 24.

Les migrations PostgreSQL versionnées sont lues dans l'ordre et adaptées pour
SQLite : enums stockés en texte, timestamps et clés étrangères intégrées aux
`CREATE TABLE`. Elles s'exécutent sur la même connexion en mémoire que les tests,
avec leur empreinte enregistrée dans `_test_migrations`. Une instruction non
prise en charge fait échouer l'initialisation. Il ne s'agit pas d'un
`prisma migrate deploy` PostgreSQL : SQLite conserve les index uniques, les clés
étrangères et les transactions, mais ne reproduit pas les contraintes d'enum
ni la précision fixe des décimaux de PostgreSQL.

## Couverture du contrat Billing

### Lot 1.5 : parcours web existant, création puis liaison

`linkCashVoucher.test.ts` exécute la fonction `mutationFn` de `cashVoucherMutation`
extraite par l'AST TypeScript de la page web actuelle. Le client API et
`operationalRequestsService` sont compilés depuis leurs vrais fichiers et
utilisent Axios avec leurs intercepteurs réels. La logique de reprise n'est ni
recopiée ni remplacée. Les modules compilés sont isolés dans un cache temporaire
du frontend, supprimé à la fin de chaque test. Le rendu React n'est pas testé.

Le POST Billing traverse un proxy HTTP de test vers le stub Express ; les routes
de prise en charge et de liaison passent par le vrai routeur backend et Prisma.
Les quatre scénarios sont couverts :

| Réponse du POST Billing | Résultat du GET Billing | Résultat attendu |
| --- | --- | --- |
| `200` | Un bon | Bon lié, log `CASH_VOUCHER_LINKED` et notification persistés |
| `409` | Un bon | Bon existant réutilisé et lié |
| `409` | Liste vide | Erreur `409` avec le message Billing original, sans liaison |
| `500` | Aucun GET effectué | Erreur propagée, sans liaison |

Les assertions vérifient aussi l'ordre des appels HTTP, les identifiants source
et entreprise, le JWT transmis, les montants et les comptes envoyés à Billing.
Le parcours testé utilise `financial-processing` puis `cash-voucher` ; il ne
passe pas par la route de création orchestrée décrite plus bas.

Dans ce parcours web, la prise en charge financière précède le POST Billing.
Un échec Billing laisse donc la demande en `IN_FINANCIAL_PROCESS`, avec son log
`FINANCIAL_PROCESSING_STARTED`, sans log de liaison ni notification. Le test
`409` sans bon vérifie que l'erreur de liaison `404` ne remplace pas le message
original. L'écran reconnaît les erreurs normalisées par le client API (`status`)
ainsi que les erreurs Axios (`response.status`).

Deux tests directs du contrôleur complètent ces scénarios :

- GET Billing `200` avec un bon : liaison persistée, logs
  `FINANCIAL_PROCESSING_STARTED` et `CASH_VOUCHER_LINKED`, notification en outbox.
  Une seconde liaison ne crée aucun doublon de log ou de notification.
- GET Billing `500` : réponse `503` du service, sans modification de la demande,
  sans log et sans notification. Le message générique correspond au comportement
  actuel de `findBillingVouchers`.

### Création orchestrée : `POST /:id/create-cash-voucher`

Corps : `{ paymentMethod: 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'CARTE', treasuryAccountId }`.
Le service construit le bon depuis la demande, appelle `POST /api/cash-vouchers`
puis lie le bon dans une seule transaction Prisma.

1. Demande rechargée ; statut hors `APPROVED` / `IN_FINANCIAL_PROCESS` → `409`.
2. POST Billing. `409` → `GET ?sourceId=` pour reprendre un bon existant.
   Tout autre échec, ou `409` sans bon retrouvé → `502` avec le message Billing
   original, sans transition, sans log, sans notification.
3. Bon trouvé → transaction : `APPROVED → IN_FINANCIAL_PROCESS` (si besoin, avec
   log `FINANCIAL_PROCESSING_STARTED`), puis `IN_FINANCIAL_PROCESS →
   CASH_VOUCHER_CREATED` (ou `DISBURSED` si le bon est décaissé), log
   `CASH_VOUCHER_LINKED`, liaison `cashVoucherId` / `cashVoucherNumber`.
4. `200` avec la demande à jour.

Si la transaction échoue après un POST réussi, le bon reste orphelin dans Billing
mais la demande reste `APPROVED` : une nouvelle tentative reçoit `409` et
rattrape le bon via le GET.

Tests : `test/integration/createCashVoucher.test.ts` (Billing `200`, `409` + bon,
`409` + bon décaissé depuis `IN_FINANCIAL_PROCESS`, `409` sans bon, `500`).

### Dépréciation : `POST /:id/cash-voucher` (`linkCashVoucher`)

> **Déprécié.** Utiliser `POST /:id/create-cash-voucher`. `linkCashVoucher`
> obligeait le client à orchestrer lui-même `financial-processing`, le POST
> Billing, la reprise sur `409` et la liaison. La route et son code restent
> inchangés pendant la migration des clients (le web l'utilise encore) et
> seront retirés une fois tous les écrans migrés.
