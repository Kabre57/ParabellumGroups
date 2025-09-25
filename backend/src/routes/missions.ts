import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getMissions,
  getMissionById,
  createMission,
  updateMission,
  deleteMission,
  validateMission
} from '../controllers/missionController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD pour les missions
router.get('/', 
  requirePermission('missions.read'),
  auditLog('READ', 'MISSIONS'),
  getMissions
);

router.get('/:numIntervention', 
  requirePermission('missions.read'),
  auditLog('READ', 'MISSION'),
  getMissionById
);

router.post('/', 
  requirePermission('missions.create'),
  validateMission,
  auditLog('CREATE', 'MISSION'),
  createMission
);

router.put('/:numIntervention', 
  requirePermission('missions.update'),
  validateMission,
  auditLog('UPDATE', 'MISSION'),
  updateMission
);

router.delete('/:numIntervention', 
  requirePermission('missions.delete'),
  auditLog('DELETE', 'MISSION'),
  deleteMission
);

export default router;