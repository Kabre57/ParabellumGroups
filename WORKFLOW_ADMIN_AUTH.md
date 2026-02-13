# Workflow Admin : Utilisateurs, Rôles, Services, Permissions

## Architecture globale

```mermaid
flowchart TB
    subgraph frontend [Frontend Next.js]
        UsersPage[Users Page]
        RolesPage[Roles Page]
        ServicesPage[Services Page]
        PermissionsPage[Permissions Page]
    end
    
    subgraph api [API Gateway]
        Gateway["/api"]
    end
    
    subgraph auth [auth-service]
        AuthRoutes[/auth/*]
        UserRoutes[/api/users]
        RoleRoutes[/api/roles]
        ServiceRoutes[/api/services]
        PermissionRoutes[/api/permissions]
    end
    
    UsersPage -->|GET/POST/PUT/DELETE| Gateway
    RolesPage --> Gateway
    ServicesPage --> Gateway
    PermissionsPage --> Gateway
    
    Gateway --> AuthRoutes
    Gateway --> UserRoutes
    Gateway --> RoleRoutes
    Gateway --> ServiceRoutes
    Gateway --> PermissionRoutes
```

---

## 1. Flux de routage (API Gateway → auth-service)

| Chemin frontend | Rèécriture Gateway | Route auth-service |
|-----------------|-------------------|---------------------|
| `/api/users` | → `/api/users` | auth-service:4001 |
| `/api/roles` | → `/api/roles` | auth-service:4001 |
| `/api/services` | → `/api/services` | auth-service:4001 |
| `/api/permissions` | → `/api/permissions` | auth-service:4001 |
| `/api/auth/login` | → `/api/auth/login` | auth-service:4001 |
| `/api/auth/refresh` | → `/api/auth/refresh` | auth-service:4001 |

Le gateway applique l'authentification JWT sur toutes les routes sauf `/auth/login`, `/auth/register`, `/auth/refresh`.

---

## 2. Services frontend (admin.service.ts)

Le frontend utilise `adminUsersService`, `adminRolesService`, `adminServicesService`, `adminPermissionsService` qui appellent l’`apiClient` partagé :

- **adminUsersService** : `getUsers`, `getUser`, `createUser`, `updateUser`, `deleteUser`, `activateUser`, `deactivateUser`, `getUserPermissions`, `updateUserPermissions`
- **adminRolesService** : `getRoles`, `getRole`, `createRole`, `updateRole`, `deleteRole`, `getRolePermissions`, `setRolePermissions`
- **adminServicesService** : `getServices`, `getService`, `createService`, `updateService`, `deleteService`
- **adminPermissionsService** : `getPermissions`, `getPermission`, `createPermission`, `updatePermission`, `deletePermission`, `getPermissionCategories`

Tous les appels passent par `/auth/...` (ex. `/auth/users`, `/auth/roles`).

---

## 3. Pages frontend et APIs utilisées

| Page | Route | Services / APIs |
|------|-------|-----------------|
| **Utilisateurs** | `/dashboard/admin/users` | `adminUsersService.getUsers()`, `createUser()`, `updateUser()`, `deleteUser()`, `activateUser()`, `deactivateUser()` ; `adminRolesService.getRoles()` |
| **Rôles** | `/dashboard/admin/roles` | `adminRolesService` |
| **Gestion Rôles** | `/dashboard/admin/roles-management` | `adminRolesService.getRoles()`, `deleteRole()` |
| **Services** | `/dashboard/admin/services` | `adminServicesService` |
| **Permissions** | `/dashboard/admin/permissions` | `adminPermissionsService` |

---

## 4. Workflow auth-service

### 4.1 Authentification

1. **Login** : `POST /api/auth/login` → vérification email/mot de passe → JWT (accessToken + refreshToken)
2. **Refresh** : `POST /api/auth/refresh` → renouvellement du token à partir du refreshToken
3. Toutes les autres routes exigent `Authorization: Bearer <token>`

### 4.2 Contrôle d’accès (middleware)

- **authenticate** : vérifie le JWT
- **checkRole(['ADMIN', 'GENERAL_DIRECTOR', ...])** : vérifie le rôle de l’utilisateur

### 4.3 Matrice des accès par route

| Route | Rôles autorisés |
|-------|-----------------|
| `GET /users` | ADMIN, GENERAL_DIRECTOR, SERVICE_MANAGER |
| `POST /users` | ADMIN, GENERAL_DIRECTOR |
| `PUT /users/:id` | ADMIN, GENERAL_DIRECTOR |
| `DELETE /users/:id` | ADMIN |
| `PATCH /users/:id/status` | ADMIN, GENERAL_DIRECTOR |
| `GET/PUT /users/:id/permissions` | ADMIN |
| `GET /roles` | Authentifié |
| `POST/PUT/DELETE /roles` | ADMIN |
| `GET /services` | Authentifié |
| `POST/PUT /services` | ADMIN, GENERAL_DIRECTOR |
| `DELETE /services` | ADMIN |
| `GET /permissions` | ADMIN, GENERAL_DIRECTOR |
| `POST/PUT/DELETE /permissions` | ADMIN |

---

## 5. Modèles de données (auth-service)

- **User** : id, email, password (hash), firstName, lastName, roleId, serviceId, isActive, ...
- **Role** : id, name, code, description, isSystem, isActive
- **Service** : id, name, code, description, parentId, managerId, isActive
- **Permission** : id, name, description, category
- **RolePermission** : liaison Role ↔ Permission (canView, canCreate, canEdit, canDelete, canApprove)
- **UserPermission** : permissions spécifiques par utilisateur (override du rôle)

---

## 6. Correction technique – Champ `role` dans InterventionTechnicien

**Problème :**  
L’ajout d’un technicien à une intervention échouait avec `Unknown argument 'role'` car le modèle Prisma `InterventionTechnicien` n’avait pas de champ `role`.

**Correction :**

1. **Schema Prisma** (`services/technical-service/prisma/schema.prisma`) : ajout du champ `role String? @default("Assistant")` dans le modèle `InterventionTechnicien`.

2. **Migration SQL** : exécuter le fichier `services/technical-service/prisma/migrations/add_role_intervention_technicien.sql` :

```bash
# Dans le conteneur technical-service ou avec psql
psql $DATABASE_URL -f prisma/migrations/add_role_intervention_technicien.sql
```

Ou manuellement :

```sql
ALTER TABLE interventions_techniciens 
ADD COLUMN IF NOT EXISTS role VARCHAR(255) DEFAULT 'Assistant';
```

3. **Reconstruire le service** : redémarrer le conteneur technical-service après la migration pour régénérer le client Prisma.
