import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { logger } from './logger';

// Charger le bon .env (prod ou dev)
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });

// Instance globale Prisma
let prisma: PrismaClient;

// Configuration Prisma avec options optimisées
const createPrismaClient = (): PrismaClient => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('❌ DATABASE_URL is not défini dans les variables d’environnement');
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
    ],
    errorFormat: 'pretty',
  });

  // Logging des requêtes uniquement en dev
  if (process.env.NODE_ENV === 'development') {
    prisma.$on('query' as any, (e: any) => {
      logger.debug('📜 Prisma Query:', {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
      });
    });
  }

  // Logging des erreurs
  prisma.$on('error' as any, (e: any) => {
    logger.error('❌ Prisma Error:', e);
  });

  prisma.$on('info' as any, (e: any) => {
    logger.info('ℹ️ Prisma Info:', e);
  });

  prisma.$on('warn' as any, (e: any) => {
    logger.warn('⚠️ Prisma Warning:', e);
  });

  return prisma;
};

// Obtenir l'instance Prisma
export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
};

// Tester la connexion
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const client = getPrismaClient();
    await client.$connect();

    // Test simple
    await client.$queryRaw`SELECT 1`;

    logger.info('✅ Connexion à PostgreSQL établie avec succès');
    return true;
  } catch (error) {
    logger.error('❌ Erreur de connexion PostgreSQL:', error);
    return false;
  }
};

// Fermer la connexion
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    if (prisma) {
      await prisma.$disconnect();
      logger.info('✅ Connexion PostgreSQL fermée');
    }
  } catch (error) {
    logger.error('❌ Erreur lors de la fermeture PostgreSQL:', error);
  }
};

// Middleware
export const injectPrisma = (req: any, res: any, next: any) => {
  req.prisma = getPrismaClient();
  next();
};

// Health check
export const checkDatabaseHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  details: any;
}> => {
  try {
    const client = getPrismaClient();
    const start = Date.now();

    await client.$queryRaw`SELECT 1`;

    const duration = Date.now() - start;

    const userCount = await client.user.count();
    const customerCount = await client.customer.count();

    return {
      status: 'healthy',
      details: {
        responseTime: `${duration}ms`,
        userCount,
        customerCount,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
    };
  }
};

export default getPrismaClient;
