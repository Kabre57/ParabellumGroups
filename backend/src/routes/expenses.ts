import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseCategories,
  validateExpense
} from '../controllers/expenseController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes utilitaires
router.get('/categories', 
  requirePermission('expenses.read'),
  getExpenseCategories
);

// Routes CRUD pour les dépenses
router.get('/', 
  requirePermission('expenses.read'),
  auditLog('READ', 'EXPENSES'),
  getExpenses
);

router.get('/:id', 
  requirePermission('expenses.read'),
  auditLog('READ', 'EXPENSE'),
  getExpenseById
);

router.post('/', 
  requirePermission('expenses.create'),
  validateExpense,
  auditLog('CREATE', 'EXPENSE'),
  createExpense
);

router.put('/:id', 
  requirePermission('expenses.update'),
  validateExpense,
  auditLog('UPDATE', 'EXPENSE'),
  updateExpense
);

router.delete('/:id', 
  requirePermission('expenses.delete'),
  auditLog('DELETE', 'EXPENSE'),
  deleteExpense
);

export default router;