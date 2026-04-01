const { PrismaClient } = require('@prisma/client');
const emailSender = require('../utils/emailSender');
const templateParser = require('../utils/templateParser');

const prisma = new PrismaClient();

const parseSequence = (sequence) => (Array.isArray(sequence) ? sequence : []);

const sendEmailStep = async ({ template, destinataire, campagne }) => {
  const contenu = templateParser.parse(
    template.contenu,
    destinataire.variables || {}
  );
  const sujet = templateParser.parse(
    template.sujet,
    destinataire.variables || {}
  );
  await emailSender.sendEmail({
    to: destinataire.email,
    subject: sujet,
    html: contenu,
  });
};

const runCampaignNow = async (campagne) => {
  const template = campagne.template;
  if (!template) {
    throw new Error('Template introuvable');
  }

  let nbEnvoyes = 0;
  let nbErreurs = 0;

  for (const destinataire of campagne.destinataires || []) {
    try {
      await sendEmailStep({ template, destinataire, campagne });
      nbEnvoyes += 1;
    } catch (error) {
      nbErreurs += 1;
    }
  }

  return prisma.campagneMail.update({
    where: { id: campagne.id },
    data: {
      status: 'TERMINEE',
      nbEnvoyes,
      nbErreurs,
      dateEnvoi: new Date(),
    },
  });
};

const getDueCampaigns = async () =>
  prisma.campagneMail.findMany({
    where: {
      status: 'PROGRAMMEE',
      dateEnvoi: { lte: new Date() },
    },
    include: { template: true },
    orderBy: { createdAt: 'asc' },
  });

const markInProgress = async (id) =>
  prisma.campagneMail.update({
    where: { id },
    data: { status: 'EN_COURS' },
  });

const startCampaignScheduler = ({ intervalMs = 60000 } = {}) => {
  const tick = async () => {
    try {
      const due = await getDueCampaigns();
      for (const campagne of due) {
        await markInProgress(campagne.id);
        await runCampaignNow(campagne);
      }
    } catch (error) {
      console.error('[Scheduler] Erreur:', error.message);
    }
  };

  const timer = setInterval(tick, intervalMs);
  console.log(`[Scheduler] Relances actives toutes les ${intervalMs / 1000}s`);
  return () => clearInterval(timer);
};

module.exports = {
  startCampaignScheduler,
  parseSequence,
};
