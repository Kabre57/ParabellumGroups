import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  createRapportImage,
  getImagesByRapport,
  deleteRapportImage,
  validateRapportImage
} from '../controllers/rapportImageController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

router.use(authenticateToken);

router.post('/', 
  requirePermission('rapports.update'),
  validateRapportImage,
  auditLog('CREATE', 'RAPPORT_IMAGE'),
  createRapportImage
);

router.get('/rapport/:rapportId', 
  requirePermission('rapports.read'),
  auditLog('READ', 'RAPPORT_IMAGES'),
  getImagesByRapport
);

router.delete('/:id', 
  requirePermission('rapports.update'),
  auditLog('DELETE', 'RAPPORT_IMAGE'),
  deleteRapportImage
);

export default router;