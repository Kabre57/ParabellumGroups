import { createHmac, timingSafeEqual } from 'crypto';
import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import notificationEmitter from '../emitter';

const router = Router();

const authenticateOperationalRequestService = (req: Request, res: Response, next: () => void) => {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !process.env.JWT_SECRET) return res.status(401).json({ error: 'Authentification du service requise.' });
  try {
    const [encodedHeader, encodedPayload, signature, extra] = token.split('.');
    if (!encodedHeader || !encodedPayload || !signature || extra) throw new Error('Token invalide');
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
    if (header.alg !== 'HS256') throw new Error('Algorithme non pris en charge');
    const expected = createHmac('sha256', process.env.JWT_SECRET).update(`${encodedHeader}.${encodedPayload}`).digest();
    const received = Buffer.from(signature, 'base64url');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new Error('Signature incorrecte');
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (payload.iss !== 'parabellum-operational-request-service' || payload.serviceName !== 'operational-request-service') throw new Error('Service non autorisé');
    if (!payload.exp || Date.now() >= Number(payload.exp) * 1000) throw new Error('Token expiré');
    return next();
  } catch {
    return res.status(401).json({ error: 'Jeton de service invalide ou expiré.' });
  }
};

router.post('/notifications', authenticateOperationalRequestService, async (req: Request, res: Response) => {
  try {
    const userId = String(req.body?.userId || '').trim();
    const idempotencyKey = String(req.body?.idempotencyKey || '').trim();
    const title = String(req.body?.title || '').trim();
    const message = String(req.body?.message || '').trim();
    if (!userId || !idempotencyKey || !title || !message) return res.status(400).json({ error: 'userId, idempotencyKey, title et message sont requis.' });
    const normalizedType = ['INFO', 'WARNING', 'ERROR', 'SUCCESS'].includes(String(req.body?.type).toUpperCase())
      ? String(req.body.type).toUpperCase()
      : 'INFO';
    const notification = await prisma.notification.upsert({
      where: { idempotencyKey },
      create: { userId, idempotencyKey, type: normalizedType, title, message, data: req.body?.data || undefined },
      update: {},
    });
    notificationEmitter.emit('notification', { userId, notification });
    return res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error('Internal notification delivery failed:', error);
    return res.status(500).json({ error: 'La notification n’a pas pu être enregistrée.' });
  }
});

export default router;
