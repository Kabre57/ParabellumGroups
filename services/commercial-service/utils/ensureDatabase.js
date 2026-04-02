const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');

const prisma = new PrismaClient();

const isMissingTableError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'P2021' ||
    message.includes('prospects') ||
    (message.includes('relation') && message.includes('prospect'))
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

const ensureProspectDatabase = async () => {
  try {
    await prisma.prospect.count();
    return true;
  } catch (error) {
    if (!isMissingTableError(error)) {
      console.error('[commercial-service] Database check failed:', error);
      return false;
    }

    if (process.env.AUTO_DB_PUSH !== 'true') {
      console.warn('[commercial-service] Table prospects absente. AUTO_DB_PUSH=false, ignore.');
      return false;
    }

    try {
      await runCommand('npx prisma db push --accept-data-loss', `${__dirname}/..`);
      console.log('[commercial-service] Prisma db push executed to create prospects.');
      return true;
    } catch (pushError) {
      console.error('[commercial-service] Prisma db push failed:', pushError);
      return false;
    }
  }
};

module.exports = { ensureProspectDatabase };
