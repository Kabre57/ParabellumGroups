import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getRapports,
  getRapportById,
  createRapport,
  updateRapport,
  deleteRapport,
  validateRapport,
  uploadRapportImages
} from '../controllers/rapportController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD pour les rapports
router.get('/', 
  requirePermission('rapports.read'),
  auditLog('READ', 'RAPPORTS'),
  getRapports
);

router.get('/:id', 
  requirePermission('rapports.read'),
  auditLog('READ', 'RAPPORT'),
  getRapportById
);

router.post('/', 
  requirePermission('rapports.create'),
  validateRapport,
  auditLog('CREATE', 'RAPPORT'),
  createRapport
);

router.put('/:id', 
  requirePermission('rapports.update'),
  validateRapport,
  auditLog('UPDATE', 'RAPPORT'),
  updateRapport
);

router.delete('/:id', 
  requirePermission('rapports.delete'),
  auditLog('DELETE', 'RAPPORT'),
  deleteRapport
);

// Route pour upload d'images
router.post('/:id/images', 
  requirePermission('rapports.update'),
  auditLog('UPLOAD_IMAGES', 'RAPPORT'),
  uploadRapportImages
);

export default router;