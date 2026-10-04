import {
  sendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller';
import { Router, Request, Response } from 'express';
import notificationEmitter from '../emitter';
import { createHmac, timingSafeEqual } from 'crypto';

const router = Router();

router.use((req, res, next) => {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !process.env.JWT_SECRET) return res.status(401).json({ error: 'Authentification requise' });
  try {
    const [encodedHeader, encodedPayload, signature, extra] = token.split('.');
    if (!encodedHeader || !encodedPayload || !signature || extra) throw new Error('Jeton invalide');
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
    if (header.alg !== 'HS256') throw new Error('Algorithme non pris en charge');
    const expected = createHmac('sha256', process.env.JWT_SECRET).update(`${encodedHeader}.${encodedPayload}`).digest();
    const received = Buffer.from(signature, 'base64url');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new Error('Signature incorrecte');
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() >= Number(payload.exp) * 1000) throw new Error('Jeton expiré');
    if (payload.nbf && Date.now() < Number(payload.nbf) * 1000) throw new Error('Jeton pas encore valide');
    (req as any).user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Jeton invalide ou expiré' });
  }
});

const authenticatedUserId = (req: Request) => {
  const user = (req as any).user || {};
  return String(user.userId || user.id || '');
};

router.post('/send', sendNotification);

// Route pour récupérer les notifications de l'utilisateur connecté (via JWT)
router.get('/', (req, res) => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  // Override params en assignant le userId
  (req as any).params = { ...req.params, userId };
  return getUserNotifications(req, res);
});

router.get('/user/:userId', (req, res, next) => {
  if (req.params.userId !== authenticatedUserId(req)) return res.status(403).json({ error: 'Accès interdit' });
  return getUserNotifications(req, res);
});
router.patch('/:id/read', markAsRead);

// Route pour marquer toutes les notifications comme lues (utilisateur connecté)
router.patch('/mark-all-read', (req, res) => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  (req as any).params = { ...req.params, userId };
  return markAllAsRead(req, res);
});

router.patch('/user/:userId/mark-all-read', (req, res) => {
  if (req.params.userId !== authenticatedUserId(req)) return res.status(403).json({ error: 'Accès interdit' });
  return markAllAsRead(req, res);
});

// SSE stream for real-time notifications
router.get('/stream', (req: Request, res: Response) => {
  const userId = authenticatedUserId(req);
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
