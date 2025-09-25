import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  validateService
} from '../controllers/serviceController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD pour les services
router.get('/', 
  requirePermission('admin.system_settings'),
  auditLog('READ', 'SERVICES'),
  getServices
);

router.get('/:id', 
  requirePermission('admin.system_settings'),
  auditLog('READ', 'SERVICE'),
  getServiceById
);

router.post('/', 
  requirePermission('admin.system_settings'),
  validateService,
  auditLog('CREATE', 'SERVICE'),
  createService
);

router.put('/:id', 
  requirePermission('admin.system_settings'),
  validateService,
  auditLog('UPDATE', 'SERVICE'),
  updateService
);

router.delete('/:id', 
  requirePermission('admin.system_settings'),
  auditLog('DELETE', 'SERVICE'),
  deleteService
);

export default router;