import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification
} from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes pour les notifications
router.get('/', 
  auditLog('READ', 'NOTIFICATIONS'),
  getNotifications
);

router.post('/', 
  auditLog('CREATE', 'NOTIFICATION'),
  createNotification
);

router.patch('/:id/read', 
  auditLog('MARK_READ', 'NOTIFICATION'),
  markAsRead
);

router.patch('/read-all', 
  auditLog('MARK_ALL_READ', 'NOTIFICATIONS'),
  markAllAsRead
);

router.delete('/:id', 
  auditLog('DELETE', 'NOTIFICATION'),
  deleteNotification
);

export default router;