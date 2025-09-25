import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getLoans,
  getLoanById,
  createLoan,
  updateLoan,
  deleteLoan,
  getLoanPayments,
  createLoanPayment,
  validateLoan
} from '../controllers/loanController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes pour les paiements de prêt
router.get('/:id/payments', 
  requirePermission('loans.read'),
  auditLog('READ', 'LOAN_PAYMENTS'),
  getLoanPayments
);

router.post('/:id/payments', 
  requirePermission('loans.update'),
  auditLog('CREATE', 'LOAN_PAYMENT'),
  createLoanPayment
);

// Routes CRUD pour les prêts
router.get('/', 
  requirePermission('loans.read'),
  auditLog('READ', 'LOANS'),
  getLoans
);

router.get('/:id', 
  requirePermission('loans.read'),
  auditLog('READ', 'LOAN'),
  getLoanById
);

router.post('/', 
  requirePermission('loans.create'),
  validateLoan,
  auditLog('CREATE', 'LOAN'),
  createLoan
);

router.put('/:id', 
  requirePermission('loans.update'),
  validateLoan,
  auditLog('UPDATE', 'LOAN'),
  updateLoan
);

router.delete('/:id', 
  requirePermission('loans.delete'),
  auditLog('DELETE', 'LOAN'),
  deleteLoan
);

export default router;