import { Router } from 'express';
import {
  getUnifiedCalendarEvents,
  getUserCalendars,
  getCalendarWithTimeOffs,
  getEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent
} from '../controllers/unifiedCalendarController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: Router = Router();
router.use(authenticateToken);

// Routes unifiées
router.get('/unified', 
  requirePermission('calendar.read'),
  auditLog('READ', 'CALENDAR_UNIFIED'),
  getUnifiedCalendarEvents
);

router.get('/user-calendars',
  requirePermission('calendar.read'),
  getUserCalendars
);

// Routes existantes (maintenues pour compatibilité)
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

router.get('/events/:id', 
  requirePermission('calendar.read'),
  getEventById
);

router.put('/events/:id', 
  requirePermission('calendar.update'),
  auditLog('UPDATE', 'CALENDAR_EVENT'),
  updateEvent
);

router.delete('/events/:id', 
  requirePermission('calendar.delete'),
  auditLog('DELETE', 'CALENDAR_EVENT'),
  deleteEvent
);

export default router;