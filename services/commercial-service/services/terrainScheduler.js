const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

const nowMinusHours = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);

const shouldRun = () => {
  if (process.env.TERRAIN_SCHEDULER_DISABLED === 'true') return false;
  return true;
};

const scheduleRelances = async () => {
  const dueVisits = await prisma.prospectActivity.findMany({
    where: {
      type: 'VISITE',
      scheduledAt: { lte: new Date() },
      isCompleted: false,
      NOT: { outcome: 'ANNULE' },
    },
    include: { prospect: true },
  });

  for (const visit of dueVisits) {
    const recentRelance = await prisma.prospectActivity.findFirst({
      where: {
        prospectId: visit.prospectId,
        type: 'RELANCE',
        createdAt: { gte: nowMinusHours(24) },
        subject: { contains: visit.id },
      },
    });

    if (recentRelance) continue;

    await prisma.prospectActivity.create({
      data: {
        prospectId: visit.prospectId,
        type: 'RELANCE',
        subject: `Relance automatique - visite ${visit.id}`,
        description: 'Relance automatique planifiée suite à une visite terrain en retard.',
        outcome: 'A_RELANCER',
        scheduledAt: new Date(),
        participants: visit.participants || [],
        createdById: 'SYSTEM',
        priority: 'NORMAL',
        isCompleted: false,
      },
    });

    await prisma.prospect.update({
      where: { id: visit.prospectId },
      data: {
        nextActivityDate: new Date(),
      },
    });
  }
};

const startTerrainScheduler = () => {
  if (!shouldRun()) return;
  setInterval(async () => {
    try {
      await scheduleRelances();
    } catch (error) {
      console.error('[TerrainScheduler] Erreur relances automatiques:', error.message);
    }
  }, Number(process.env.TERRAIN_SCHEDULER_INTERVAL_MS || DEFAULT_INTERVAL_MS));
};

module.exports = { startTerrainScheduler };
