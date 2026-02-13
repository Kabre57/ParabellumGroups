# PRD - Product Requirements Document
## Module Interventions Techniques & Dashboard Analytics
**Version**: 2.0  
**Date**: 12 Février 2026  
**Projet**: ParabellumGroups ERP  
**Status**: 🔍 En Analyse

---

## 📋 Table des Matières
1. [Analyse Situation Actuelle](#1-analyse-situation-actuelle)
2. [Bugs Critiques Identifiés](#2-bugs-critiques-identifiés)
3. [Nouvelles Fonctionnalités](#3-nouvelles-fonctionnalités)
4. [Nettoyage & Optimisation](#4-nettoyage--optimisation)
5. [Plan d'Implémentation](#5-plan-dimplémentation)
6. [Validation & Tests](#6-validation--tests)

---

## 1. Analyse Situation Actuelle

### 1.1. État du Module Interventions

**✅ Fonctionnalités Implémentées**
- Création intervention simplifiée (base seulement)
- Ajout techniciens post-création via modal
- Ajout matériel post-création via modal avec rapport existant
- Filtrage missions (exclut TERMINEE/ANNULEE)
- Validation stock en temps réel
- Toast feedback utilisateur
- Redirection automatique vers page détails

**❌ Bugs Identifiés**
1. **Migration Prisma non appliquée** - Colonne `role` manquante (✅ CORRIGÉ)
2. **Filtrage missions incomplet** - Ne vérifie pas si mission a déjà intervention
3. **Routes notifications 404** - Endpoint `/api/notifications` introuvable
4. **Bouton matériel grisé** - Lié à problème ajout technicien (✅ EN COURS)

**🔄 État des Services**
```
✅ technical-service : Opérationnel (migration appliquée)
✅ frontend : Opérationnel (restart en cours)
❌ notification-service : Routes manquantes
✅ api-gateway : Opérationnel
✅ postgres : Opérationnel
```

### 1.2. Architecture Actuelle

```
Frontend (Next.js 16)
├── Components
│   ├── CreateInterventionModal (simplifié)
│   ├── AddTechnicianModal (nouveau)
│   └── AddMaterielModal (nouveau)
│
├── Pages
│   ├── /interventions (liste)
│   └── /interventions/[id] (détails)
│
├── API Clients
│   ├── @/shared/api/shared/client (Axios)
│   └── @/shared/api/technical/* (Services)
│
└── Hooks
    └── useTechnical (React Query)

Backend
├── technical-service (Node.js 22 + Prisma)
│   ├── Routes
│   │   ├── GET /interventions
│   │   ├── POST /interventions
│   │   ├── POST /interventions/:id/techniciens ✨
│   │   └── POST /interventions/:id/materiel ✨
│   │
│   └── Controllers
│       ├── create (techniciens optionnels)
│       ├── addTechnicien (nouveau)
│       └── addMateriel (nouveau)
│
└── notification-service (TypeScript)
    └── Routes ⚠️ À CORRIGER
```

---

## 2. Bugs Critiques Identifiés

### 2.1. Bug #1: Migration Prisma Non Appliquée ✅ CORRIGÉ

**Symptôme**
```
PrismaClientKnownRequestError: 
The column `interventions_techniciens.role` does not exist in the current database.
```

**Cause**
Migration `20260212182206_add_role_to_intervention_technicien` en attente.

**Solution Appliquée**
```bash
docker compose exec technical-service npx prisma migrate deploy
```

**Status**: ✅ **CORRIGÉ**

---

### 2.2. Bug #2: Filtrage Missions Incomplet ⚠️ CRITIQUE

**Problème**
```
Actuellement:
- Filtre SEULEMENT par statut (exclut TERMINEE/ANNULEE)
- Ne vérifie PAS si mission a déjà intervention

Comportement souhaité:
- Exclure missions avec status TERMINEE/ANNULEE
- Exclure missions ayant déjà intervention (peu importe status)
```

**Impact**
- Permet création d'interventions multiples pour même mission
- Incohérence données
- Confusion utilisateur

**Solution Proposée**
```typescript
// frontend/src/components/technical/CreateInterventionModal.tsx

const { data: missions = [] } = useMissions({ pageSize: 100 });
const { data: interventions = [] } = useInterventions({ pageSize: 500 });

// Extraire missionIds ayant déjà intervention
const missionsAvecIntervention = new Set(
  interventions.map((i: any) => i.missionId).filter(Boolean)
);

// Filtrer missions
const availableMissions = missions.filter((mission: any) => {
  const isActive = mission.status !== 'TERMINEE' && mission.status !== 'ANNULEE';
  const hasNoIntervention = !missionsAvecIntervention.has(mission.id);
  return isActive && hasNoIntervention;
});
```

**Estimation**: 30 minutes  
**Priorité**: 🔴 HAUTE

---

### 2.3. Bug #3: Routes Notifications 404 ⚠️ IMPORTANT

**Symptôme**
```
GET http://localhost:3001/api/notifications 404 (Not Found)
```

**Impact**
- NotificationDropdown ne fonctionne pas
- Polling 30s génère erreurs répétées
- Logs encombrés

**Cause Probable**
Route `/api/notifications` non configurée dans `api-gateway` ou service notification non accessible.

**Solution Proposée**
1. Vérifier routes API Gateway:
   ```javascript
   // api-gateway/routes/notification.routes.js
   router.use('/notifications', proxy('http://notification-service:4012'));
   ```

2. Vérifier routes notification-service:
   ```typescript
   // notification-service/src/routes/notification.routes.ts
   router.get('/', notificationController.getUserNotifications);
   ```

3. Correction paramètre userId:
   ```typescript
   // Actuellement attend /notifications/:userId
   // Devrait lire userId depuis token JWT
   ```

**Estimation**: 1 heure  
**Priorité**: 🟡 MOYENNE

---

### 2.4. Bug #4: Bouton Matériel Grisé 🔄 EN COURS

**Symptôme**
Après ajout technicien, bouton "Ajouter Matériel" reste désactivé.

**Cause**
- Variable `firstTechnicienId` pas mise à jour après ajout
- React Query cache pas invalidé correctement

**Solution Appliquée**
```typescript
// Page détails - handleRefresh
const handleRefresh = () => {
  queryClient.invalidateQueries({ queryKey: ['intervention', interventionId] });
};
```

**Status**: ✅ **EN TEST** (après restart frontend)

---

## 3. Nouvelles Fonctionnalités

### 3.1. Dashboard Services Techniques 🎯 NOUVEAU

**Objectif**
Créer un tableau de bord complet pour le module Services Techniques avec visualisation graphique des données et métriques de performance.

#### 3.1.1. Wireframe Proposé

```
┌─────────────────────────────────────────────────────────────────┐
│  TABLEAU DE BORD - SERVICES TECHNIQUES                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────────┬──────────────────┬──────────┐
│ 📊 KPIs          │                  │                  │          │
├──────────────────┼──────────────────┼──────────────────┼──────────┤
│                  │                  │                  │          │
│  Interventions   │  Missions        │  Techniciens     │  Taux    │
│  Actives         │  En Cours        │  Disponibles     │  Réussite│
│                  │                  │                  │          │
│     24           │      8           │     15/20        │   94%    │
│                  │                  │                  │          │
└──────────────────┴──────────────────┴──────────────────┴──────────┘

┌──────────────────────────────────┬───────────────────────────────┐
│                                  │                               │
│  📈 RÉPARTITION MISSIONS         │  ⚡ PERFORMANCE MICROSERVICE │
│  (Graphe en Cercle)              │  (Graphe Linéaire)            │
│                                  │                               │
│         ┌─────┐                  │   Response Time (ms)          │
│     ┌───┤     ├───┐              │   ┌─────────────────────────┐ │
│   ┌─┤   │  45%│   ├─┐            │300│    •••••                │ │
│   │ │   │ EN  │   │ │            │200│ •••    •••              │ │
│   │ │   │COURS│   │ │            │100│       •    •            │ │
│   └─┤   │     │   ├─┘            │  0└─────────────────────────┘ │
│     └───┤     ├───┘              │    12h 14h 16h 18h 20h       │
│         └─────┘                  │                               │
│    • Planifiée: 25%              │  Avg: 180ms | P95: 290ms     │
│    • En cours:  45%              │  Uptime: 99.8%               │
│    • Terminée:  28%              │                               │
│    • Annulée:   2%               │                               │
│                                  │                               │
└──────────────────────────────────┴───────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  📋 INTERVENTIONS RÉCENTES                                       │
├────────┬────────────────┬──────────────┬──────────┬──────────────┤
│ Titre  │ Mission        │ Technicien   │ Status   │ Date         │
├────────┼────────────────┼──────────────┼──────────┼──────────────┤
│ Instal │ MISS-2024-001  │ J. Dupont    │ EN_COURS │ 12/02/2026   │
│ Maint. │ MISS-2024-002  │ M. Martin    │ PLANIFIEE│ 13/02/2026   │
│ Répara │ MISS-2024-003  │ L. Bernard   │ TERMINEE │ 11/02/2026   │
└────────┴────────────────┴──────────────┴──────────┴──────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  🔧 UTILISATION MATÉRIEL                                         │
├────────────────┬──────────────┬──────────────┬───────────────────┤
│ Matériel       │ Stock Total  │ Sorti        │ Disponible        │
├────────────────┼──────────────┼──────────────┼───────────────────┤
│ Câbles RJ45    │ 500          │ 350 (70%)    │ 150               │
│ Disjoncteurs   │ 200          │ 120 (60%)    │ 80                │
│ Testeurs       │ 50           │ 45 (90%)     │ 5 ⚠️              │
└────────────────┴──────────────┴──────────────┴───────────────────┘
```

#### 3.1.2. Composants Requis

**1. KPIs Cards (4x Cards)**
```typescript
interface DashboardStats {
  interventionsActives: number;
  missionsEnCours: number;
  techniciensDisponibles: { disponibles: number; total: number };
  tauxReussite: number;
}
```

**2. Graphe Missions (Doughnut Chart)**
```typescript
interface MissionsStats {
  planifiee: number;
  enCours: number;
  terminee: number;
  annulee: number;
}
```

**3. Graphe Performance Microservice (Line Chart)**
```typescript
interface PerformanceMetrics {
  timestamps: string[];
  responseTimes: number[];
  avgResponseTime: number;
  p95ResponseTime: number;
  uptime: number;
}
```

**4. Liste Interventions Récentes (Table)**
Affiche 10 dernières interventions avec:
- Titre
- Mission liée
- Technicien principal
- Status avec badge couleur
- Date début

**5. Utilisation Matériel (Table avec Progress Bars)**
```typescript
interface MaterielUsage {
  nom: string;
  stockTotal: number;
  quantiteSortie: number;
  quantiteDisponible: number;
  tauxUtilisation: number;
}
```

#### 3.1.3. APIs Nécessaires

**Backend - Nouveaux Endpoints**

```javascript
// technical-service/routes/dashboard.routes.js

router.get('/dashboard/stats', dashboardController.getStats);
router.get('/dashboard/missions-distribution', dashboardController.getMissionsDistribution);
router.get('/dashboard/recent-interventions', dashboardController.getRecentInterventions);
router.get('/dashboard/materiel-usage', dashboardController.getMaterielUsage);
router.get('/dashboard/performance-metrics', dashboardController.getPerformanceMetrics);
```

**Contrôleurs**

```javascript
// technical-service/controllers/dashboard.controller.js

exports.getStats = async (req, res) => {
  // KPIs: interventions actives, missions en cours, techniciens, taux réussite
  const [
    interventionsActives,
    missionsEnCours,
    technicienStats,
    tauxReussite
  ] = await Promise.all([
    prisma.intervention.count({
      where: { status: { in: ['PLANIFIEE', 'EN_COURS'] } }
    }),
    prisma.mission.count({
      where: { status: 'EN_COURS' }
    }),
    prisma.technicien.aggregate({
      _count: { _all: true },
      where: { status: 'AVAILABLE' }
    }),
    calculateSuccessRate() // Helper function
  ]);
  
  res.json({
    interventionsActives,
    missionsEnCours,
    techniciensDisponibles: {
      disponibles: technicienStats._count._all,
      total: await prisma.technicien.count()
    },
    tauxReussite
  });
};

exports.getMissionsDistribution = async (req, res) => {
  const distribution = await prisma.mission.groupBy({
    by: ['status'],
    _count: { _all: true }
  });
  
  res.json(distribution);
};

exports.getRecentInterventions = async (req, res) => {
  const interventions = await prisma.intervention.findMany({
    take: 10,
    orderBy: { dateDebut: 'desc' },
    include: {
      mission: { select: { numeroMission: true } },
      techniciens: {
        take: 1,
        include: {
          technicien: { select: { prenom: true, nom: true } }
        }
      }
    }
  });
  
  res.json(interventions);
};

exports.getMaterielUsage = async (req, res) => {
  const materielWithUsage = await prisma.materiel.findMany({
    include: {
      sorties: {
        where: { dateRetour: null }, // Matériel non retourné
        select: { quantite: true }
      }
    }
  });
  
  const usage = materielWithUsage.map(m => ({
    nom: m.nom,
    stockTotal: m.quantiteStock + sumSorties(m.sorties),
    quantiteSortie: sumSorties(m.sorties),
    quantiteDisponible: m.quantiteStock,
    tauxUtilisation: calculateUsageRate(m)
  }));
  
  res.json(usage);
};

exports.getPerformanceMetrics = async (req, res) => {
  // Métriques basées sur logs d'API Gateway ou monitoring système
  const metrics = await getServiceHealthMetrics('technical-service');
  
  res.json({
    timestamps: metrics.timestamps,
    responseTimes: metrics.responseTimes,
    avgResponseTime: metrics.avg,
    p95ResponseTime: metrics.p95,
    uptime: metrics.uptime
  });
};
```

#### 3.1.4. Frontend - Page Dashboard

```typescript
// frontend/app/(dashboard)/dashboard/technical/dashboard/page.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { technicalService } from '@/shared/api/technical';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from '@/components/ui/card';
import { 
  Doughnut, 
  Line 
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function TechnicalDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['technical-dashboard-stats'],
    queryFn: () => technicalService.getDashboardStats(),
    refetchInterval: 60000 // Refresh every minute
  });

  const { data: missionsDistribution } = useQuery({
    queryKey: ['technical-dashboard-missions'],
    queryFn: () => technicalService.getMissionsDistribution()
  });

  const { data: recentInterventions } = useQuery({
    queryKey: ['technical-dashboard-recent'],
    queryFn: () => technicalService.getRecentInterventions()
  });

  const { data: materielUsage } = useQuery({
    queryKey: ['technical-dashboard-materiel'],
    queryFn: () => technicalService.getMaterielUsage()
  });

  const { data: performance } = useQuery({
    queryKey: ['technical-dashboard-performance'],
    queryFn: () => technicalService.getPerformanceMetrics(),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Chart configurations
  const missionsChartData = {
    labels: ['Planifiée', 'En Cours', 'Terminée', 'Annulée'],
    datasets: [{
      data: [
        missionsDistribution?.PLANIFIEE || 0,
        missionsDistribution?.EN_COURS || 0,
        missionsDistribution?.TERMINEE || 0,
        missionsDistribution?.ANNULEE || 0
      ],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',  // Blue
        'rgba(251, 191, 36, 0.8)',  // Yellow
        'rgba(34, 197, 94, 0.8)',   // Green
        'rgba(239, 68, 68, 0.8)'    // Red
      ],
      borderWidth: 2
    }]
  };

  const performanceChartData = {
    labels: performance?.timestamps || [],
    datasets: [{
      label: 'Response Time (ms)',
      data: performance?.responseTimes || [],
      borderColor: 'rgba(59, 130, 246, 1)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4
    }]
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Tableau de Bord - Services Techniques</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Interventions Actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.interventionsActives || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Missions En Cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.missionsEnCours || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Techniciens Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {stats?.techniciensDisponibles.disponibles || 0}/
              {stats?.techniciensDisponibles.total || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Taux de Réussite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {stats?.tauxReussite || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Missions Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition des Missions</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div style={{ maxWidth: '400px', maxHeight: '400px' }}>
              <Doughnut data={missionsChartData} />
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Microservice</CardTitle>
          </CardHeader>
          <CardContent>
            <Line data={performanceChartData} />
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Moyenne:</span>
                <span className="font-bold ml-2">{performance?.avgResponseTime}ms</span>
              </div>
              <div>
                <span className="text-gray-600">P95:</span>
                <span className="font-bold ml-2">{performance?.p95ResponseTime}ms</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Uptime:</span>
                <span className="font-bold ml-2 text-green-600">{performance?.uptime}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Interventions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Interventions Récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Titre
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Mission
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Technicien
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentInterventions?.map((intervention: any) => (
                <tr key={intervention.id}>
                  <td className="px-4 py-4">{intervention.titre}</td>
                  <td className="px-4 py-4">{intervention.mission?.numeroMission}</td>
                  <td className="px-4 py-4">
                    {intervention.techniciens?.[0]?.technicien?.prenom}{' '}
                    {intervention.techniciens?.[0]?.technicien?.nom}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(intervention.status)}`}>
                      {intervention.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {new Date(intervention.dateDebut).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Material Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Utilisation Matériel</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Matériel
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stock Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sorti
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Disponible
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {materielUsage?.map((materiel: any, index: number) => (
                <tr key={index}>
                  <td className="px-4 py-4">{materiel.nom}</td>
                  <td className="px-4 py-4">{materiel.stockTotal}</td>
                  <td className="px-4 py-4">
                    {materiel.quantiteSortie} ({materiel.tauxUtilisation}%)
                  </td>
                  <td className="px-4 py-4">
                    <span className={materiel.quantiteDisponible < 10 ? 'text-red-600 font-bold' : ''}>
                      {materiel.quantiteDisponible}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'PLANIFIEE': return 'bg-blue-100 text-blue-800';
    case 'EN_COURS': return 'bg-yellow-100 text-yellow-800';
    case 'TERMINEE': return 'bg-green-100 text-green-800';
    case 'ANNULEE': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
```

#### 3.1.5. Dépendances

```json
{
  "dependencies": {
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0"
  }
}
```

**Installation**
```bash
docker compose exec frontend npm install chart.js react-chartjs-2
```

#### 3.1.6. Estimation

| Tâche | Temps | Priorité |
|-------|-------|----------|
| Backend - Routes & Contrôleurs Dashboard | 4h | HAUTE |
| Frontend - Page Dashboard | 3h | HAUTE |
| Graphes (Chart.js) | 2h | HAUTE |
| Tests & Ajustements | 1h | MOYENNE |
| **TOTAL** | **10h** | |

---

## 4. Nettoyage & Optimisation

### 4.1. Analyse Code Inutilisé

**Méthode**
1. Scan fichiers non importés
2. Identification composants obsolètes
3. Détection routes mortes (backend)
4. Vérification dépendances npm inutilisées

**Outils**
```bash
# Frontend
npx depcheck
npx ts-prune
npx next bundle-analyzer

# Backend
npm ls --depth=0 | grep UNMET
```

### 4.2. Fichiers Suspects Identifiés

**À Analyser**
```
frontend/
├── src/lib/api-client.ts (doublon avec @/shared/api/shared/client)
├── src/lib/api.ts (possiblement obsolète)
└── src/components/ui/* (vérifier composants non utilisés)

backend/
└── services/*/controllers/* (contrôleurs legacy)
```

**Recommandation**: Analyse approfondie requise avant suppression.

---

## 5. Plan d'Implémentation

### Phase 1: Corrections Bugs Critiques ⚡ URGENT
**Durée**: 2 heures

#### 5.1. Filtrage Missions (30 min)
- [ ] Modifier CreateInterventionModal
- [ ] Ajouter hook useInterventions
- [ ] Implémenter filtre missionIds
- [ ] Tester création intervention

#### 5.2. Routes Notifications (1h)
- [ ] Vérifier api-gateway routes
- [ ] Corriger notification-service routes
- [ ] Adapter endpoint pour JWT userId
- [ ] Tester NotificationDropdown

#### 5.3. Validation Tests (30 min)
- [ ] Tester création intervention
- [ ] Tester ajout technicien
- [ ] Tester ajout matériel
- [ ] Vérifier bouton matériel activé

---

### Phase 2: Dashboard Services Techniques 📊
**Durée**: 10 heures

#### 5.4. Backend Dashboard (4h)
- [ ] Créer dashboard.routes.js
- [ ] Créer dashboard.controller.js
- [ ] Implémenter getStats
- [ ] Implémenter getMissionsDistribution
- [ ] Implémenter getRecentInterventions
- [ ] Implémenter getMaterielUsage
- [ ] Implémenter getPerformanceMetrics (monitoring API Gateway)

#### 5.5. Frontend Dashboard (6h)
- [ ] Installer chart.js & react-chartjs-2
- [ ] Créer page dashboard/technical/dashboard/page.tsx
- [ ] Implémenter KPIs Cards (4x)
- [ ] Implémenter Doughnut Chart (Missions)
- [ ] Implémenter Line Chart (Performance)
- [ ] Implémenter Table Interventions Récentes
- [ ] Implémenter Table Utilisation Matériel
- [ ] Styling & Responsive
- [ ] Tests navigation

---

### Phase 3: Nettoyage & Optimisation 🧹
**Durée**: 4 heures

#### 5.6. Analyse & Documentation (2h)
- [ ] Exécuter depcheck frontend
- [ ] Exécuter depcheck backend (tous services)
- [ ] Lister fichiers non importés
- [ ] Documenter décisions (garder/supprimer)

#### 5.7. Nettoyage (2h)
- [ ] Supprimer fichiers obsolètes
- [ ] Supprimer dépendances inutilisées
- [ ] Mettre à jour imports
- [ ] Rebuild & tests complets

---

## 6. Validation & Tests

### 6.1. Tests Fonctionnels

#### Test Suite 1: Interventions (30 min)
- [ ] ✅ Créer intervention base
- [ ] ✅ Vérifier redirection page détails
- [ ] ✅ Ajouter technicien
- [ ] ✅ Vérifier bouton matériel activé
- [ ] ✅ Ajouter matériel
- [ ] ✅ Vérifier rapport matériel existant
- [ ] ✅ Vérifier décrément stock

#### Test Suite 2: Filtrage Missions (15 min)
- [ ] ✅ Créer mission PLANIFIEE
- [ ] ✅ Créer intervention sur mission
- [ ] ✅ Ouvrir modal nouvelle intervention
- [ ] ✅ Vérifier mission exclue de liste
- [ ] ✅ Créer mission TERMINEE
- [ ] ✅ Vérifier mission TERMINEE exclue

#### Test Suite 3: Notifications (15 min)
- [ ] ✅ Ouvrir dashboard
- [ ] ✅ Vérifier NotificationDropdown charge
- [ ] ✅ Vérifier absence erreurs 404
- [ ] ✅ Tester marquer notification lu
- [ ] ✅ Tester marquer toutes lues

#### Test Suite 4: Dashboard (30 min)
- [ ] ✅ Accéder /dashboard/technical/dashboard
- [ ] ✅ Vérifier KPIs affichés
- [ ] ✅ Vérifier graphe missions
- [ ] ✅ Vérifier graphe performance
- [ ] ✅ Vérifier table interventions
- [ ] ✅ Vérifier table matériel
- [ ] ✅ Tester refresh automatique (attendre 1 min)

### 6.2. Tests Performance

```bash
# Backend
ab -n 1000 -c 10 http://localhost:3001/api/technical/dashboard/stats

# Expected: 
# - Response Time < 200ms (avg)
# - P95 < 500ms
# - 0 errors

# Frontend
npm run build
npm run start
# Lighthouse Score > 90
```

### 6.3. Tests Sécurité

- [ ] Vérifier authentification JWT toutes routes
- [ ] Tester accès non autorisé dashboard
- [ ] Vérifier validation données entrantes
- [ ] Tester injection SQL (Prisma protège)
- [ ] Vérifier CORS configuration

---

## 7. Critères d'Acceptation

### 7.1. Bugs Critiques
✅ **ACCEPTÉ SI**:
- Migration Prisma appliquée
- Création intervention fonctionne sans erreur 500
- Ajout technicien fonctionne
- Ajout matériel fonctionne après ajout technicien
- Notifications chargent sans erreur 404
- Filtrage missions exclut celles avec intervention

### 7.2. Dashboard
✅ **ACCEPTÉ SI**:
- 4 KPIs affichés correctement
- Graphe missions en cercle fonctionne
- Graphe performance temps réel fonctionne
- Tables affichent données récentes
- Refresh automatique fonctionne (30s-60s)
- Responsive mobile/desktop
- Temps chargement < 2s

### 7.3. Performance
✅ **ACCEPTÉ SI**:
- API Dashboard stats < 200ms
- Frontend Lighthouse Score > 85
- Zero erreurs console navigateur
- Docker containers < 80% CPU
- PostgreSQL < 50% connections

---

## 8. Risques & Mitigation

### 8.1. Risques Identifiés

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Performance dégradée avec grandes données | 🔴 HAUT | MOYENNE | Pagination + cache Redis |
| Graphes lents avec Chart.js | 🟡 MOYEN | FAIBLE | Lazy loading + sample data |
| Migration Prisma échoue production | 🔴 HAUT | FAIBLE | Backup DB avant migration |
| Code inutilisé supprimé par erreur | 🟡 MOYEN | MOYENNE | Git branch + tests complets |
| Monitoring API Gateway manquant | 🟡 MOYEN | HAUTE | Mock data initialement |

### 8.2. Plan de Rollback

```bash
# Si problème après déploiement
git revert HEAD
docker compose down
docker compose up -d
docker compose exec technical-service npx prisma migrate resolve --rolled-back 20260212182206_add_role_to_intervention_technicien
```

---

## 9. Livrables

### 9.1. Code
- [ ] Backend: Routes & Contrôleurs Dashboard
- [ ] Frontend: Page Dashboard complète
- [ ] Corrections bugs (filtrage missions, notifications)
- [ ] Tests unitaires nouveaux endpoints
- [ ] Documentation API (Swagger/OpenAPI)

### 9.2. Documentation
- [ ] ✅ PRD (ce document)
- [ ] Guide utilisateur Dashboard
- [ ] Guide développeur Dashboard APIs
- [ ] Changelog détaillé
- [ ] Migration guide Prisma

### 9.3. Tests
- [ ] Suite tests fonctionnels (Playwright/Jest)
- [ ] Suite tests performance (k6/Apache Bench)
- [ ] Rapport tests sécurité (OWASP)

---

## 10. Timeline

```
Semaine 1 (12-16 Fév)
├── Jour 1 (12 Fév) ✅
│   ├── Analyse bugs
│   ├── Correction migration Prisma
│   └── Rédaction PRD
│
├── Jour 2 (13 Fév)
│   ├── Correction filtrage missions (30 min)
│   ├── Correction routes notifications (1h)
│   ├── Tests validations (30 min)
│   └── Backend Dashboard routes (4h)
│
├── Jour 3 (14 Fév)
│   ├── Frontend Dashboard KPIs (2h)
│   ├── Frontend Dashboard Graphes (3h)
│   └── Frontend Dashboard Tables (1h)
│
├── Jour 4 (15 Fév)
│   ├── Tests complets Dashboard (2h)
│   ├── Styling & Responsive (2h)
│   ├── Analyse code inutilisé (2h)
│   └── Documentation API (1h)
│
└── Jour 5 (16 Fév)
    ├── Nettoyage code (2h)
    ├── Tests performance (1h)
    ├── Tests sécurité (1h)
    ├── Revue code (1h)
    └── Déploiement production (1h)
```

**Durée Totale**: 5 jours  
**Effort Total**: ~25 heures

---

## 11. Décision Requise

### Options Proposées

**Option A: Implémentation Complète** ✅ RECOMMANDÉ
- Corrections bugs + Dashboard + Nettoyage
- Durée: 5 jours
- Risque: Faible

**Option B: Priorité Bugs Uniquement**
- Corrections bugs seulement
- Dashboard Phase 2
- Durée: 1 jour (bugs)
- Risque: Moyen (dashboard retardé)

**Option C: Dashboard Simplifié**
- Corrections bugs + Dashboard sans performance metrics
- Durée: 3 jours
- Risque: Faible

### Recommandation
🎯 **Option A** - Implémentation complète pour :
- Résoudre tous les bugs actuels
- Offrir dashboard complet pour utilisateurs
- Code propre et maintenable
- ROI maximal

---

## 12. Signatures & Approbation

| Rôle | Nom | Date | Signature |
|------|-----|------|-----------|
| Product Owner | | | |
| Tech Lead | | | |
| QA Lead | | | |

---

**Status Actuel**: 🟡 En Attente Validation  
**Prochaine Étape**: Approbation Option + Début Phase 1  
**Contact**: support@parabellum.com

---

**Fin du PRD - Version 2.0**
