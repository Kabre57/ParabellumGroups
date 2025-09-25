import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getSpecialites,
  getSpecialiteById,
  createSpecialite,
  updateSpecialite,
  deleteSpecialite,
  validateSpecialite
} from '../controllers/specialiteController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD pour les spécialités
router.get('/', 
  requirePermission('specialites.read'),
  auditLog('READ', 'SPECIALITES'),
  getSpecialites
);

router.get('/:id', 
  requirePermission('specialites.read'),
  auditLog('READ', 'SPECIALITE'),
  getSpecialiteById
);

router.post('/', 
  requirePermission('specialites.create'),
  validateSpecialite,
  auditLog('CREATE', 'SPECIALITE'),
  createSpecialite
);

router.put('/:id', 
  requirePermission('specialites.update'),
  validateSpecialite,
  auditLog('UPDATE', 'SPECIALITE'),
  updateSpecialite
);

router.delete('/:id', 
  requirePermission('specialites.delete'),
  auditLog('DELETE', 'SPECIALITE'),
  deleteSpecialite
);

export default router;