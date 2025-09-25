import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getContracts,
  getContractById,
  createContract,
  updateContract,
  terminateContract,
  validateContract
} from '../controllers/contractController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD pour les contrats
router.get('/', 
  requirePermission('contracts.read'),
  auditLog('READ', 'CONTRACTS'),
  getContracts
);

router.get('/:id', 
  requirePermission('contracts.read'),
  auditLog('READ', 'CONTRACT'),
  getContractById
);

router.post('/', 
  requirePermission('contracts.create'),
  validateContract,
  auditLog('CREATE', 'CONTRACT'),
  createContract
);

router.put('/:id', 
  requirePermission('contracts.update'),
  validateContract,
  auditLog('UPDATE', 'CONTRACT'),
  updateContract
);

router.post('/:id/terminate', 
  requirePermission('contracts.update'),
  auditLog('TERMINATE', 'CONTRACT'),
  terminateContract
);

export default router;