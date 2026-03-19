# Guide admin technique

## 1. Objectif

Ce document s'adresse à l'administrateur applicatif, au responsable technique et à toute personne en charge :

- du déploiement ;
- des comptes et permissions ;
- du diagnostic fonctionnel ;
- du suivi qualité ;
- de la maintenance du périmètre ERP.

## 2. Architecture résumée

### Frontend

- `frontend/`
- `Next.js`
- navigation conditionnée par permissions ;
- providers d'authentification et de requêtes ;
- routes protégées sous `frontend/app/(dashboard)/dashboard`.

### API Gateway

- `services/api-gateway/`
- point d'entrée unique vers les microservices ;
- injecte `X-User-Id`, `X-User-Role`, `X-User-Email` ;
- applique auth et permissions côté proxy.

### Infrastructure

- `PostgreSQL` pour les données ;
- `Redis` pour certaines fonctions transverses ;
- `MinIO` pour les photos et fichiers techniques ;
- `Nginx` en frontal.

## 3. Services présents

| Service | Port logique | Domaine |
|---|---:|---|
| Auth | 4001 | comptes, rôles, permissions, audit |
| Communication | 4002 | messages, templates, campagnes |
| Technique | 4003 | missions, interventions, ordres, rapports |
| Commercial | 4004 | prospection |
| Inventory | 4005 | articles, mouvements, réceptions |
| Projects | 4006 | projets, tâches, jalons |
| Procurement | 4007 | fournisseurs, demandes, commandes |
| Customers | 4008 | CRM |
| HR | 4009 | employés, congés, paie, prêts |
| Billing | 4010 | factures, devis, paiements |
| Analytics | 4011 | KPIs, widgets, rapports |
| Notifications | 4012 | notifications applicatives |

## 4. Données métier principales

### Auth

- `User`
- `Role`
- `Permission`
- `UserPermission`
- `PermissionChangeRequest`
- `AuditLog`

### CRM / commercial

- `Prospect`
- `Client`
- `Contact`
- `AdresseClient`
- `Contrat`
- `InteractionClient`
- `DocumentClient`
- `Opportunite`

### Technique

- `Specialite`
- `Technicien`
- `Mission`
- `Intervention`
- `Rapport`
- `OrdreMission`
- `Materiel`

### Achats / stock

- `Fournisseur`
- `BonCommande`
- `Article`
- `MouvementStock`
- `Reception`
- `Inventaire`

### RH

- `Employe`
- `Conge`
- `Contrat`
- `Payroll`
- `Loan`
- `Evaluation`

## 5. Modules et niveau de maturité

| Module | État | Commentaire |
|---|---|---|
| Auth / admin | Solide | workflow permissions et audit déjà présents |
| CRM | Solide | large couverture fonctionnelle |
| Technique | Solide | impression, PDF, photos, ordres, sync CRM |
| Achats / stock | Solide | procurement + inventory bien articulés |
| Projets | Bon | base fonctionnelle claire |
| Communication | Bon | messages et campagnes branchés |
| Facturation | Bon | quelques actions UI encore incomplètes |
| RH | Moyen à bon | core branché, évaluations encore simulées |
| Paramètres | Partiel | écran surtout statique |
| Comptabilité | Secondaire | routes présentes mais hors parcours principal |

## 6. Navigation officielle vs routes secondaires

### Parcours principaux

Les routes visibles dans la sidebar constituent le parcours recommandé.

### Routes secondaires / legacy identifiées

- `/dashboard/billing/*`
- `/dashboard/hr/*`
- `/dashboard/prospects`
- `/dashboard/quotes`
- `/dashboard/comptabilite/*`

### Recommandation

- ne pas documenter ces routes comme parcours standard utilisateur ;
- conserver les routes secondaires uniquement pour compatibilité ou migration ;
- rationaliser à terme pour limiter les doublons.

## 7. Permissions

### Familles principales

- `users.*`
- `roles.*`
- `permissions.*`
- `services.*`
- `prospects.*`
- `customers.*`
- `quotes.*`
- `invoices.*`
- `payments.*`
- `missions.*`
- `interventions.*`
- `mission_orders.*`
- `techniciens.*`
- `specialites.*`
- `materiel.*`
- `projects.*`
- `tasks.*`
- `purchase_orders.*`
- `suppliers.*`
- `inventory.*`
- `employees.*`
- `contracts.*`
- `leaves.*`
- `payroll.*`
- `loans.*`
- `evaluations.*`
- `messages.*`
- `emails.*`

### Points importants

- le menu dépend des permissions ;
- les boutons d'action dépendent aussi des permissions ;
- l'auth-service gère les surcharges utilisateur et les rôles ;
- le gateway et le frontend participent tous deux au filtrage.

## 8. Bilan de tests exécutés

Exécution réalisée le `16 mars 2026` dans l'espace de travail local.

### Vérifications passées

- `frontend`: `npm run type-check` -> OK
- `services/notification-service`: `npm run build` -> OK
- `services/auth-service`: `npm test -- --passWithNoTests` -> OK, mais aucune suite réelle détectée
- `services/api-gateway`: `npm test -- --passWithNoTests` -> OK, mais aucune suite réelle détectée

### Vérifications en échec ou limitées

- `services/auth-service`: `npm test` -> échec car aucune suite Jest trouvée
- `services/api-gateway`: `npm test` -> échec car aucune suite Jest trouvée
- `services/customer-service`: `npm test` -> échec, `jest` non disponible dans l'environnement courant
- `services/customer-service`: `npm run lint` -> échec, `eslint` non disponible dans l'environnement courant
- `frontend`: `npm run lint` -> échec, la commande `next lint` n'est pas compatible avec la configuration actuelle et interprète `lint` comme un répertoire

### Conclusion qualité

- les contrôles statiques les plus utiles disponibles passent sur le frontend et le service notifications ;
- le dépôt ne dispose pas encore d'une stratégie de test automatisé homogène ;
- plusieurs scripts `test` existent sans suite réelle ;
- plusieurs scripts de qualité dépendent d'outils non installés localement ou de commandes non adaptées à la version du framework.

## 9. Recommandations techniques immédiates

### Tests

- ajouter de vraies suites Jest ou Vitest pour les services qui déclarent `npm test` ;
- homogénéiser la présence de `jest`, `eslint` et configs associées dans tous les services qui exposent ces scripts ;
- remplacer ou corriger `next lint` selon la version de Next effectivement utilisée.

### Documentation

- conserver trois niveaux de docs :
  - manuel métier ;
  - manuel global ;
  - guide admin technique.

### Rationalisation produit

- fusionner progressivement les routes legacy avec les routes principales ;
- distinguer explicitement les écrans de production et les écrans de démonstration ;
- prioriser la finition RH, facturation et paramètres système.

## 10. Opérations d'administration courantes

### Créer un nouveau service

1. Ouvrir `Administration > Services`.
2. Créer le service.
3. Affecter un responsable si nécessaire.
4. Vérifier les utilisateurs rattachés.

### Créer un rôle

1. Ouvrir `Administration > Rôles`.
2. Créer un rôle personnalisé.
3. Affecter les permissions nécessaires.
4. Assigner le rôle aux utilisateurs.

### Gérer une exception de permissions

1. Ouvrir `Administration > Utilisateurs`.
2. Sélectionner l'utilisateur.
3. Ouvrir la gestion des permissions utilisateur.
4. Ajouter ou retirer les surcharges.

### Traiter une demande de permission

1. Ouvrir `Administration > Workflow d'approbation`.
2. Examiner la demande.
3. Approuver ou rejeter.
4. Vérifier le journal d'audit si nécessaire.

### Diagnostiquer un accès manquant

1. Vérifier le rôle.
2. Vérifier les permissions héritées.
3. Vérifier les overrides utilisateur.
4. Vérifier la visibilité de la route dans la sidebar.
5. Contrôler le gateway si l'API est accessible mais l'écran masqué.

## 11. Livrables documentaires disponibles

- manuel global : `docs/MANUEL_UTILISATEUR_APPLICATION.md`
- manuel métier : `docs/MANUEL_UTILISATEUR_METIER.md`
- guide admin technique : `docs/GUIDE_ADMIN_TECHNIQUE.md`

## 12. Limitation actuelle sur la sortie PDF

La génération automatique de PDF n'a pas été produite localement car l'environnement ne fournit pas de convertisseur installé :

- `pandoc` absent
- `wkhtmltopdf` absent
- `libreoffice` absent
- `chromium` absent

Le contenu est donc livré en Markdown structuré, prêt à être converti en PDF dès qu'un outil de conversion sera disponible.
