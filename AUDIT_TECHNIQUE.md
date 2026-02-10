# Audit technique – ParabellumGroups

Date: 2026-02-10
Portee: monorepo `frontend/` + `services/`

## Synthese executive
Le monorepo couvre un ERP multi-domaines coherent en structure (gateway + 12 services + frontend), mais l’integration front/gateway est aujourd’hui instable (alias TS et services API incoherents, erreurs massives au type-check). Les aspects securite/observabilite existent mais presentent des risques en l’etat (JWT secrets en clair, logs sensibles, CORS dur, rate-limit en memoire). La documentation est riche mais en decalage avec le code et l’infra actuelle.

Impact principal:
- P0: build/type-check frontend casses, imports/exports casses, alias/structure API incoherents.
- P1: risques securite (tokens logges, secrets en repo, stockage localStorage), CORS statique, rate-limit memoire.
- P2: documentation et versions divergentes, qualite de code heterogene, manque d’uniformisation des responses.

## Inventaire stack et scripts
### Frontend
- Next.js: ^16.1.6 (package.json)
- React: ^19.0.0
- TypeScript: ^5.7.2
- Scripts: dev, build, start, lint, type-check

### Services
- API Gateway: Express + http-proxy-middleware, Jest tests
- Microservices (12): Node/Express, Prisma, PostgreSQL
- Notification service: TypeScript build tsc

### Infra (docker-compose)
- Postgres: 15-alpine (compose)
- Redis: alpine
- Ports services: 4001-4012

## Architecture et integration inter-services
### Gateway
- Entree: /api/* (app.use('/api', proxyRoutes))
- Services configures via SERVICES.* en .env / config.js.
- Routing declare dans services/api-gateway/routes/services/*.routes.js.

### Table de correspondance routes vers services (Gateway)
| Service | Route gateway | Rewrite principal | Notes |
|---|---|---|---|
| Auth | /auth/* | /api/auth/* + routes admin /users, /roles, /services, /permissions | Validation schemas sur login/register/refresh |
| Technical | /technical/* | /api/* | Routes directes /techniciens, /missions, /interventions, /rapports, /specialites, /materiel |
| Customers | /customers/* | /api/clients + mapping /contacts, /contrats, /interactions, /opportunites, /documents, /adresses, /secteurs | Routes directes /clients, /contacts, ... |
| Projects | /projects/* | /api/projets + mapping /projects/:id/tasks -> /api/taches?projetId=... |  |
| Procurement | /procurement/* | /api + mapping /orders -> /api/bons-commande, /requests -> /api/demandes-achat, /suppliers -> /api/fournisseurs |  |
| Billing | /billing/* | /api + mapping /invoices -> /factures, /quotes -> /devis, /payments -> /paiements | Logs console cote gateway |
| HR | /hr/* | /api + mapping /employees/:id/contracts -> /contracts?employeeId=... |  |
| Analytics | /analytics/* | /api/analytics + mapping /rapports, /kpis, /dashboards, /widgets, /overview |  |
| Communication | /communication/* | /api/* |  |
| Inventory | /inventory/* | /api/* |  |
| Notifications | /notifications/* | /api/notifications |  |
| Commercial | /commercial/* | /api/prospects |  |

### Constat d’integration frontend
- La structure reelle des services frontend est frontend/src/shared/api/<domain>, mais plusieurs imports utilisent @/shared/api/services/... (chemin inexistant). Cela casse le build/type-check.
- Le frontend expose plusieurs couches d’acces API (src/services/*, src/shared/api/*, src/shared/api/shared/client.ts), avec duplication de types et exports. Resultat: collisions d’exports (DetailResponse, ListResponse) et erreurs TS massives.

## Securite et authentification
Constats principaux:
- JWT secrets en clair dans repo (services/auth-service/.env, docker-compose.yml).
- Logs sensibles dans api-gateway/middleware/auth.js (headers complets + token preview).
- Tokens stockes en localStorage cote frontend (access + refresh). Vulnerable XSS.
- CORS hardcode (origin http://localhost:3000) et ignore ALLOWED_ORIGINS de config.js.
- config.JWT_SECRET fallback par defaut "your-secret-key".
- Rate-limit en memoire (express-rate-limit default store) non adapte a prod multi-instances.

## Donnees et Prisma
- 12 schemas Prisma (un par service).
- Aucun mecanisme de soft delete detecte dans les schemas.
- Auth schema contient donnees sensibles (SSN, CNPS, banque, etc.) en clair; pas de chiffrement ni masquage defini.
- Seeds presentes: auth-service, technical-service, customer-service.

## Fiabilite, observabilite et resilience
- Gateway: metrics Prometheus, tracing X-Correlation-ID, circuit breaker (middleware) en place.
- Absence de store Redis pour rate limiting global.
- Logging verbeux + potentiellement sensible (auth middleware).
- Pas d’evidence d’un standard global de structure de reponse (success/data/message varie selon services).

## Qualite de code et maintenabilite (frontend)
- Type-check bloque par de nombreuses erreurs (imports, types, API mismatch, duplicates).
- Erreurs recurrentes sur ListResponse vs tableaux (map/filter) et incompatibilites de payload.
- Alias tsconfig OK, mais structure API reelle differente des imports utilises.
- Duplications d’exports dans src/shared/api/*/index.ts, collisions avec types globaux.

## Execution des tests/lint/build
### Frontend
- npm run lint: ECHEC
  - "Invalid project directory provided, no such directory: .../frontend/lint" (Next lint)
- npm run type-check: ECHEC (erreurs TS massives)
- npm run build: ECHEC (Next/Turbopack, echec fetch Google Fonts)

### API Gateway
- npm test: ECHEC
  - Jest spawn EPERM (Windows permissions)

### Auth Service
- npm test: ECHEC
  - Jest spawn EPERM (Windows permissions)

### Customer Service
- npm test: ECHEC
  - jest non trouve
- npm run lint: ECHEC
  - eslint non trouve

### Notification Service
- npm run build: OK

## Ecarts documentation vs code
- README frontend indique Next 14.1.0 / Node >=18.0.0, mais package.json utilise Next 16.1.6 / Node >=18.20.0.
- DOCUMENTATION_TECHNIQUE indique Postgres 16, mais docker-compose utilise Postgres 15.
- README frontend cite un dossier src/shared/api/services/*, mais structure reelle est src/shared/api/<domain>.
- Certains services n’ont pas de README specifique (notification-service absent).

## Recommandations priorisees
### P0 (bloquantes)
1. **Stabiliser l’API frontend**: choisir une seule couche d’API (ex: src/shared/api) et supprimer les doublons. Corriger tous les imports @/shared/api/services/* vers les chemins existants. Resoudre les collisions d’exports (DetailResponse/ListResponse) dans les index.
2. **Corriger le type-check**: harmoniser les types ListResponse vs tableaux, ajuster les hooks et pages qui consomment les donnees. (Achats, Billing, Commercial, CRM, Technical, HR, hooks)
3. **Rendre le build deterministe**: eliminer la dependance au fetch Google Fonts en build (utiliser local font ou prefetch). Ajuster la config lint (next lint) pour eviter le path invalide.

### P1 (securite/infra)
1. **Supprimer secrets du repo**: deplacer JWT_SECRET et autres dans un vault/secret manager ou variables locales non versionnees.
2. **Supprimer logs sensibles** (tokens/headers complets) dans gateway.
3. **CORS dynamique** base sur ALLOWED_ORIGINS (config) et prevoir des origins prod.
4. **Rate limiting**: utiliser un store Redis (shared) et activer trustProxy si necessaire.
5. **Revoir stockage tokens**: preferer cookies httpOnly + secure, ou au minimum rotation refresh + protection XSS.

### P2 (qualite, doc, observabilite)
1. **Aligner documentation** (versions, structure des dossiers, ports, prerequis).
2. **Uniformiser les reponses API** (success, data, message, errors) entre services.
3. **Ajouter schema de validation** cote gateway pour plus de routes (actuellement limitees).
4. **Auditer donnees sensibles** dans Prisma (chiffrement, hashing, acces) et mettre en place policies.

## Tableau des gaps de tests
| Composant | Commande | Statut | Cause probable |
|---|---|---|---|
| Frontend | npm run lint | KO | Next lint interprete un path invalide ("/frontend/lint") |
| Frontend | npm run type-check | KO | erreurs TS et imports cassés |
| Frontend | npm run build | KO | fetch Google Fonts en build Turbopack |
| API Gateway | npm test | KO | Jest spawn EPERM (Windows) |
| Auth Service | npm test | KO | Jest spawn EPERM (Windows) |
| Customer Service | npm test | KO | jest non installe / deps manquantes |
| Customer Service | npm run lint | KO | eslint non installe / deps manquantes |
| Notification Service | npm run build | OK | - |
