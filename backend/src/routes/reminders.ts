import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  createReminder,
  getReminders,
  updateReminderStatus,
  validateReminder
} from '../controllers/reminderController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

router.use(authenticateToken);

router.post('/', 
  requirePermission('reminders.create'),
  validateReminder,
  auditLog('CREATE', 'REMINDER'),
  createReminder
);

router.get('/', 
  requirePermission('reminders.read'),
  auditLog('READ', 'REMINDERS'),
  getReminders
);

router.patch('/:id/status', 
  requirePermission('reminders.update'),
  auditLog('UPDATE', 'REMINDER_STATUS'),
  updateReminderStatus
);

export default router;