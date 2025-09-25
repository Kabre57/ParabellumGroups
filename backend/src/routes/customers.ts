import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  validateCustomer
} from '../controllers/customerController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD pour les clients
router.get('/', 
  requirePermission('customers.read'),
  auditLog('READ', 'CUSTOMERS'),
  getCustomers
);

router.get('/:id', 
  requirePermission('customers.read'),
  auditLog('READ', 'CUSTOMER'),
  getCustomerById
);

router.post('/', 
  requirePermission('customers.create'),
  validateCustomer,
  auditLog('CREATE', 'CUSTOMER'),
  createCustomer
);

router.put('/:id', 
  requirePermission('customers.update'),
  validateCustomer,
  auditLog('UPDATE', 'CUSTOMER'),
  updateCustomer
);

router.delete('/:id', 
  requirePermission('customers.delete'),
  auditLog('DELETE', 'CUSTOMER'),
  deleteCustomer
);

export default router;