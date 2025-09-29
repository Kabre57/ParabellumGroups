import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getCalendarWithTimeOffs,
  getEvents,
  createEvent
} from '../controllers/calendarController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();
router.use(authenticateToken);

router.get('/', 
  requirePermission('calendar.read'),
  auditLog('READ', 'CALENDAR'),
  getCalendarWithTimeOffs
);

router.get('/events', 
  requirePermission('calendar.read'),
  auditLog('READ', 'CALENDAR_EVENTS'),
  getEvents
);

router.post('/events', 
  requirePermission('calendar.create'),
  auditLog('CREATE', 'CALENDAR_EVENT'),
  createEvent
);

export default router;
