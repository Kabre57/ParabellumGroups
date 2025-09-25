import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getInterventions,
  getInterventionById,
  createIntervention,
  updateIntervention,
  deleteIntervention,
  startIntervention,
  endIntervention,
  assignTechnicien,
  removeTechnicien,
  validateIntervention
} from '../controllers/interventionController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD pour les interventions
router.get('/', 
  requirePermission('interventions.read'),
  auditLog('READ', 'INTERVENTIONS'),
  getInterventions
);

router.get('/:id', 
  requirePermission('interventions.read'),
  auditLog('READ', 'INTERVENTION'),
  getInterventionById
);

router.post('/', 
  requirePermission('interventions.create'),
  validateIntervention,
  auditLog('CREATE', 'INTERVENTION'),
  createIntervention
);

router.put('/:id', 
  requirePermission('interventions.update'),
  validateIntervention,
  auditLog('UPDATE', 'INTERVENTION'),
  updateIntervention
);

router.delete('/:id', 
  requirePermission('interventions.delete'),
  auditLog('DELETE', 'INTERVENTION'),
  deleteIntervention
);

// Routes pour la gestion du temps
router.post('/:id/start', 
  requirePermission('interventions.update'),
  auditLog('START', 'INTERVENTION'),
  startIntervention
);

router.post('/:id/end', 
  requirePermission('interventions.update'),
  auditLog('END', 'INTERVENTION'),
  endIntervention
);

// Routes pour la gestion des techniciens
router.post('/:id/assign-technicien', 
  requirePermission('interventions.update'),
  auditLog('ASSIGN_TECHNICIEN', 'INTERVENTION'),
  assignTechnicien
);

router.delete('/:id/technicien/:technicienId', 
  requirePermission('interventions.update'),
  auditLog('REMOVE_TECHNICIEN', 'INTERVENTION'),
  removeTechnicien
);

export default router;