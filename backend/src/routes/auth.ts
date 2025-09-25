import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { login, refreshToken, logout, getProfile } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

router.post('/login', auditLog('LOGIN', 'AUTH'), login);
router.post('/refresh', refreshToken);
router.post('/logout', authenticateToken, auditLog('LOGOUT', 'AUTH'), logout);
router.get('/profile', authenticateToken, getProfile);

export default router;