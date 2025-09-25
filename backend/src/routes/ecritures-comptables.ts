import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  createEcritureComptable,
  getAllEcrituresComptables,
  getEcritureComptableById,
  validateEcritureComptable
} from '../controllers/ecritureComptableController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

router.use(authenticateToken);

router.get('/', 
  requirePermission('reports.financial'),
  auditLog('READ', 'ECRITURES_COMPTABLES'),
  getAllEcrituresComptables
);

router.get('/:id', 
  requirePermission('reports.financial'),
  auditLog('READ', 'ECRITURE_COMPTABLE'),
  getEcritureComptableById
);

router.post('/', 
  requirePermission('reports.financial'),
  validateEcritureComptable,
  auditLog('CREATE', 'ECRITURE_COMPTABLE'),
  createEcritureComptable
);

export default router;