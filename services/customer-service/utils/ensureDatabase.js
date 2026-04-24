const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');

const prisma = new PrismaClient();

const isMissingTableError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'P2021' ||
    message.includes('client') ||
    message.includes('clients') ||
    (message.includes('relation') && message.includes('client'))
  );
};

const runCommand = (command, cwd) =>
  new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      return resolve({ stdout, stderr });
    });
  });

const ensureCustomerDatabase = async () => {
  try {
    await prisma.client.count();
    return true;
  } catch (error) {
    if (!isMissingTableError(error)) {
      console.error('[customer-service] Database check failed:', error);
      return false;
    }

    if (process.env.AUTO_DB_PUSH !== 'true') {
      console.warn('[customer-service] Tables CRM absentes. AUTO_DB_PUSH=false, ignore.');
      return false;
    }

    try {
      await runCommand('npx prisma db push --accept-data-loss', `${__dirname}/..`);
      console.log('[customer-service] Prisma db push executed to create CRM tables.');
      return true;
    } catch (pushError) {
      console.error('[customer-service] Prisma db push failed:', pushError);
      return false;
    }
  }
};

module.exports = { ensureCustomerDatabase };
