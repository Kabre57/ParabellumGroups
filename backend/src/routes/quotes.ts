import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getQuotes,
  getQuoteById,
  createQuote,
  submitForServiceApproval,
  approveByServiceManager,
  approveByDG,
  rejectQuote,
  validateQuote
} from '../controllers/quoteController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD pour les devis
router.get('/', 
  requirePermission('quotes.read'),
  auditLog('READ', 'QUOTES'),
  getQuotes
);

router.get('/:id', 
  requirePermission('quotes.read'),
  auditLog('READ', 'QUOTE'),
  getQuoteById
);

router.post('/', 
  requirePermission('quotes.create'),
  validateQuote,
  auditLog('CREATE', 'QUOTE'),
  createQuote
);

// Routes de workflow d'approbation
router.post('/:id/submit-for-service-approval', 
  requirePermission('quotes.submit_for_approval'),
  auditLog('SUBMIT_FOR_APPROVAL', 'QUOTE'),
  submitForServiceApproval
);

router.post('/:id/approve-service', 
  requirePermission('quotes.approve_service'),
  auditLog('APPROVE_SERVICE', 'QUOTE'),
  approveByServiceManager
);

router.post('/:id/approve-dg', 
  requirePermission('quotes.approve_dg'),
  auditLog('APPROVE_DG', 'QUOTE'),
  approveByDG
);

router.post('/:id/reject', 
  requirePermission('quotes.reject'),
  auditLog('REJECT', 'QUOTE'),
  rejectQuote
);

export default router;