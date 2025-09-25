import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updatePassword,
  getRoles,
  getServices,
  getUserPermissions,
  updateUserPermissions,
  validateUser,
  validateUserCreation,
  validatePasswordUpdate
} from '../controllers/userController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes utilitaires
router.get('/roles', getRoles);
router.get('/services', getServices);

// Routes CRUD pour les utilisateurs
router.get('/', 
  requirePermission('users.read'),
  auditLog('READ', 'USERS'),
  getUsers
);

router.get('/:id', 
  requirePermission('users.read'),
  auditLog('READ', 'USER'),
  getUserById
);

router.post('/', 
  requirePermission('users.create'),
  validateUserCreation,
  auditLog('CREATE', 'USER'),
  createUser
);

router.put('/:id', 
  requirePermission('users.update'),
  validateUser,
  auditLog('UPDATE', 'USER'),
  updateUser
);

router.delete('/:id', 
  requirePermission('users.delete'),
  auditLog('DELETE', 'USER'),
  deleteUser
);

router.patch('/:id/password', 
  validatePasswordUpdate,
  auditLog('UPDATE_PASSWORD', 'USER'),
  updatePassword
);

// Routes pour la gestion des permissions - CORRECTION
router.get('/:id/permissions', 
  requirePermission('users.manage_permissions'),
  auditLog('READ', 'USER_PERMISSIONS'),
  getUserPermissions
);

router.put('/:id/permissions', 
  requirePermission('users.manage_permissions'),
  auditLog('UPDATE', 'USER_PERMISSIONS'),
  updateUserPermissions
);

export default router;