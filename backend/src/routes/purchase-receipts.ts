import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  createPurchaseReceipt,
  getPurchaseReceipts,
  validatePurchaseReceipt
} from '../controllers/purchaseReceiptController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

router.use(authenticateToken);

router.post('/', 
  requirePermission('purchases.update'),
  validatePurchaseReceipt,
  auditLog('CREATE', 'PURCHASE_RECEIPT'),
  createPurchaseReceipt
);

router.get('/', 
  requirePermission('purchases.read'),
  auditLog('READ', 'PURCHASE_RECEIPTS'),
  getPurchaseReceipts
);

export default router;