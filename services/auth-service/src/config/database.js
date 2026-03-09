const { PrismaClient } = require('@prisma/client');

const prismaLogs = ['error'];

if (process.env.PRISMA_LOG_WARN === 'true') {
  prismaLogs.push('warn');
}

if (process.env.PRISMA_LOG_QUERIES === 'true') {
  prismaLogs.push('query');
}

const prisma = new PrismaClient({
  log: prismaLogs,
});

module.exports = prisma;
