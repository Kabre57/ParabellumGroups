const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Nettoie les refresh tokens expirés ou révoqués depuis plus de 30 jours
 */
const cleanupExpiredTokens = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date()
            }
          },
          {
            isRevoked: true,
            createdAt: {
              lt: thirtyDaysAgo
            }
          }
        ]
      }
    });

    console.log(`[CLEANUP] ${result.count} refresh tokens supprimés`);
    return result.count;
  } catch (error) {
    console.error('[CLEANUP] Erreur lors du nettoyage des tokens:', error);
    throw error;
  }
};

/**
 * Démarre la tâche cron de nettoyage
 * Par défaut : toutes les heures
 */
const startCleanupJob = (intervalMs = 60 * 60 * 1000) => {
  console.log(`[CLEANUP] Démarrage de la tâche de nettoyage (intervalle: ${intervalMs}ms)`);
  
  cleanupExpiredTokens();
  
  setInterval(cleanupExpiredTokens, intervalMs);
};

module.exports = {
  cleanupExpiredTokens,
  startCleanupJob
};
