import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { listLogFiles, getLogFileContent } from '../controllers/admin.controller';

const router: ExpressRouter = Router();

/**
 * @swagger
 * /logs:
 *   post:
 *     summary: Enregistre un log provenant du client
 *     tags: [Logs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               level:
 *                 type: string
 *                 enum: [error, warn, info, debug]
 *                 description: Le niveau du log.
 *               message:
 *                 type: string
 *                 description: Le message de log.
 *               metadata:
 *                 type: object
 *                 description: Données contextuelles supplémentaires.
 *     responses:
 *       201:
 *         description: Log enregistré avec succès.
 */
router.get('/logs', listLogFiles);
router.get('/logs/:filename', getLogFileContent);

export default router;