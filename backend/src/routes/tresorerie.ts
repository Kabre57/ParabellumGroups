import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  createTresorerie,
  getAllTresorerie,
  getTresorerieById,
  validateTresorerie
} from '../controllers/tresorerieController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

router.use(authenticateToken);

router.get('/', 
  requirePermission('reports.financial'),
  auditLog('READ', 'TRESORERIE'),
  getAllTresorerie
);

router.get('/:id', 
  requirePermission('reports.financial'),
  auditLog('READ', 'FLUX_TRESORERIE'),
  getTresorerieById
);

router.post('/', 
  requirePermission('reports.financial'),
  validateTresorerie,
  auditLog('CREATE', 'FLUX_TRESORERIE'),
  createTresorerie
);

export default router;