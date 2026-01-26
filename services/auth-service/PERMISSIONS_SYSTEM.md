# Système de Permissions Granulaires - Guide Complet

## 🎯 Vue d'ensemble

Le système de permissions de Parabellum ERP permet un contrôle d'accès fin à **3 niveaux** :

1. **Permissions de rôle** (RolePermission) - Par défaut selon le rôle
2. **Permissions utilisateur** (UserPermission) - Surcharge personnalisée par utilisateur
3. **Héritage intelligent** - Les permissions utilisateur remplacent celles du rôle

---

## 📊 Architecture des Permissions

### Modèles Prisma

```prisma
model Permission {
  id              Int
  name            String @unique  // Ex: "prospects.create"
  description     String?
  category        String          // Ex: "prospects"
  
  rolePermissions RolePermission[]
  userPermissions UserPermission[]
}

model RolePermission {
  id           Int
  role         UserRole
  permissionId Int
  canView      Boolean
  canCreate    Boolean
  canEdit      Boolean
  canDelete    Boolean
  canApprove   Boolean
}

model UserPermission {
  id           Int
  userId       Int
  permissionId Int
  granted      Boolean
}
```

---

## 🗂️ 21 Catégories de Permissions

| # | Catégorie | Nombre de permissions | Microservice |
|---|-----------|----------------------|--------------|
| 1 | dashboard | 3 | analytics-service |
| 2 | users | 7 | auth-service |
| 3 | prospects | 7 | commercial-service |
| 4 | customers | 5 | customer-service |
| 5 | quotes | 6 | commercial-service |
| 6 | invoices | 6 | billing-service |
| 7 | payments | 5 | billing-service |
| 8 | products | 4 | procurement-service |
| 9 | expenses | 5 | billing-service |
| 10 | reports | 4 | analytics-service |
| 11 | employees | 4 | hr-service |
| 12 | salaries | 5 | hr-service |
| 13 | contracts | 4 | hr-service |
| 14 | leaves | 5 | hr-service |
| 15 | loans | 5 | hr-service |
| 16 | specialites | 4 | technical-service |
| 17 | techniciens | 4 | technical-service |
| 18 | missions | 5 | technical-service |
| 19 | interventions | 5 | technical-service |
| 20 | projects | 5 | project-service |
| 21 | purchases | 5 | procurement-service |

**Total : ~100 permissions**

---

## 🚀 Initialisation

### 1. Appliquer la migration Prisma

```bash
cd services/auth-service
npm run prisma:generate
npx prisma migrate dev --name add_user_permissions
```

### 2. Initialiser les permissions

```bash
node scripts/seed-permissions.js
```

**Résultat attendu :**
```
🌱 Début de l'initialisation des permissions...

📁 Catégorie: Tableau de Bord
   ✅ dashboard.read
   ✅ dashboard.analytics
   ✅ dashboard.reports

📁 Catégorie: Utilisateurs
   ✅ users.create
   ✅ users.read
   ✅ users.update
   ✅ users.delete
   ✅ users.manage_permissions
   ✅ users.reset_password
   ✅ users.manage_roles

... (et ainsi de suite pour les 21 catégories)

📊 Résumé:
   ✅ Permissions créées: 100
   ⏭️  Permissions ignorées (existantes): 0
   📝 Total: 100

💾 Total de permissions en base de données: 100

✨ Initialisation terminée avec succès!
```

---

## 📡 API Endpoints

### Permissions

```http
# Récupérer toutes les permissions
GET /api/v1/permissions
Query: ?category=prospects

# Récupérer les catégories groupées
GET /api/v1/permissions/categories

# Créer une permission (ADMIN uniquement)
POST /api/v1/permissions
Body: {
  "name": "prospects.export",
  "description": "Exporter les prospects",
  "category": "prospects"
}

# Mettre à jour une permission
PUT /api/v1/permissions/:id

# Supprimer une permission
DELETE /api/v1/permissions/:id
```

### Permissions de Rôle

```http
# Récupérer les permissions d'un rôle
GET /api/v1/permissions/roles/:role
Exemple: GET /api/v1/permissions/roles/COMMERCIAL

# Mettre à jour une permission de rôle
PUT /api/v1/permissions/roles/:role/:permissionId
Body: {
  "canView": true,
  "canCreate": true,
  "canEdit": false,
  "canDelete": false,
  "canApprove": false
}

# Supprimer une permission de rôle
DELETE /api/v1/permissions/roles/:role/:permissionId
```

### Permissions Utilisateur

```http
# Récupérer les permissions d'un utilisateur
GET /api/v1/users/:userId/permissions

Réponse:
{
  "success": true,
  "data": {
    "userId": 5,
    "role": "COMMERCIAL",
    "permissions": [
      {
        "id": 15,
        "name": "prospects.create",
        "description": "Créer des prospects",
        "category": "prospects",
        "source": "role",
        "granted": true
      },
      {
        "id": 20,
        "name": "customers.read",
        "description": "Consulter les clients",
        "category": "customers",
        "source": "user",
        "granted": true
      }
    ],
    "stats": {
      "total": 15,
      "fromRole": 12,
      "fromUser": 3
    }
  }
}

# Mettre à jour les permissions d'un utilisateur
PUT /api/v1/users/:userId/permissions
Body: {
  "permissions": [
    "prospects.create",
    "prospects.read",
    "prospects.update",
    "customers.read"
  ]
}

# Vérifier si un utilisateur a une permission
GET /api/v1/users/:userId/permissions/check/:permissionName
Exemple: GET /api/v1/users/5/permissions/check/prospects.create

Réponse:
{
  "success": true,
  "data": {
    "hasPermission": true,
    "source": "role"  // ou "user" ou "none"
  }
}
```

---

## 🔒 Utilisation dans le Frontend

### 1. Hook useAuth amélioré

```typescript
// frontend/src/shared/hooks/useAuth.ts
import { useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];  // ← Liste des permissions
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  // Charger les permissions au login
  useEffect(() => {
    if (user) {
      loadUserPermissions(user.id);
    }
  }, [user]);

  const loadUserPermissions = async (userId: number) => {
    const response = await fetch(`/api/v1/users/${userId}/permissions`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    
    if (data.success) {
      const permNames = data.data.permissions
        .filter((p: any) => p.granted)
        .map((p: any) => p.name);
      setPermissions(permNames);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (user?.role === 'ADMIN') return true;  // Admin a tout
    return permissions.includes(permission);
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    if (user?.role === 'ADMIN') return true;
    return perms.some(p => permissions.includes(p));
  };

  const hasAllPermissions = (perms: string[]): boolean => {
    if (user?.role === 'ADMIN') return true;
    return perms.every(p => permissions.includes(p));
  };

  return {
    user,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN'
  };
}
```

### 2. Utilisation dans les composants

```tsx
import { useAuth } from '@/shared/hooks/useAuth';

export default function ProspectsPage() {
  const { hasPermission } = useAuth();

  return (
    <div>
      {hasPermission('prospects.create') && (
        <button onClick={createProspect}>
          Nouveau Prospect
        </button>
      )}

      {hasPermission('prospects.read') && (
        <ProspectList />
      )}

      {hasPermission('prospects.delete') && (
        <button onClick={deleteProspect}>
          Supprimer
        </button>
      )}
    </div>
  );
}
```

### 3. Protection de routes

```tsx
// frontend/app/(dashboard)/layout.tsx
import { useAuth } from '@/shared/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated]);

  return <>{children}</>;
}
```

---

## 🎨 Page de Gestion des Permissions

Interface à 3 panneaux inspirée du fichier de référence :

```
┌─────────────────────────────────────────────────────────────┐
│  GESTION DES PERMISSIONS                                     │
├──────────────┬──────────────────────────────────────────────┤
│              │                                               │
│  UTILISATEURS│           PERMISSIONS PAR CATÉGORIE          │
│              │                                               │
│  ┌─────────┐│  ┌──────────────────────────────────────┐    │
│  │ Search  ││  │ 📊 Dashboard                          │    │
│  └─────────┘│  │  ☐ dashboard.read                     │    │
│              │  │  ☐ dashboard.analytics                │    │
│  ○ Admin     │  │  ☐ dashboard.reports                 │    │
│  ● Jean D.   │  └──────────────────────────────────────┘    │
│  ○ Marie M.  │                                               │
│  ○ Paul L.   │  ┌──────────────────────────────────────┐    │
│              │  │ 🎯 Prospection Commerciale            │    │
│              │  │  ☑ prospects.create                   │    │
│              │  │  ☑ prospects.read                     │    │
│              │  │  ☑ prospects.update                   │    │
│              │  │  ☐ prospects.delete                   │    │
│              │  │  ☑ prospects.assign                   │    │
│              │  │  ☑ prospects.activities               │    │
│              │  │  ☐ prospects.convert                  │    │
│              │  └──────────────────────────────────────┘    │
│              │                                               │
│              │  ... (19 autres catégories)                  │
│              │                                               │
│              │  [Enregistrer les permissions]               │
└──────────────┴──────────────────────────────────────────────┘
```

---

## ✅ Checklist d'Implémentation

### Backend (auth-service)
- [x] Modèle UserPermission dans schema.prisma
- [x] Script seed-permissions.js
- [x] Controller user-permission.controller.js
- [x] Routes dans user.routes.js
- [x] Route categories dans permission.routes.js
- [ ] Migration Prisma appliquée
- [ ] Permissions initialisées en base

### Frontend
- [ ] Mettre à jour useAuth avec hasPermission()
- [ ] Créer la page /dashboard/admin/permissions
- [ ] Composant PermissionGrid (grille de checkboxes)
- [ ] Composant UserList (liste des utilisateurs)
- [ ] Sauvegarde en temps réel
- [ ] Indicateurs visuels (badges de comptage)

### Tests
- [ ] Tester GET /api/v1/permissions
- [ ] Tester GET /api/v1/permissions/categories
- [ ] Tester GET /api/v1/users/:id/permissions
- [ ] Tester PUT /api/v1/users/:id/permissions
- [ ] Tester l'interface de gestion
- [ ] Tester hasPermission() dans les composants

---

## 🔥 Commandes Rapides

```bash
# Démarrer auth-service
cd services/auth-service
npm run dev

# Initialiser les permissions
node scripts/seed-permissions.js

# Créer la migration
npx prisma migrate dev --name add_user_permissions

# Tester l'API
curl -X GET http://localhost:3001/api/v1/permissions/categories \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📚 Ressources

- [Documentation Prisma](https://www.prisma.io/docs)
- [Express Validator](https://express-validator.github.io/docs/)
- [JWT Authentication](https://jwt.io/)

---

**Prochaine étape : Implémenter la page frontend de gestion des permissions**
