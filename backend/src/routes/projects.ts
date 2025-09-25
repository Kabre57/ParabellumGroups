import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { 
  createProject, 
  getAllProjects, 
  getProjectById,
  updateProject,
  deleteProject
} from "../controllers/projectController";
import { authenticateToken, requirePermission } from "../middleware/auth";
import { auditLog } from "../middleware/audit";

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD pour les projets clients
router.post("/", 
  requirePermission('projects.create'),
  auditLog('CREATE', 'PROJECT'),
  createProject
);

router.get("/", 
  requirePermission('projects.read'),
  auditLog('READ', 'PROJECTS'),
  getAllProjects
);

router.get("/:id", 
  requirePermission('projects.read'),
  auditLog('READ', 'PROJECT'),
  getProjectById
);

router.put("/:id", 
  requirePermission('projects.update'),
  auditLog('UPDATE', 'PROJECT'),
  updateProject
);

router.delete("/:id", 
  requirePermission('projects.delete'),
  auditLog('DELETE', 'PROJECT'),
  deleteProject
);

export default router;