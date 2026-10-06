const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ensureProspectDatabase = async () => {
  try {
    await prisma.prospect.count();
    return true;
  } catch (error) {
    console.error('[commercial-service] Database or migration check failed:', error);
    throw error;
  }
};

module.exports = { ensureProspectDatabase };
