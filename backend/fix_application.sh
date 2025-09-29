#!/bin/bash
# fix_application.sh

echo "🔧 Application des correctifs..."

# 1. Arrêt des services
echo "⏹️  Arrêt des services..."
pkill -f "node.*backend"
pkill -f "vite"

# 2. Correction des fichiers
echo "📁 Correction des fichiers de configuration..."

# Création du fichier calendar routes manquant
cat > src/routes/calendar.ts << 'EOF'
import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getCalendarWithTimeOffs,
  getEvents,
  createEvent
} from '../controllers/calendarController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router: ExpressRouter = Router();
router.use(authenticateToken);

router.get('/', 
  requirePermission('calendar.read'),
  auditLog('READ', 'CALENDAR'),
  getCalendarWithTimeOffs
);

router.get('/events', 
  requirePermission('calendar.read'),
  auditLog('READ', 'CALENDAR_EVENTS'),
  getEvents
);

router.post('/events', 
  requirePermission('calendar.create'),
  auditLog('CREATE', 'CALENDAR_EVENT'),
  createEvent
);

export default router;
EOF

# 3. Mise à jour du fichier index.ts des routes
sed -i '/router.use('\''\/v1\/reports'\'', reportRoutes);/a\\nrouter.use('\''\/v1\/calendar'\'', calendarRoutes);' src/routes/index.ts

# 4. Ajout de l'import manquant
sed -i '/import reportRoutes from '\''\.\/reports'\'';/a\\import calendarRoutes from '\''\.\/calendar'\'';' src/routes/index.ts

echo "✅ Correctifs appliqués !"
echo "🚀 Redémarrage des services..."