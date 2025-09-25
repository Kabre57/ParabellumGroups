import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  updateStock,
  validateProduct
} from '../controllers/productController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD pour les produits
router.get('/', 
  requirePermission('products.read'),
  auditLog('READ', 'PRODUCTS'),
  getProducts
);

router.get('/categories', 
  requirePermission('products.read'),
  getCategories
);

router.get('/:id', 
  requirePermission('products.read'),
  auditLog('READ', 'PRODUCT'),
  getProductById
);

router.post('/', 
  requirePermission('products.create'),
  validateProduct,
  auditLog('CREATE', 'PRODUCT'),
  createProduct
);

router.put('/:id', 
  requirePermission('products.update'),
  validateProduct,
  auditLog('UPDATE', 'PRODUCT'),
  updateProduct
);

router.delete('/:id', 
  requirePermission('products.delete'),
  auditLog('DELETE', 'PRODUCT'),
  deleteProduct
);

router.patch('/:id/stock', 
  requirePermission('products.update'),
  auditLog('UPDATE_STOCK', 'PRODUCT'),
  updateStock
);

export default router;