const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');

const prisma = new PrismaClient();

const isMissingTableError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'P2021' ||
    message.includes('campagnes_mail') ||
    (message.includes('relation') && message.includes('campagnes'))
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

const ensureCampaignDatabase = async () => {
  try {
    await prisma.campagneMail.count();
    return true;
  } catch (error) {
    if (!isMissingTableError(error)) {
      console.error('[communication-service] Database check failed:', error);
      return false;
    }

    if (process.env.AUTO_DB_PUSH !== 'true') {
      console.warn('[communication-service] Table campagnes_mail absente. AUTO_DB_PUSH=false, ignore.');
      return false;
    }

    try {
      await runCommand('npx prisma db push --accept-data-loss', `${__dirname}/..`);
      console.log('[communication-service] Prisma db push executed to create campagnes_mail.');
      return true;
    } catch (pushError) {
      console.error('[communication-service] Prisma db push failed:', pushError);
      return false;
    }
  }
};

module.exports = { ensureCampaignDatabase };
