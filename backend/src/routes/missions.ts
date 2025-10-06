// -----------------------------------------------------------------------------
// Router Missions : CRUD + endpoint /missions/visible
// -----------------------------------------------------------------------------

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';

import {
  getMissions,
  getMissionById,
  createMission,
  updateMission,
  deleteMission,
  validateMission,
  // ⚠️ Assure-toi que ce nom est bien exporté depuis le contrôleur :
  getVisibleMissions,
} from '../controllers/missionController';

import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD
router.get(
  '/',
  requirePermission('missions.read'),
  auditLog('READ', 'MISSIONS'),
  getMissions
);

router.get(
  '/:numIntervention',
  requirePermission('missions.read'),
  auditLog('READ', 'MISSION'),
  getMissionById
);

router.post(
  '/',
  requirePermission('missions.create'),
  validateMission,
  auditLog('CREATE', 'MISSION'),
  createMission
);

router.put(
  '/:numIntervention',
  requirePermission('missions.update'),
  validateMission,
  auditLog('UPDATE', 'MISSION'),
  updateMission
);

router.delete(
  '/:numIntervention',
  requirePermission('missions.delete'),
  auditLog('DELETE', 'MISSION'),
  deleteMission
);

// -----------------------------------------------------------------------------
// Missions "visibles" (liste planifiée / en_cours / non_terminee)
// -----------------------------------------------------------------------------
router.get(
  '/visible',
  requirePermission('missions.read'),
  auditLog('READ', 'MISSION_VISIBLE'),
  getVisibleMissions
);

export default router;
