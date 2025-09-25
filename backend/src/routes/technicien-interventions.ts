import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  createTechnicienIntervention,
  getTechniciensByIntervention,
  getInterventionsByTechnicien,
  updateTechnicienIntervention,
  deleteTechnicienIntervention,
  validateTechnicienIntervention
} from '../controllers/technicienInterventionController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

router.use(authenticateToken);

router.post('/', 
  requirePermission('interventions.update'),
  validateTechnicienIntervention,
  auditLog('CREATE', 'TECHNICIEN_INTERVENTION'),
  createTechnicienIntervention
);

router.get('/intervention/:interventionId', 
  requirePermission('interventions.read'),
  auditLog('READ', 'TECHNICIENS_BY_INTERVENTION'),
  getTechniciensByIntervention
);

router.get('/technicien/:technicienId', 
  requirePermission('interventions.read'),
  auditLog('READ', 'INTERVENTIONS_BY_TECHNICIEN'),
  getInterventionsByTechnicien
);

router.put('/:id', 
  requirePermission('interventions.update'),
  validateTechnicienIntervention,
  auditLog('UPDATE', 'TECHNICIEN_INTERVENTION'),
  updateTechnicienIntervention
);

router.delete('/:id', 
  requirePermission('interventions.delete'),
  auditLog('DELETE', 'TECHNICIEN_INTERVENTION'),
  deleteTechnicienIntervention
);

export default router;