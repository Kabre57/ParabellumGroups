import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getSalaries,
  getSalaryById,
  createSalary,
  updateSalary,
  deleteSalary,
  getSalaryReport,
  validateSalary,
  paySalary
} from '../controllers/salaryController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes pour les rapports
router.get('/report', 
  requirePermission('salaries.read'),
  auditLog('READ', 'SALARY_REPORT'),
  getSalaryReport
);

// Routes CRUD pour les salaires
router.get('/', 
  requirePermission('salaries.read'),
  auditLog('READ', 'SALARIES'),
  getSalaries
);

router.get('/:id', 
  requirePermission('salaries.read'),
  auditLog('READ', 'SALARY'),
  getSalaryById
);

router.post('/', 
  requirePermission('salaries.create'),
  validateSalary,
  auditLog('CREATE', 'SALARY'),
  createSalary
);

router.put('/:id', 
  requirePermission('salaries.update'),
  validateSalary,
  auditLog('UPDATE', 'SALARY'),
  updateSalary
);

router.delete('/:id', 
  requirePermission('salaries.delete'),
  auditLog('DELETE', 'SALARY'),
  deleteSalary
);

// Route pour marquer un salaire comme payé
router.post('/:id/pay', 
  requirePermission('salaries.update'),
  auditLog('PAY', 'SALARY'),
  paySalary
);

export default router;