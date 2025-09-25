import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  createCompte,
  getAllComptes,
  getCompteById,
  updateCompte,
  deleteCompte,
  validateCompte
} from '../controllers/compteController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

router.use(authenticateToken);

router.get('/', 
  requirePermission('reports.financial'),
  auditLog('READ', 'COMPTES'),
  getAllComptes
);

router.get('/:id', 
  requirePermission('reports.financial'),
  auditLog('READ', 'COMPTE'),
  getCompteById
);

router.post('/', 
  requirePermission('reports.financial'),
  validateCompte,
  auditLog('CREATE', 'COMPTE'),
  createCompte
);

router.put('/:id', 
  requirePermission('reports.financial'),
  validateCompte,
  auditLog('UPDATE', 'COMPTE'),
  updateCompte
);

router.delete('/:id', 
  requirePermission('reports.financial'),
  auditLog('DELETE', 'COMPTE'),
  deleteCompte
);

export default router;