import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getPayments,
  getPaymentById,
  createPayment,
  getUnpaidInvoices,
  validatePayment
} from '../controllers/paymentController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD pour les paiements
router.get('/', 
  requirePermission('payments.read'),
  auditLog('READ', 'PAYMENTS'),
  getPayments
);

router.get('/:id', 
  requirePermission('payments.read'),
  auditLog('READ', 'PAYMENT'),
  getPaymentById
);

router.post('/', 
  requirePermission('payments.create'),
  validatePayment,
  auditLog('CREATE', 'PAYMENT'),
  createPayment
);

// Route pour récupérer les factures impayées d'un client
router.get('/customer/:customerId/unpaid-invoices', 
  requirePermission('payments.read'),
  getUnpaidInvoices
);

export default router;