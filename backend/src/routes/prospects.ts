import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getProspects,
  getProspectById,
  createProspect,
  updateProspect,
  deleteProspect,
  moveProspectStage,
  getProspectionStats,
  validateProspect
} from '../controllers/prospectController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes pour les statistiques
router.get('/stats', 
  requirePermission('prospects.read'),
  auditLog('READ', 'PROSPECTION_STATS'),
  getProspectionStats
);

// Routes CRUD pour les prospects
router.get('/', 
  requirePermission('prospects.read'),
  auditLog('READ', 'PROSPECTS'),
  getProspects
);

router.get('/:id', 
  requirePermission('prospects.read'),
  auditLog('READ', 'PROSPECT'),
  getProspectById
);

router.post('/', 
  requirePermission('prospects.create'),
  validateProspect,
  auditLog('CREATE', 'PROSPECT'),
  createProspect
);

router.put('/:id', 
  requirePermission('prospects.update'),
  validateProspect,
  auditLog('UPDATE', 'PROSPECT'),
  updateProspect
);

router.delete('/:id', 
  requirePermission('prospects.delete'),
  auditLog('DELETE', 'PROSPECT'),
  deleteProspect
);

router.post('/:id/move', 
  requirePermission('prospects.update'),
  auditLog('MOVE_STAGE', 'PROSPECT'),
  moveProspectStage
);

export default router;