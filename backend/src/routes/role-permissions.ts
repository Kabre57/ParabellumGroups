import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getRolePermissions,
  updateRolePermissions,
  validateRolePermission
} from '../controllers/rolePermissionController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

router.use(authenticateToken);

router.get('/', 
  requirePermission('users.manage_permissions'),
  auditLog('READ', 'ROLE_PERMISSIONS'),
  getRolePermissions
);

router.put('/:role', 
  requirePermission('users.manage_permissions'),
  validateRolePermission,
  auditLog('UPDATE', 'ROLE_PERMISSIONS'),
  updateRolePermissions
);

export default router;