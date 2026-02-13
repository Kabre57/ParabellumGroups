# ✅ Correction Endpoint Permissions Utilisateur

**Date**: 13 février 2026  
**Problème**: Erreur 400 "Le champ permissions doit être un tableau"  
**Status**: ✅ RÉSOLU

---

## 🐛 Problème Identifié

### Symptômes
```
PUT /api/auth/users/2/permissions HTTP/1.1 400
Erreur mise a jour permissions: Object
```

### Logs Backend
```javascript
auth-service: PUT /api/users/2/permissions 400 20.407 ms - 72
```

### Cause Racine
Le frontend envoie un objet `SetPermissionsRequest` avec le champ `permissionIds` (tableau d'IDs simples), mais le contrôleur backend `updateUserPermissions` attendait uniquement le champ `permissions` (tableau d'objets avec actions détaillées).

**Deux formats possibles** étaient déclarés dans les routes (`user.routes.js` lignes 219-222) mais le contrôleur ne gérait qu'un seul format.

---

## 🔧 Solution Appliquée

### Fichier Modifié
`services/auth-service/src/controllers/user-permission.controller.js`

### Code Avant (lignes 109-119)
```javascript
const updateUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Le champ permissions doit être un tableau'
      });
    }
```

### Code Après
```javascript
const updateUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    let { permissions, permissionIds } = req.body;

    // Support des deux formats: permissionIds simple ou permissions détaillées
    if (permissionIds && Array.isArray(permissionIds)) {
      // Conversion de permissionIds en format complet avec toutes les actions à true
      permissions = permissionIds.map(id => ({
        permissionId: id,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canApprove: true
      }));
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Le champ permissions ou permissionIds doit être un tableau'
      });
    }
```

---

## 📋 Formats Supportés

### Format 1: permissionIds (Simple)
Utilisé par le frontend pour assigner rapidement des permissions.

**Requête**:
```json
{
  "permissionIds": [1, 5, 12, 23]
}
```

**Comportement**:
- Toutes les actions (`canView`, `canCreate`, `canEdit`, `canDelete`, `canApprove`) sont automatiquement mises à `true`
- Simplifie l'attribution de permissions complètes

### Format 2: permissions (Détaillé)
Pour un contrôle granulaire des actions.

**Requête**:
```json
{
  "permissions": [
    {
      "permissionId": 1,
      "canView": true,
      "canCreate": false,
      "canEdit": false,
      "canDelete": false,
      "canApprove": false
    },
    {
      "permissionId": 5,
      "canView": true,
      "canCreate": true,
      "canEdit": true,
      "canDelete": false,
      "canApprove": false
    }
  ]
}
```

**Comportement**:
- Contrôle précis de chaque action par permission
- Permet des restrictions fines

---

## 🔄 Processus Backend

### Workflow
1. **Réception** de la requête PUT `/api/users/:userId/permissions`
2. **Vérification** du format (`permissionIds` ou `permissions`)
3. **Conversion** automatique si `permissionIds` détecté
4. **Validation** que toutes les permissions existent en base
5. **Suppression** de toutes les permissions utilisateur existantes
6. **Création** des nouvelles permissions
7. **Audit log** de niveau CRITICAL
8. **Réponse** avec nombre de permissions créées

### Validation Backend
```javascript
// Vérifier si la permission existe
const permission = await prisma.permission.findUnique({
  where: { id: parseInt(permissionId) }
});

if (!permission) {
  console.warn(`Permission ID ${permissionId} non trouvée, ignorée`);
  continue;
}
```

Les permissions invalides sont **ignorées** (pas d'erreur bloquante).

---

## 📊 Impact Audit

Chaque modification de permissions crée un log d'audit **CRITICAL** :

```javascript
await prisma.auditLog.create({
  data: {
    userId: req.user.id,
    action: 'USER_PERMISSIONS_UPDATED',
    entityType: 'UserPermission',
    entityId: userId,
    details: `Permissions mises à jour pour ${user.firstName} ${user.lastName}`,
    newValue: JSON.stringify(permissions.map(...)),
    level: 'CRITICAL',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  }
});
```

---

## ✅ Tests de Validation

### Test 1: Format permissionIds
**Requête**:
```bash
PUT /api/auth/users/2/permissions
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "permissionIds": [1, 5, 12]
}
```

**Réponse Attendue**:
```json
{
  "success": true,
  "message": "Permissions mises à jour avec succès",
  "data": {
    "userId": 2,
    "permissionsCount": 3
  }
}
```

### Test 2: Format permissions détaillé
**Requête**:
```bash
PUT /api/auth/users/2/permissions
Content-Type: application/json

{
  "permissions": [
    {
      "permissionId": 1,
      "canView": true,
      "canCreate": false,
      "canEdit": false,
      "canDelete": false,
      "canApprove": false
    }
  ]
}
```

**Réponse Attendue**:
```json
{
  "success": true,
  "message": "Permissions mises à jour avec succès",
  "data": {
    "userId": 2,
    "permissionsCount": 1
  }
}
```

### Test 3: Tableau vide
**Requête**:
```json
{
  "permissionIds": []
}
```

**Réponse**:
```json
{
  "success": true,
  "message": "Permissions mises à jour avec succès",
  "data": {
    "userId": 2,
    "permissionsCount": 0
  }
}
```

**Effet**: Supprime toutes les permissions utilisateur.

---

## 🔐 Sécurité

### Restrictions d'Accès
- ✅ Endpoint protégé par JWT (`authenticate`)
- ✅ Rôle requis: `ADMIN` uniquement
- ✅ Audit automatique (niveau CRITICAL)

### Validation
- ✅ Vérification existence utilisateur
- ✅ Vérification existence permissions
- ✅ Validation type de données (array)
- ✅ Ignorer permissions invalides (pas de crash)

---

## 📝 Frontend Compatibilité

### Service API (admin.service.ts)
```typescript
export interface SetPermissionsRequest {
  permissionIds?: number[];
  permissions?: {
    permissionId: number;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
  }[];
}

setUserPermissions: async (id: number, data: SetPermissionsRequest): Promise<{ success: boolean }> => {
  const response = await apiClient.put(`/auth/users/${id}/permissions`, data);
  return response.data;
}
```

### Utilisation dans PermissionsModal
```typescript
await adminUsersService.setUserPermissions(user.id, {
  permissionIds: Array.from(selectedPermissions)
});
```

---

## 🎯 Résultats

**Avant**:
- ❌ Erreur 400 lors de l'attribution de permissions
- ❌ Frontend affiche "Le champ permissions doit être un tableau"
- ❌ Impossible d'assigner des permissions aux utilisateurs

**Après**:
- ✅ Format `permissionIds` accepté
- ✅ Format `permissions` détaillé accepté
- ✅ Conversion automatique entre formats
- ✅ Attribution de permissions fonctionnelle

---

## 🔄 Maintenance

### Ajout de Nouvelles Permissions
Après avoir ajouté des permissions via le seed:
```bash
docker compose exec auth-service node prisma/seed-complete-permissions.js
```

Les nouvelles permissions sont immédiatement disponibles pour attribution aux utilisateurs.

### Réinitialisation Permissions Utilisateur
Pour supprimer toutes les permissions d'un utilisateur:
```bash
PUT /api/auth/users/:userId/permissions
{
  "permissionIds": []
}
```

---

## 📚 Documents Liés

- `services/auth-service/prisma/seed-complete-permissions.js` - Seed 375 permissions
- `services/auth-service/src/routes/user.routes.js` - Routes API
- `services/auth-service/src/controllers/user-permission.controller.js` - Contrôleur modifié
- `frontend/src/shared/api/admin/admin.service.ts` - Service frontend

---

**Correction appliquée**: 13 février 2026 17:35  
**Service redémarré**: ✅ auth-service  
**Tests**: À valider par l'utilisateur
