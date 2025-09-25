import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  validateOrder
} from '../controllers/purchaseController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes pour les commandes d'achat
router.post('/', 
  requirePermission('purchases.create'),
  validateOrder,
  auditLog('CREATE', 'PURCHASE_ORDER'),
  createOrder
);

router.get('/', 
  requirePermission('purchases.read'),
  auditLog('READ', 'PURCHASE_ORDERS'),
  getAllOrders
);

router.get('/:id', 
  requirePermission('purchases.read'),
  auditLog('READ', 'PURCHASE_ORDER'),
  getOrderById
);

router.put('/:id', 
  requirePermission('purchases.update'),
  validateOrder,
  auditLog('UPDATE', 'PURCHASE_ORDER'),
  updateOrder
);

router.delete('/:id', 
  requirePermission('purchases.delete'),
  auditLog('DELETE', 'PURCHASE_ORDER'),
  deleteOrder
);

export default router;