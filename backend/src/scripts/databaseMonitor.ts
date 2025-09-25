// scripts/databaseMonitor.ts
import { PrismaClient } from '@prisma/client';

// Créez une instance Prisma directement
const prisma = new PrismaClient();

// Logger simple pour le script
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error ? error.message : '');
  }
};

export const monitorDatabaseConnections = async () => {
  try {
    console.log('🔍 Monitoring des connexions PostgreSQL...');
    
    // Obtenir les statistiques de connexion
    const result: any = await prisma.$queryRaw`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
        count(*) FILTER (WHERE state = 'fastpath function call') as fastpath,
        count(*) FILTER (WHERE state = 'disabled') as disabled
      FROM pg_stat_activity 
      WHERE datname = 'ParabellumGroups'
    `;

    const stats = result[0];
    
    console.log('📊 Statistiques des connexions PostgreSQL:');
    console.log(`- Total: ${stats.total_connections}`);
    console.log(`- Actives: ${stats.active_connections}`);
    console.log(`- Inactives (idle): ${stats.idle_connections}`);
    console.log(`- En transaction idle: ${stats.idle_in_transaction}`);
    
    // Vérifier si on approche la limite
    if (stats.total_connections > 50) {
      console.warn('⚠️  Attention: Nombre élevé de connexions!');
    }
    
    return stats;
  } catch (error) {
    logger.error('❌ Erreur de monitoring des connexions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

// Exécuter le monitoring
monitorDatabaseConnections()
  .then((stats) => {
    console.log('✅ Monitoring terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur lors du monitoring:', error);
    process.exit(1);
  });