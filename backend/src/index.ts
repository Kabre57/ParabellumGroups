import dotenv from 'dotenv';

// Charger le bon fichier env
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { testDatabaseConnection, closeDatabaseConnection } from './config/database';
import { logger } from './config/logger';
import { generalLimiter } from './middleware/rateLimiter';
import { setupSwagger } from './config/swagger';
import { cacheService } from './config/cache';
import routes from './routes';

const app: Application = express();

app.set('trust proxy', 1);

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// --- CORS ---
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());

// Sanity check au démarrage
logger.info(`🌍 ALLOWED_ORIGINS chargé (${NODE_ENV}): ${JSON.stringify(allowedOrigins)}`);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (NODE_ENV === 'development') {
      callback(null, true);
      return;
    }

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`🚫 Origine CORS bloquée : ${origin}`);
      callback(new Error('Cette origine n\'est pas autorisée par la politique CORS.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

// --- Middlewares ---
app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(generalLimiter);

// --- Logging requêtes ---
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  next();
});

// --- Routes ---
app.use('/api', routes);

// --- Swagger ---
setupSwagger(app);

// --- Gestion erreurs ---
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    error: `Cannot ${_req.method} ${_req.originalUrl}`
  });
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', { message: error.message, stack: error.stack });
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    error: NODE_ENV === 'development' ? error.message : 'Une erreur inattendue est survenue.'
  });
});

// --- Démarrage serveur ---
const startServer = async (): Promise<void> => {
  try {
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      logger.error('❌ Échec connexion DB. Arrêt du serveur.');
      process.exit(1);
    }

    await cacheService.connect();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Serveur Parabellum démarré sur le port ${PORT}`);
      logger.info(`📊 Environnement: ${NODE_ENV}`);
      logger.info(`📚 Swagger dispo sur http://localhost:${PORT}/api-docs`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} reçu, arrêt du serveur...`);
      server.close(async () => {
        logger.info('Serveur HTTP fermé.');
        try {
          await cacheService.disconnect();
          await closeDatabaseConnection();
          logger.info('Connexions fermées.');
          process.exit(0);
        } catch (error) {
          logger.error('Erreur fermeture connexions:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Erreur critique démarrage serveur:', error);
    process.exit(1);
  }
};

startServer();

export default app;
