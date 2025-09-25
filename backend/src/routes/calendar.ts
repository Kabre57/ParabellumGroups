import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  validateEvent,
  getCalendarWithTimeOffs
} from '../controllers/calendarController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Route pour le calendrier avec time offs integres
router.get('/with-timeoffs', 
  requirePermission('calendar.read'),
  auditLog('READ', 'CALENDAR_WITH_TIMEOFFS'),
  getCalendarWithTimeOffs
);

// Routes pour les événements calendrier
router.post('/events', 
  requirePermission('calendar.create'),
  validateEvent,
  auditLog('CREATE', 'CALENDAR_EVENT'),
  createEvent
);

router.get('/events', 
  requirePermission('calendar.read'),
  auditLog('READ', 'CALENDAR_EVENTS'),
  getEvents
);

router.get('/events/:id', 
  requirePermission('calendar.read'),
  auditLog('READ', 'CALENDAR_EVENT'),
  getEventById
);

router.put('/events/:id', 
  requirePermission('calendar.update'),
  validateEvent,
  auditLog('UPDATE', 'CALENDAR_EVENT'),
  updateEvent
);

router.delete('/events/:id', 
  requirePermission('calendar.delete'),
  auditLog('DELETE', 'CALENDAR_EVENT'),
  deleteEvent
);

export default router;