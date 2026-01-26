# Analytics Service

Service de gestion des analytics, rapports, dashboards et KPIs.

## Port
4013

## Fonctionnalités

### Dashboards
- Création et gestion de tableaux de bord personnalisés
- Configuration de widgets
- Duplication de dashboards
- Définition de dashboard par défaut

### Widgets
- Types supportés: CHART, TABLE, KPI, MAP
- Positionnement dynamique
- Rafraîchissement automatique des données
- Configuration personnalisable

### Rapports
- Types: VENTES, FINANCES, RH, PROJETS, CUSTOM
- Formats: PDF, EXCEL, CSV
- Fréquences: QUOTIDIEN, HEBDO, MENSUEL, ANNUEL
- Exécution manuelle et planifiée
- Historique des exécutions

### KPIs
- Suivi des indicateurs de performance
- Calcul automatique des tendances (UP, DOWN, STABLE)
- Comparaison temporelle
- Analyse des variations

### Analytics
- Statistiques de ventes
- Statistiques de projets
- Statistiques RH
- Statistiques financières

## API Endpoints

### Dashboards
- POST /api/dashboards - Créer un dashboard
- GET /api/dashboards - Liste des dashboards
- GET /api/dashboards/:id - Détails d'un dashboard
- PUT /api/dashboards/:id - Modifier un dashboard
- DELETE /api/dashboards/:id - Supprimer un dashboard
- GET /api/dashboards/:id/data - Données du dashboard
- POST /api/dashboards/:id/duplicate - Dupliquer un dashboard
- PUT /api/dashboards/:id/set-default - Définir par défaut

### Widgets
- POST /api/widgets - Créer un widget
- GET /api/widgets?dashboardId=:id - Liste des widgets
- GET /api/widgets/:id - Détails d'un widget
- PUT /api/widgets/:id - Modifier un widget
- DELETE /api/widgets/:id - Supprimer un widget
- PUT /api/widgets/:id/position - Mettre à jour la position
- GET /api/widgets/:id/data - Données du widget
- POST /api/widgets/:id/refresh - Rafraîchir le widget

### Rapports
- POST /api/rapports - Créer un rapport
- GET /api/rapports - Liste des rapports
- GET /api/rapports/:id - Détails d'un rapport
- PUT /api/rapports/:id - Modifier un rapport
- DELETE /api/rapports/:id - Supprimer un rapport
- POST /api/rapports/:id/execute - Exécuter un rapport
- POST /api/rapports/:id/schedule - Planifier un rapport
- GET /api/rapports/:id/executions/:executionId/download - Télécharger un rapport
- GET /api/rapports/:id/history - Historique des exécutions

### KPIs
- POST /api/kpis - Créer un KPI
- GET /api/kpis - Liste des KPIs
- GET /api/kpis/:id - Détails d'un KPI
- PUT /api/kpis/:id - Modifier un KPI
- DELETE /api/kpis/:id - Supprimer un KPI
- POST /api/kpis/calculate - Calculer un KPI
- GET /api/kpis/:id/compare - Comparer des KPIs
- GET /api/kpis/trend - Tendance d'un KPI

### Analytics
- GET /api/analytics/sales - Statistiques de ventes
- GET /api/analytics/projects - Statistiques de projets
- GET /api/analytics/hr - Statistiques RH
- GET /api/analytics/finance - Statistiques financières

## Installation

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm start
```

## Variables d'environnement

```
PORT=4013
DATABASE_URL="postgresql://user:password@localhost:5432/analytics_db"
JWT_SECRET="votre_secret_jwt"
NODE_ENV="development"
```

## Utilitaires

- **chartGenerator.js** - Génération de graphiques (Line, Bar, Pie, Doughnut)
- **excelGenerator.js** - Génération de fichiers Excel
- **kpiCalculator.js** - Calculs statistiques pour KPIs
- **dataAggregator.js** - Agrégation et transformation de données
