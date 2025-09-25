import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getLeaveRequests,
  getLeaveRequestById,
  createLeaveRequest,
  updateLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveBalance,
  validateLeaveRequest
} from '../controllers/leaveController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes pour les soldes de congés
router.get('/balance/:employeeId', 
  requirePermission('leaves.read'),
  auditLog('READ', 'LEAVE_BALANCE'),
  getLeaveBalance
);

// Routes CRUD pour les demandes de congé
router.get('/', 
  requirePermission('leaves.read'),
  auditLog('READ', 'LEAVE_REQUESTS'),
  getLeaveRequests
);

router.get('/:id', 
  requirePermission('leaves.read'),
  auditLog('READ', 'LEAVE_REQUEST'),
  getLeaveRequestById
);

router.post('/', 
  requirePermission('leaves.create'),
  validateLeaveRequest,
  auditLog('CREATE', 'LEAVE_REQUEST'),
  createLeaveRequest
);

router.put('/:id', 
  requirePermission('leaves.update'),
  validateLeaveRequest,
  auditLog('UPDATE', 'LEAVE_REQUEST'),
  updateLeaveRequest
);

router.post('/:id/approve', 
  requirePermission('leaves.approve'),
  auditLog('APPROVE', 'LEAVE_REQUEST'),
  approveLeaveRequest
);

router.post('/:id/reject', 
  requirePermission('leaves.approve'),
  auditLog('REJECT', 'LEAVE_REQUEST'),
  rejectLeaveRequest
);

export default router;