import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getReports
} from '../controllers/reportController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Route principale pour les rapports, gère les différents types via le paramètre 'endpoint'
router.get(
  '/',
  auditLog('READ', 'REPORTS'),
  getReports
);

export default router;

