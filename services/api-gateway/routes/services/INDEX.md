# Index des Services - API Gateway

## Services configurés (12 microservices)

| Service | Fichier | Base Path | Port | Endpoints principaux |
|---------|---------|-----------|------|---------------------|
| **Auth** | `auth.routes.js` | `http://auth-service:4001` | 4001 | `/auth/login`, `/auth/register`, `/users`, `/roles`, `/permissions` |
| **Analytics** | `analytics.routes.js` | `http://analytics-service:4011` | 4011 | `/analytics/overview`, `/analytics/kpis`, `/analytics/dashboards` |
| **Technical** | `technical.routes.js` | `http://technical-service:4003` | 4003 | `/technical`, `/techniciens`, `/missions`, `/interventions` |
| **Customers** | `customers.routes.js` | `http://customer-service:4008` | 4008 | `/customers`, `/clients`, `/contacts`, `/contrats` |
| **Projects** | `projects.routes.js` | `http://project-service:4006` | 4006 | `/projects` → `/api/projets`, `/api/taches`, `/api/jalons` |
| **Procurement** | `procurement.routes.js` | `http://procurement-service:4007` | 4007 | `/procurement/orders` → `/api/bons-commande`, `/procurement/requests` → `/api/demandes-achat` |
| **Communication** | `communication.routes.js` | `http://communication-service:4002` | 4002 | `/communication` → `/api/messages`, `/api/campagnes` |
| **HR** | `hr.routes.js` | `http://hr-service:4009` | 4009 | `/hr/employees` → `/api/employes`, `/hr/leave-requests` → `/api/conges` |
| **Billing** | `billing.routes.js` | `http://billing-service:4010` | 4010 | `/billing/invoices` → `/api/factures`, `/billing/payments` → `/api/paiements` |
| **Commercial** | `commercial.routes.js` | `http://commercial-service:4004` | 4004 | `/commercial` → `/api/prospects` |
| **Inventory** | `inventory.routes.js` | `http://inventory-service:4005` | 4005 | `/inventory` → `/api/articles`, `/api/mouvements` |
| **Notifications** | `notifications.routes.js` | `http://notification-service:4012` | 4012 | `/notifications` → `/api/notifications` |

## Conventions de nommage

### Services en français
- **Projects**: projets, tâches, jalons
- **Procurement**: bons-commande, demandes-achat, fournisseurs
- **Communication**: messages, campagnes, templates
- **HR**: employes, conges, presences, evaluations
- **Billing**: factures, paiements, devis
- **Inventory**: articles, mouvements, inventaires, equipements

### Services en anglais
- **Commercial**: prospects
- **Notifications**: notifications

### Services mixtes
- **Customers**: clients (FR), contacts (FR), contrats (FR)
- **Technical**: techniciens (FR), missions (FR), interventions (FR)
- **HR**: contracts (EN), payroll (EN) + conges/employes (FR)

## Authentification

✅ **Tous les services nécessitent une authentification** sauf :
- `/auth/login` (POST)
- `/auth/register` (POST)
- `/auth/refresh` (POST)

## Path Rewrite - Exemples

### Auth Service
```
/auth/users → /api/users
/auth/roles → /api/roles
/users → /api/users
```

### Projects Service
```
/projects → /api/projets
/projects/:id/tasks → /api/taches?projetId=:id
```

### Procurement Service
```
/procurement/orders → /api/bons-commande
/procurement/requests → /api/demandes-achat
/procurement/suppliers → /api/fournisseurs
```

### Billing Service
```
/billing/invoices → /api/factures
/billing/quotes → /api/devis
/billing/payments → /api/paiements
```

### HR Service
```
/hr/employees → /api/employes
/hr/leave-requests → /api/conges
/hr/contracts → /contracts
/hr/payroll → /payroll
```

## Modification d'un service

1. Ouvrir `routes/services/nom-service.routes.js`
2. Modifier les routes dans `routes: [...]`
3. Sauvegarder (le service sera rechargé automatiquement)

## Ajout d'un nouveau service

1. Créer `routes/services/nouveau-service.routes.js`
2. Utiliser le template du README.md
3. Le service sera chargé automatiquement au prochain démarrage

## Debugging

Pour voir les routes chargées :
```bash
docker logs api-gateway --tail 50
```

Pour tester un endpoint :
```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:3001/api/analytics/overview
```
