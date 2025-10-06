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
  validateIntervention,
} from '../controllers/interventionController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

router.use(authenticateToken);

router.get('/', requirePermission('interventions.read'), auditLog('READ', 'INTERVENTION'), getInterventions);
router.get('/:id', requirePermission('interventions.read'), auditLog('READ', 'INTERVENTION'), getInterventionById);
router.post('/', requirePermission('interventions.create'), auditLog('CREATE', 'INTERVENTION'), createIntervention);
router.put('/:id', requirePermission('interventions.update'), auditLog('UPDATE', 'INTERVENTION'), updateIntervention);
router.delete('/:id', requirePermission('interventions.delete'), auditLog('DELETE', 'INTERVENTION'), deleteIntervention);

router.post('/:id/start', requirePermission('interventions.update'), auditLog('START', 'INTERVENTION'), startIntervention);
router.post('/:id/end', requirePermission('interventions.update'), auditLog('END', 'INTERVENTION'), endIntervention);
router.post('/:id/validate', requirePermission('interventions.validate'), auditLog('VALIDATE', 'INTERVENTION'), validateIntervention);

router.post('/:id/assign-technicien', requirePermission('interventions.update'), auditLog('ASSIGN_TECHNICIEN', 'INTERVENTION'), assignTechnicien);
router.delete('/:id/technicien/:technicienId', requirePermission('interventions.update'), auditLog('REMOVE_TECHNICIEN', 'INTERVENTION'), removeTechnicien);

export default router;
