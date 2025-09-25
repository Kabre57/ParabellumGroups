import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  validateSupplier
} from '../controllers/supplierController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

router.use(authenticateToken);

router.post('/', 
  requirePermission('suppliers.create'),
  validateSupplier,
  auditLog('CREATE', 'SUPPLIER'),
  createSupplier
);

router.get('/', 
  requirePermission('suppliers.read'),
  auditLog('READ', 'SUPPLIERS'),
  getAllSuppliers
);

// suppliers.ts - Ajouter les routes manquantes
router.get('/:id', 
  requirePermission('suppliers.read'),
  auditLog('READ', 'SUPPLIER'),
  getSupplierById
);

router.put('/:id', 
  requirePermission('suppliers.update'),
  validateSupplier,
  auditLog('UPDATE', 'SUPPLIER'),
  updateSupplier
);

router.delete('/:id', 
  requirePermission('suppliers.delete'),
  auditLog('DELETE', 'SUPPLIER'),
  deleteSupplier
);

export default router;