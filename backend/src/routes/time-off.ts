import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  createTimeOff,
  getTimeOffs,
  getTimeOffById,
  updateTimeOffStatus,
  getTimeOffStats,
  validateTimeOff,
  validateTimeOffStatus
} from '../controllers/timeOffController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

router.use(authenticateToken);

// Routes pour les time offs (missions, absences, déplacements)
router.post('/', 
  requirePermission('calendar.create'),
  validateTimeOff,
  auditLog('CREATE', 'TIME_OFF'),
  createTimeOff
);

router.get('/', 
  requirePermission('calendar.read'),
  auditLog('READ', 'TIME_OFFS'),
  getTimeOffs
);

router.get('/stats', 
  requirePermission('calendar.read'),
  auditLog('READ', 'TIME_OFF_STATS'),
  getTimeOffStats
);

router.get('/:id', 
  requirePermission('calendar.read'),
  auditLog('READ', 'TIME_OFF'),
  getTimeOffById
);

router.patch('/:id/status', 
  requirePermission('calendar.update'),
  validateTimeOffStatus,
  auditLog('UPDATE', 'TIME_OFF_STATUS'),
  updateTimeOffStatus
);

export default router;