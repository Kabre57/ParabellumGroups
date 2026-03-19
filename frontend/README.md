# 🎨 Parabellum Groups - FRONTEND

**Framework** : Next.js 16.1.6 avec App Router  
**Langage** : TypeScript 5.7.2  
**UI** : Tailwind CSS 3.4.16  
**Version** : 1.0.0  
**Statut** : ✅ Production Ready

---

## ⚡ DÉMARRAGE RAPIDE

### Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Créer le fichier de configuration
cp env.template .env

# 3. Démarrer le serveur de développement
npm run dev
```

**✅ Ouvrir** : http://localhost:3000

---

## 📋 PRÉ-REQUIS

| Logiciel | Version | Vérification |
|----------|---------|--------------|
| Node.js | >= 18.20.0 | `node --version` |
| npm | >= 9.0.0 | `npm --version` |
| Backend | En ligne | http://localhost:3001/api/health |

⚠️ **Le backend doit être démarré** avant le frontend !

---

## 🏗️ STRUCTURE DU PROJET

```
frontend/
├── app/                          ← Next.js 16 App Router
│   ├── (auth)/                   ← Routes publiques (login, register)
│   │   ├── login/
│   │   └── register/
│   │
│   ├── (dashboard)/              ← Routes protégées
│   │   ├── layout.tsx            ← Layout dashboard avec Sidebar
│   │   ├── dashboard/            ← Page d'accueil
│   │   ├── clients/              ← Module CRM
│   │   ├── projets/              ← Module Projets
│   │   ├── missions/             ← Module Missions
│   │   ├── rh/                   ← Module RH
│   │   ├── facturation/          ← Module Facturation
│   │   ├── achats/               ← Module Achats
│   │   └── analytics/            ← Module Analytics
│   │
│   ├── layout.tsx                ← Root layout avec providers
│   └── globals.css               ← Styles globaux Tailwind
│
├── src/
│   ├── components/               ← Composants React
│   │   ├── ui/                   ← Composants de base (15)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── spinner.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/               ← Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── UserMenu.tsx
│   │   │
│   │   ├── customers/            ← Composants métier CRM
│   │   ├── technical/            ← Composants métier Missions
│   │   ├── hr/                   ← Composants métier RH
│   │   ├── billing/              ← Composants métier Facturation
│   │   ├── projects/             ← Composants métier Projets
│   │   ├── procurement/          ← Composants métier Achats
│   │   ├── dashboard/            ← Composants dashboards
│   │   └── charts/               ← Composants graphiques
│   │
│   └── shared/                   ← Code partagé
│       ├── api/                  ← Services API
│       │   ├── client.ts         ← Client Axios centralisé
│       │   ├── types.ts          ← Types TypeScript API
│       │   └── services/         ← Services par microservice (9)
│       │       ├── auth.ts
│       │       ├── customers.ts
│       │       ├── projects.ts
│       │       ├── technical.ts
│       │       ├── hr.ts
│       │       ├── billing.ts
│       │       ├── analytics.ts
│       │       ├── procurement.ts
│       │       └── communication.ts
│       │
│       ├── context/              ← Contextes React
│       │   └── AuthContext.tsx   ← Authentification
│       │
│       ├── providers/            ← Providers
│       │   ├── QueryProvider.tsx ← React Query
│       │   └── ThemeProvider.tsx ← Dark mode
│       │
│       ├── utils/                ← Utilitaires
│       │   ├── cn.ts             ← Merge classes
│       │   ├── format.ts         ← Formatage dates/nombres
│       │   └── validation.ts     ← Schémas Zod
│       │
│       └── hooks/                ← Hooks custom
│           ├── useAuth.ts
│           └── useDebounce.ts
│
├── public/                       ← Assets statiques
│   ├── images/
│   └── icons/
│
├── Configuration
├── package.json                  ← Dépendances npm
├── tsconfig.json                 ← Configuration TypeScript
├── tailwind.config.js            ← Configuration Tailwind
├── next.config.js                ← Configuration Next.js
├── postcss.config.js             ← Configuration PostCSS
├── env.template                  ← Template fichier .env
│
└── Documentation
    ├── README.md                 ← Ce fichier
    ├── QUICK_START.md            ← Démarrage rapide
    └── LIVRAISON_FRONTEND.md     ← Résumé livraison
```

---

## 🎨 STACK TECHNOLOGIQUE

### Core Framework

| Package | Version | Utilisation |
|---------|---------|-------------|
| **next** | 14.1.0 | Framework React avec App Router |
| **react** | 18.2.0 | Bibliothèque UI |
| **typescript** | 5.3.3 | Typage statique |

### Styling & UI

| Package | Version | Utilisation |
|---------|---------|-------------|
| **tailwindcss** | 3.4.1 | Framework CSS utility-first |
| **lucide-react** | 0.309.0 | Icônes SVG |
| **class-variance-authority** | 0.7.0 | Variants de composants |
| **tailwind-merge** | 2.2.0 | Merge classes Tailwind |
| **clsx** | 2.1.0 | Merge classes conditionnelles |

### Data & State

| Package | Version | Utilisation |
|---------|---------|-------------|
| **@tanstack/react-query** | 5.17.19 | Gestion état serveur |
| **axios** | 1.6.5 | Client HTTP |

### Forms & Validation

| Package | Version | Utilisation |
|---------|---------|-------------|
| **react-hook-form** | 7.49.3 | Gestion formulaires |
| **zod** | 3.22.4 | Validation schémas |
| **@hookform/resolvers** | 3.3.4 | Intégration Zod + RHF |

### Charts & Visualization

| Package | Version | Utilisation |
|---------|---------|-------------|
| **chart.js** | 4.4.1 | Bibliothèque graphiques |
| **react-chartjs-2** | 5.2.0 | Wrapper React pour Chart.js |
| **recharts** | 2.10.4 | Graphiques composables |

### Utilities

| Package | Version | Utilisation |
|---------|---------|-------------|
| **date-fns** | 3.2.0 | Manipulation dates |
| **js-cookie** | 3.0.5 | Gestion cookies |
| **sonner** | 1.3.1 | Toast notifications |

---

## 🚀 SCRIPTS DISPONIBLES

```bash
# Développement
npm run dev          # Démarrer serveur développement (port 3000)

# Production
npm run build        # Build optimisé pour production
npm start            # Démarrer serveur production

# Qualité du code
npm run lint         # Linter ESLint
npm run type-check   # Vérification TypeScript (sans compilation)
```

---

## 🔌 INTÉGRATION BACKEND

### Services API Disponibles

Le frontend communique avec **9 microservices backend** via l'API Gateway :

| Service | Port | Service Frontend | Méthodes |
|---------|------|------------------|----------|
| API Gateway | 3001 | - | Point d'entrée unique |
| Auth Service | 4001 | `authService` | 6 |
| Customers Service | 4002 | `customersService` | 11 |
| Projects Service | 4003 | `projectsService` | 12 |
| Technical Service | 4006 | `technicalService` | 16 |
| HR Service | 4007 | `hrService` | 15 |
| Billing Service | 4008 | `billingService` | 13 |
| Analytics Service | 4009 | `analyticsService` | 11 |
| Procurement Service | 4004 | `procurementService` | 7 |

**Total** : 91+ méthodes API typées

### Exemple d'Utilisation

```typescript
import { customersService } from '@/shared/api/services/customers';

// Dans un composant
function CustomersList() {
  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersService.getCustomers({ page: 1, limit: 10 }),
  });

  if (isLoading) return <Spinner />;

  return (
    <Table>
      {data?.data.map(customer => (
        <TableRow key={customer.id}>
          <TableCell>{customer.customerNumber}</TableCell>
          <TableCell>{customer.name}</TableCell>
        </TableRow>
      ))}
    </Table>
  );
}
```

---

## 🎯 MODULES IMPLÉMENTÉS

### 1. Authentification (Auth)

**Pages** : Login, Register  
**Features** :
- ✅ Connexion avec email/password
- ✅ Inscription avec validation
- ✅ JWT automatique avec refresh token
- ✅ Protection routes
- ✅ Redirection après login

**Composants** :
- `AuthContext` : Gestion état authentification
- `useAuth()` : Hook pour accès user

---

### 2. Dashboard (Vue d'ensemble)

**Page** : `/dashboard`  
**Features** :
- ✅ Statistiques globales (CA, factures, missions, projets)
- ✅ Graphiques (CA mensuel, top clients)
- ✅ Alertes et notifications
- ✅ Activité récente

---

### 3. Clients (CRM)

**Pages** : `/dashboard/clients`, `/dashboard/clients/[id]`  
**Features** :
- ✅ Liste clients avec filtres (actif/inactif, recherche)
- ✅ Détails client (infos, projets, factures, statistiques)
- ✅ Pipeline prospects (Kanban 4 stages)
- ✅ Conversion prospect → client
- ✅ Numérotation auto `CUST-XXXXXX-XXX`

**Composants** :
- `CustomerForm` : Création/édition client
- `ProspectsList` : Pipeline commercial
- `CustomerStats` : Statistiques par client

---

### 4. Projets

**Pages** : `/dashboard/projets`, `/dashboard/projets/[id]`  
**Features** :
- ✅ Liste projets avec filtres (statut, client)
- ✅ Détails projet (infos, tâches, équipe, budget)
- ✅ Kanban tâches (3 colonnes : À faire, En cours, Terminé)
- ✅ Numérotation auto `PROJ-XXXXXX-XXX`

**Composants** :
- `TaskBoard` : Kanban drag & drop
- `ProjectForm` : Création/édition projet

---

### 5. Missions (Technique)

**Pages** : `/dashboard/missions`, `/dashboard/missions/[id]`  
**Features** :
- ✅ Liste missions avec filtres (statut, priorité, technicien)
- ✅ Détails mission (infos, technicien, matériel, historique)
- ✅ Affectation technicien
- ✅ Sortie matériel avec gestion stock
- ✅ Numérotation auto `MIS-XXXXXX-XXX`

**Composants** :
- `MissionForm` : Création/édition mission
- `TechnicianAssignment` : Affectation technicien
- `MaterielSortie` : Sortie matériel avec validation stock

---

### 6. RH (Ressources Humaines)

**Pages** : `/dashboard/rh`, `/dashboard/rh/employes`, `/dashboard/rh/employes/[id]`, `/dashboard/rh/conges`  
**Features** :
- ✅ Liste employés avec filtres (département, contrat)
- ✅ Détails employé (infos, contrat, paie, congés, prêts)
- ✅ Calcul salaire Côte d'Ivoire (CNPS, CNAM, FDFP, AT, IRPP)
- ✅ Gestion congés (demande, validation, solde)
- ✅ Gestion prêts

**Composants** :
- `SalaryCalculator` : Calculateur salaire CI complet
- `LeaveRequestForm` : Demande de congé

---

### 7. Facturation (Billing)

**Pages** : `/dashboard/facturation`, `/dashboard/facturation/factures`, `/dashboard/facturation/factures/[id]`, `/dashboard/facturation/paiements`  
**Features** :
- ✅ Liste factures avec filtres (statut, client, dates)
- ✅ Détails facture (lignes, TVA, total, paiements)
- ✅ Création facture avec ligne items dynamiques
- ✅ Enregistrement paiements avec allocation automatique
- ✅ Numérotation auto `INV-XXXXXX-XXX` et `PAY-XXXXXX-XXX`

**Composants** :
- `InvoiceForm` : Création facture avec lignes dynamiques
- `PaymentForm` : Enregistrement paiement

---

### 8. Achats (Procurement)

**Pages** : `/dashboard/achats`, `/dashboard/achats/commandes`, `/dashboard/achats/stock`  
**Features** :
- ✅ Liste commandes avec filtres (statut, fournisseur)
- ✅ Gestion stock avec alertes (stock bas, rupture)
- ✅ Numérotation auto `ORD-XXXXXX-XXX`

---

### 9. Analytics (Tableaux de bord)

**Page** : `/dashboard/analytics`  
**Features** :
- ✅ 5 dashboards spécialisés :
  - Overview : Vue d'ensemble globale
  - Financial : CA, factures, revenus
  - Technical : Missions, techniciens, matériel
  - HR : Employés, congés, paie
  - Customer : Clients, prospects, conversion
- ✅ 7 KPIs calculés en temps réel
- ✅ Graphiques interactifs (LineChart, BarChart, PieChart)
- ✅ Top 5 clients par CA
- ✅ Alertes automatiques (4 types)

**Composants** :
- `FinancialDashboard` : Dashboard financier
- `TechnicalDashboard` : Dashboard technique
- `HRDashboard` : Dashboard RH
- `CustomerDashboard` : Dashboard clients
- `LineChart`, `PieChart` : Composants graphiques réutilisables

---

## 🎨 DESIGN SYSTEM

### Palette de Couleurs

```css
:root {
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;
  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --muted: 210 40% 96.1%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
}
```

### Composants UI de Base

| Composant | Variants | Utilisation |
|-----------|----------|-------------|
| **Button** | default, destructive, outline, ghost, link | Actions utilisateur |
| **Badge** | default, success, warning, danger, outline | Statuts, tags |
| **Card** | - | Conteneurs de contenu |
| **Table** | - | Affichage données tabulaires |
| **Dialog** | - | Modales |
| **Spinner** | sm, md, lg | Loading states |
| **Alert** | default, info, success, warning, error | Messages |
| **Tabs** | - | Navigation dans page |

### Responsive Design

**Breakpoints** (Tailwind) :
- `sm` : 640px
- `md` : 768px
- `lg` : 1024px
- `xl` : 1280px
- `2xl` : 1400px

**Features** :
- ✅ Mobile-first design
- ✅ Sidebar collapsible sur mobile
- ✅ Tables scrollables horizontalement
- ✅ Grids adaptatifs (1 col mobile → 2-4 cols desktop)

---

## 🔐 SÉCURITÉ

### Authentification

**JWT avec Refresh Token** :
```typescript
// Intercepteur Axios - Ajout automatique token
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh automatique si 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) return apiClient(error.config);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Protection Routes

**Vérification dans layout dashboard** :
```typescript
const { isAuthenticated, isLoading } = useAuth();

useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    router.push(`/login?returnUrl=${pathname}`);
  }
}, [isAuthenticated, isLoading]);
```

### Validation Inputs

**Tous les formulaires avec Zod** :
```typescript
const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Minimum 6 caractères'),
});

const { register, handleSubmit } = useForm({
  resolver: zodResolver(schema),
});
```

---

## 📊 STATISTIQUES

### Code Source

- **Pages** : 25+
- **Composants UI** : 15
- **Composants métier** : 35+
- **Services API** : 9 (91+ méthodes)
- **Lignes de code** : ~12,000

### Technologies

- **React Components** : 50+
- **API Endpoints utilisés** : 91+
- **Types TypeScript** : 200+ lignes
- **Hooks custom** : 5+

---

## 🧪 TESTS (À IMPLÉMENTER)

### Tests Unitaires (Jest + React Testing Library)

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

**Exemple** :
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Tests E2E (Playwright)

```bash
npm install --save-dev @playwright/test
```

---

## 🚀 DÉPLOIEMENT

### Build Production

```bash
npm run build
npm start
```

### Variables d'Environnement

**Créer `.env.production`** :
```env
NEXT_PUBLIC_API_GATEWAY_URL=https://api.votredomaine.com
NEXT_PUBLIC_APP_NAME=Parabellum Groups
NODE_ENV=production
```

### Déploiement Vercel

```bash
# Installer Vercel CLI
npm install -g vercel

# Déployer
vercel

# Production
vercel --prod
```

### Déploiement Docker

**Dockerfile** :
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

**Build & Run** :
```bash
docker build -t parabellum-frontend .
docker run -p 3000:3000 parabellum-frontend
```

---

## 🐛 DÉPANNAGE

### Frontend ne démarre pas

**Problème** : `Module not found`

**Solution** :
```bash
rm -rf node_modules
npm install
```

---

### Erreurs TypeScript

**Problème** : `Cannot find module '@/...'`

**Vérifier** `tsconfig.json` :
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

### Backend non accessible

**Problème** : `Network Error` ou `Failed to fetch`

**Vérifications** :
1. Backend démarré : http://localhost:3001/api/health
2. Fichier `.env` existe et contient la bonne URL
3. CORS configuré côté backend

---

### Erreur Hydration

**Problème** : `Hydration failed`

**Causes courantes** :
- HTML différent entre serveur et client
- `localStorage` utilisé avant `useEffect`
- Composant client sans `'use client'`

**Solution** :
```typescript
'use client'; // Ajouter en haut du fichier

const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```

---

## 📚 RESSOURCES

### Documentation Officielle

- [Next.js 16](https://nextjs.org/docs)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TanStack Query](https://tanstack.com/query/latest/docs/react/overview)
- [React Hook Form](https://react-hook-form.com/get-started)
- [Zod](https://zod.dev/)

### Guides Projet

- [QUICK_START.md](QUICK_START.md) - Démarrage rapide
- [LIVRAISON_FRONTEND.md](LIVRAISON_FRONTEND.md) - Résumé livraison
- [../GUIDE_UTILISATION.md](../GUIDE_UTILISATION.md) - Guide utilisateur complet
- [../PROJET_COMPLET.md](../PROJET_COMPLET.md) - Vue d'ensemble projet

---

## 🤝 CONTRIBUTION

### Ajouter une Page

1. **Créer le fichier** :
   ```
   app/(dashboard)/dashboard/mon-module/page.tsx
   ```

2. **Implémenter** :
   ```typescript
   'use client';
   
   export default function MonModulePage() {
     return <div>Mon module</div>;
   }
   ```

3. **Ajouter à la sidebar** :
   ```typescript
   // src/components/layout/Sidebar.tsx
   const menuItems = [
     // ...
     { label: 'Mon Module', href: '/dashboard/mon-module', icon: Icon },
   ];
   ```

---

### Ajouter un Service API

1. **Créer le service** :
   ```typescript
   // src/shared/api/services/mon-service.ts
   import { apiClient } from '../client';
   
   class MonService {
     async getData() {
       const response = await apiClient.get('/api/mon-endpoint');
       return response.data;
     }
   }
   
   export const monService = new MonService();
   ```

2. **Utiliser dans un composant** :
   ```typescript
   import { useQuery } from '@tanstack/react-query';
   import { monService } from '@/shared/api/services/mon-service';
   
   const { data } = useQuery({
     queryKey: ['monService'],
     queryFn: () => monService.getData(),
   });
   ```

---

## ✅ CHECKLIST POST-INSTALLATION

- [ ] `npm install` terminé sans erreur
- [ ] Fichier `.env` créé depuis `env.template`
- [ ] Backend démarré et accessible (http://localhost:3001/api/health)
- [ ] `npm run dev` démarre sans erreur
- [ ] Page login accessible (http://localhost:3000)
- [ ] Connexion réussie
- [ ] Dashboard accessible
- [ ] Tous les modules visibles dans sidebar

---

## 📞 SUPPORT

### En Cas de Problème

1. **Vérifier les logs** :
   - Console navigateur (F12 → Console)
   - Terminal où tourne `npm run dev`

2. **Vérifier le backend** :
   ```bash
   # Depuis parabellum-erp/
   .\test-services.ps1
   ```

3. **Consulter la documentation** :
   - [QUICK_START.md](QUICK_START.md)
   - [../INSTALLATION_COMPLETE.md](../INSTALLATION_COMPLETE.md)

---

**🎉 Frontend Parabellum Groups - Production Ready !**

_Documentation complète - Frontend Next.js 16 - Version 1.0.0 - Mars 2026_ ✨
