const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ensureCustomerDatabase = async () => {
  try {
    await prisma.client.count();
    return true;
  } catch (error) {
    console.error('[customer-service] Database or migration check failed:', error);
    throw error;
  }
};

module.exports = { ensureCustomerDatabase };
