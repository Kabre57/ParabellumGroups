const { PrismaClient } = require('@prisma/client');
const emailSender = require('../utils/emailSender');
const templateParser = require('../utils/templateParser');

const prisma = new PrismaClient();

const parseSequence = (sequence) => (Array.isArray(sequence) ? sequence : []);

const normalizeStep = (step, index) => ({
  step: Number(step?.step ?? index + 1),
  channel: String(step?.channel || 'EMAIL'),
  delayDays: Number(step?.delayDays || 0),
  templateId: step?.templateId || null,
  status: step?.status || 'A_FAIRE',
  note: step?.note || '',
  executedAt: step?.executedAt || null,
  scheduledAt: step?.scheduledAt || null,
  report: step?.report || '',
  outcome: step?.outcome || '',
});

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

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
      status: { in: ['PROGRAMMEE', 'EN_COURS'] },
      OR: [{ dateEnvoi: null }, { dateEnvoi: { lte: new Date() } }],
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
        const baseDate = campagne.dateEnvoi || campagne.createdAt || new Date();
        const sequence = parseSequence(campagne.sequence).map(normalizeStep);
        const templateMap = new Map();
        const templateIds = sequence
          .map((step) => step.templateId)
          .filter((id) => id);
        if (templateIds.length) {
          const templates = await prisma.template.findMany({
            where: { id: { in: templateIds } },
          });
          templates.forEach((tpl) => templateMap.set(tpl.id, tpl));
        }

        let hasUpdates = false;
        let nbEnvoyes = campagne.nbEnvoyes || 0;
        let nbErreurs = campagne.nbErreurs || 0;

        for (const step of sequence) {
          if (step.status === 'TERMINEE' || step.status === 'ANNULEE') continue;
          const dueAt = addDays(new Date(baseDate), step.delayDays || 0);
          if (dueAt > new Date()) continue;

          if (step.channel === 'EMAIL') {
            if (!step.executedAt) {
              const stepTemplate =
                step.step === 1
                  ? campagne.template
                  : templateMap.get(step.templateId) || campagne.template;
              if (!stepTemplate) {
                nbErreurs += 1;
                continue;
              }
              for (const destinataire of campagne.destinataires || []) {
                try {
                  await sendEmailStep({
                    template: stepTemplate,
                    destinataire,
                    campagne,
                  });
                  nbEnvoyes += 1;
                } catch (error) {
                  nbErreurs += 1;
                }
              }
              step.executedAt = new Date().toISOString();
              step.status = 'TERMINEE';
              hasUpdates = true;
            }
          } else {
            if (!step.scheduledAt) {
              step.scheduledAt = dueAt.toISOString();
              step.status = step.status || 'A_FAIRE';
              hasUpdates = true;
            }
          }
        }

        if (!campagne.dateEnvoi) {
          campagne.dateEnvoi = new Date(baseDate);
          hasUpdates = true;
        }

        if (hasUpdates) {
          const allDone = sequence.every((step) =>
            ['TERMINEE', 'ANNULEE'].includes(step.status)
          );
          await prisma.campagneMail.update({
            where: { id: campagne.id },
            data: {
              status: allDone ? 'TERMINEE' : 'EN_COURS',
              nbEnvoyes,
              nbErreurs,
              sequence,
              dateEnvoi: campagne.dateEnvoi,
            },
          });
        }
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
