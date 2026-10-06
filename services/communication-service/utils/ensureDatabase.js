const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ensureCommunicationDatabase = async () => {
  try {
    await prisma.campagneMail.count();
    await prisma.template.count();
    return true;
  } catch (error) {
    console.error('[communication-service] Database or migration check failed:', error);
    throw error;
  }
};

module.exports = { ensureCommunicationDatabase };
