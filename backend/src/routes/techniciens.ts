import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getTechniciens,
  getTechnicienById,
  updateTechnicien,
  deleteTechnicien,
  createTechnicienCombined,
  validateTechnicien
} from '../controllers/technicienController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD pour les techniciens
router.get('/', 
  requirePermission('techniciens.read'),
  auditLog('READ', 'TECHNICIENS'),
  getTechniciens
);

router.get('/:id', 
  requirePermission('techniciens.read'),
  auditLog('READ', 'TECHNICIEN'),
  getTechnicienById
);

// ✅ CORRECTION : Une seule route POST avec createTechnicienCombined
router.post('/', 
  requirePermission('techniciens.create'),
  validateTechnicien,
  auditLog('CREATE', 'TECHNICIEN'),
  createTechnicienCombined  // ✅ Fonction définie
);

router.put('/:id', 
  requirePermission('techniciens.update'),
  validateTechnicien,
  auditLog('UPDATE', 'TECHNICIEN'),
  updateTechnicien
);

router.delete('/:id', 
  requirePermission('techniciens.delete'),
  auditLog('DELETE', 'TECHNICIEN'),
  deleteTechnicien
);

export default router;