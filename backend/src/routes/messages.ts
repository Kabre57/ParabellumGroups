import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getMessages,
  getMessageById,
  createMessage,
  markAsRead,
  archiveMessage,
  replyToMessage,
  validateMessage
} from '../controllers/messageController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD pour les messages
router.get('/', 
  requirePermission('messages.read'),
  auditLog('READ', 'MESSAGES'),
  getMessages
);

router.get('/:id', 
  requirePermission('messages.read'),
  auditLog('READ', 'MESSAGE'),
  getMessageById
);

router.post('/', 
  requirePermission('messages.create'),
  validateMessage,
  auditLog('CREATE', 'MESSAGE'),
  createMessage
);

router.patch('/:id/read', 
  requirePermission('messages.read'),
  auditLog('MARK_READ', 'MESSAGE'),
  markAsRead
);

router.patch('/:id/archive', 
  requirePermission('messages.update'),
  auditLog('ARCHIVE', 'MESSAGE'),
  archiveMessage
);

router.post('/:id/reply', 
  requirePermission('messages.create'),
  validateMessage,
  auditLog('REPLY', 'MESSAGE'),
  replyToMessage
);

export default router;