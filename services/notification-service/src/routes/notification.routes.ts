import {
  sendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller';
import { Router, Request, Response } from 'express';
import notificationEmitter from '../emitter';

const router = Router();

router.post('/send', sendNotification);

// Route pour récupérer les notifications de l'utilisateur connecté (via JWT)
router.get('/', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  // Override params en assignant le userId
  (req as any).params = { ...req.params, userId };
  return getUserNotifications(req, res);
});

router.get('/user/:userId', getUserNotifications);
router.patch('/:id/read', markAsRead);

// Route pour marquer toutes les notifications comme lues (utilisateur connecté)
router.patch('/mark-all-read', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  (req as any).params = { ...req.params, userId };
  return markAllAsRead(req, res);
});

router.patch('/user/:userId/mark-all-read', markAllAsRead);

// SSE stream for real-time notifications
router.get('/stream', (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let isOpen = true;
  const send = (data: any) => {
    if (!isOpen || res.destroyed) return;
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      isOpen = false;
      console.error('Notification stream write error:', error);
    }
  };

  // Initial heartbeat to keep connection open
  send({ type: 'CONNECTED' });

  const handler = (payload: any) => {
    if (payload.userId === userId) {
      send({ type: 'NOTIFICATION', data: payload.notification });
    }
  };

  notificationEmitter.on('notification', handler);

  // Heartbeat
  const heartbeat = setInterval(() => send({ type: 'PING', ts: Date.now() }), 15000);

  req.on('close', () => {
    isOpen = false;
    clearInterval(heartbeat);
    notificationEmitter.off('notification', handler);
    if (!res.destroyed) {
      res.end();
    }
  });
});

export default router;
