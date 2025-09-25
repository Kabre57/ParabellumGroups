import { Request, Response } from 'express';
import { logger } from '@/config/logger';

/**
 * Reçoit et enregistre un log provenant du client (frontend).
 * @param req - La requête Express. Le corps doit contenir { level, message, metadata }.
 * @param res - La réponse Express.
 */
export const createClientLog = (req: Request, res: Response): void => {
  // 1. Extraire les données du corps de la requête
  const { level = 'info', message = 'Log client sans message', metadata = {} } = req.body;

  // 2. Valider le niveau de log pour la sécurité
  const allowedLevels = ['error', 'warn', 'info', 'debug'];
  const logLevel = allowedLevels.includes(level) ? level : 'info';

  // 3. Enrichir les métadonnées avec des informations sur le client
  const clientMetadata = {
    ...metadata,
    clientIp: req.ip, // Grâce à `app.set('trust proxy', 1)`, c'est la vraie IP
    userAgent: req.get('User-Agent'),
    source: 'frontend' // Pour distinguer ce log des logs backend
  };

  // 4. Enregistrer le log en utilisant Winston
  logger.log(logLevel, `[FRONTEND] ${message}`, clientMetadata);

  // 5. Renvoyer une réponse de succès
  res.status(201).json({ success: true, message: 'Log enregistré avec succès' });
};
