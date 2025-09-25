import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  createRecurringInvoice,
  getAllRecurringInvoices,
  validateRecurringInvoice
} from '../controllers/recurringInvoiceController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

router.use(authenticateToken);

router.post('/', 
  requirePermission('recurring.create'),
  validateRecurringInvoice,
  auditLog('CREATE', 'RECURRING_INVOICE'),
  createRecurringInvoice
);

router.get('/', 
  requirePermission('recurring.read'),
  auditLog('READ', 'RECURRING_INVOICES'),
  getAllRecurringInvoices
);

// Ajouter les autres routes...

export default router;