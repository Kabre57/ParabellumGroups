import { Router } from 'express';
import {
  sendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller';

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

export default router;
