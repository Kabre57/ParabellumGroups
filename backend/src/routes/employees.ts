import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  validateEmployee
} from '../controllers/employeeController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD pour les employés
router.get('/', 
  requirePermission('employees.read'),
  auditLog('READ', 'EMPLOYEES'),
  getEmployees
);

router.get('/:id', 
  requirePermission('employees.read'),
  auditLog('READ', 'EMPLOYEE'),
  getEmployeeById
);

router.post('/', 
  requirePermission('employees.create'),
  validateEmployee,
  auditLog('CREATE', 'EMPLOYEE'),
  createEmployee
);

router.put('/:id', 
  requirePermission('employees.update'),
  validateEmployee,
  auditLog('UPDATE', 'EMPLOYEE'),
  updateEmployee
);

router.delete('/:id', 
  requirePermission('employees.delete'),
  auditLog('DELETE', 'EMPLOYEE'),
  deleteEmployee
);

export default router;