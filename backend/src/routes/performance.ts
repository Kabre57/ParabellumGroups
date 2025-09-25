import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  createReview,
  getAllReviews,
  getReviewById,
  updateReview,
  deleteReview,
  validateReview
} from '../controllers/performanceController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes pour les évaluations de performance
router.post('/', 
  requirePermission('performance.create'),
  validateReview,
  auditLog('CREATE', 'PERFORMANCE_REVIEW'),
  createReview
);

router.get('/', 
  requirePermission('performance.read'),
  auditLog('READ', 'PERFORMANCE_REVIEWS'),
  getAllReviews
);

router.get('/:id', 
  requirePermission('performance.read'),
  auditLog('READ', 'PERFORMANCE_REVIEW'),
  getReviewById
);

router.put('/:id', 
  requirePermission('performance.update'),
  validateReview,
  auditLog('UPDATE', 'PERFORMANCE_REVIEW'),
  updateReview
);

router.delete('/:id', 
  requirePermission('performance.delete'),
  auditLog('DELETE', 'PERFORMANCE_REVIEW'),
  deleteReview
);

export default router;