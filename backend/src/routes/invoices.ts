import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  createInvoiceFromQuote,
  updateInvoiceStatus,
  validateInvoice
} from '../controllers/invoiceController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD pour les factures
router.get('/', 
  requirePermission('invoices.read'),
  auditLog('READ', 'INVOICES'),
  getInvoices
);

router.get('/:id', 
  requirePermission('invoices.read'),
  auditLog('READ', 'INVOICE'),
  getInvoiceById
);

router.post('/', 
  requirePermission('invoices.create'),
  validateInvoice,
  auditLog('CREATE', 'INVOICE'),
  createInvoice
);

router.post('/from-quote/:quoteId', 
  requirePermission('invoices.create'),
  auditLog('CREATE_FROM_QUOTE', 'INVOICE'),
  createInvoiceFromQuote
);

router.patch('/:id/status', 
  requirePermission('invoices.update'),
  auditLog('UPDATE_STATUS', 'INVOICE'),
  updateInvoiceStatus
);

export default router;