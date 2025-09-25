import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  createUserCalendar,
  getUserCalendars,
  validateUserCalendar
} from '../controllers/userCalendarController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

router.use(authenticateToken);

router.post('/', 
  requirePermission('calendar.create'),
  validateUserCalendar,
  auditLog('CREATE', 'USER_CALENDAR'),
  createUserCalendar
);

router.get('/', 
  requirePermission('calendar.read'),
  auditLog('READ', 'USER_CALENDARS'),
  getUserCalendars
);

export default router;