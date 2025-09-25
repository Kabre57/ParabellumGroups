import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getMateriels,
  getMaterielById,
  createMateriel,
  updateMateriel,
  deleteMateriel,
  createSortieMateriel,
  createEntreeMateriel,
  getStockAlerts,
  validateMateriel,
  validateSortieMateriel,
  validateEntreeMateriel
} from '../controllers/materielController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes pour les alertes stock
router.get('/alerts', 
  requirePermission('materiels.read'),
  getStockAlerts
);

// Routes CRUD pour les matériels
router.get('/', 
  requirePermission('materiels.read'),
  auditLog('READ', 'MATERIELS'),
  getMateriels
);

router.get('/:id', 
  requirePermission('materiels.read'),
  auditLog('READ', 'MATERIEL'),
  getMaterielById
);

router.post('/', 
  requirePermission('materiels.create'),
  validateMateriel,
  auditLog('CREATE', 'MATERIEL'),
  createMateriel
);

router.put('/:id', 
  requirePermission('materiels.update'),
  validateMateriel,
  auditLog('UPDATE', 'MATERIEL'),
  updateMateriel
);

router.delete('/:id', 
  requirePermission('materiels.delete'),
  auditLog('DELETE', 'MATERIEL'),
  deleteMateriel
);

// Routes pour les mouvements de stock
router.post('/:id/sortie', 
  requirePermission('materiels.update'),
  validateSortieMateriel,
  auditLog('SORTIE', 'MATERIEL'),
  createSortieMateriel
);

router.post('/:id/entree', 
  requirePermission('materiels.update'),
  validateEntreeMateriel,
  auditLog('ENTREE', 'MATERIEL'),
  createEntreeMateriel
);

export default router;