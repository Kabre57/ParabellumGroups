'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/crm/relances
 * Liste toutes les relances automatiques
 */
const getRelances = async (req, res) => {
  try {
    const { estActif, declencheur, canal } = req.query;
    const relances = await prisma.relanceAutomatique.findMany({
      where: {
        ...(estActif !== undefined ? { estActif: estActif === 'true' } : {}),
        ...(declencheur ? { declencheur } : {}),
        ...(canal ? { canal } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        segment: { select: { id: true, nom: true, compte: true } },
        _count: { select: { executions: true } },
      },
    });
    res.json({ success: true, data: relances, total: relances.length });
  } catch (error) {
    console.error('[CRM] Erreur getRelances:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des relances' });
  }
};

/**
 * POST /api/crm/relances
 * Crée une relance automatique programmable
 */
const createRelance = async (req, res) => {
  try {
    const {
      nom, description, declencheur, delaiJours,
      canal, sujetTemplate, corpsTemplate,
      segmentId, conditions, heureEnvoi, joursEnvoi,
    } = req.body;

    if (!nom || !declencheur) {
      return res.status(400).json({ error: 'nom et declencheur sont requis' });
    }

    const relance = await prisma.relanceAutomatique.create({
      data: {
        nom,
        description,
        declencheur,
        delaiJours: delaiJours || 7,
        canal: canal || 'EMAIL_RELANCE',
        sujetTemplate,
        corpsTemplate,
        segmentId,
        conditions: conditions || {},
        estActif: true,
        heureEnvoi: heureEnvoi || '09:00',
        joursEnvoi: joursEnvoi || ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI'],
        createdById: req.user?.id || 'system',
      },
    });
    res.status(201).json({ success: true, data: relance });
  } catch (error) {
    console.error('[CRM] Erreur createRelance:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la relance' });
  }
};

/**
 * PATCH /api/crm/relances/:id
 * Met à jour une relance (activer/désactiver, modifier template)
 */
const updateRelance = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nom, description, declencheur, delaiJours,
      canal, sujetTemplate, corpsTemplate,
      segmentId, conditions, estActif, heureEnvoi, joursEnvoi,
    } = req.body;

    const relance = await prisma.relanceAutomatique.update({
      where: { id },
      data: {
        nom, description, declencheur, delaiJours,
        canal, sujetTemplate, corpsTemplate,
        segmentId, conditions, estActif, heureEnvoi, joursEnvoi,
        updatedAt: new Date(),
      },
    });
    res.json({ success: true, data: relance });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Relance non trouvée' });
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la relance' });
  }
};

/**
 * POST /api/crm/relances/:id/executer
 * Exécute manuellement une relance (ou simule l'exécution du cron)
 * 
 * NOTE POUR INTÉGRATION API :
 * - EMAIL : Connectez votre fournisseur via la variable CRM_MAIL_PROVIDER_URL
 *   Providers supportés : Mailgun, SendGrid, Brevo
 *   Format d'appel : POST {url}/send { to, subject, html, from }
 * 
 * - SMS : Connectez Twilio ou Orange via CRM_SMS_PROVIDER_URL
 *   Format : POST {url}/messages { to, body, from }
 * 
 * - WHATSAPP : Utilisez WhatsApp Business API via CRM_WHATSAPP_PROVIDER_URL
 *   Format : POST {url}/messages { to, type: "text", text: { body } }
 */
const executerRelance = async (req, res) => {
  try {
    const { id } = req.params;
    const { clientIds, simulation = false } = req.body;

    const relance = await prisma.relanceAutomatique.findUnique({
      where: { id },
      include: { segment: { include: { membres: { select: { clientId: true } } } } },
    });

    if (!relance) return res.status(404).json({ error: 'Relance non trouvée' });
    if (!relance.estActif) return res.status(400).json({ error: 'Cette relance est désactivée' });

    // Déterminer les clients cibles
    let cibles = clientIds || [];
    if (!cibles.length && relance.segmentId) {
      cibles = relance.segment?.membres?.map(m => m.clientId) || [];
    }

    if (!simulation) {
      // Enregistrer les exécutions
      const executions = await prisma.$transaction(
        cibles.map(clientId =>
          prisma.relanceExecution.create({
            data: {
              relanceId: id,
              clientId,
              canal: relance.canal,
              statut: 'ENVOYE',
              metadata: {
                sujet: relance.sujetTemplate,
                declencheur: relance.declencheur,
                heureEnvoi: relance.heureEnvoi,
              },
            },
          })
        )
      );

      await prisma.relanceAutomatique.update({
        where: { id },
        data: {
          nombreExecutions: { increment: cibles.length },
          dernierExecutionLe: new Date(),
        },
      });

      res.json({
        success: true,
        data: {
          executions: executions.length,
          clients: cibles.length,
          integration: buildIntegrationInstructions(relance.canal),
        },
        message: `${cibles.length} relance(s) enregistrée(s). Connectez votre API pour l'envoi réel.`,
      });
    } else {
      res.json({
        success: true,
        simulation: true,
        data: {
          clientsCibles: cibles.length,
          canal: relance.canal,
          sujet: relance.sujetTemplate,
          heureEnvoi: relance.heureEnvoi,
          joursEnvoi: relance.joursEnvoi,
          integration: buildIntegrationInstructions(relance.canal),
        },
      });
    }
  } catch (error) {
    console.error('[CRM] Erreur executerRelance:', error);
    res.status(500).json({ error: 'Erreur lors de l\'exécution de la relance' });
  }
};

/**
 * GET /api/crm/relances/:id/executions
 * Historique des exécutions d'une relance
 */
const getExecutions = async (req, res) => {
  try {
    const { id } = req.params;
    const executions = await prisma.relanceExecution.findMany({
      where: { relanceId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { client: { select: { id: true, nom: true, email: true } } },
    });
    res.json({ success: true, data: executions, total: executions.length });
  } catch (error) {
    console.error('[CRM] Erreur getExecutions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des exécutions' });
  }
};

/**
 * DELETE /api/crm/relances/:id
 */
const deleteRelance = async (req, res) => {
  try {
    await prisma.relanceAutomatique.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Relance supprimée' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Relance non trouvée' });
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

/**
 * Retourne les instructions d'intégration API selon le canal
 */
function buildIntegrationInstructions(canal) {
  const instructions = {
    EMAIL_RELANCE: {
      provider: 'Mailgun / SendGrid / Brevo',
      envVariable: 'CRM_MAIL_PROVIDER_URL',
      method: 'POST',
      format: { to: 'email_client', subject: 'sujet_template', html: 'corps_template', from: 'noreply@votre-domaine.com' },
      doc: 'https://documentation.mailgun.com/en/latest/api-sending.html',
    },
    SMS: {
      provider: 'Twilio / Orange API Sénégal / MTN Business',
      envVariable: 'CRM_SMS_PROVIDER_URL',
      method: 'POST',
      format: { to: '+2250XXXXXXXXX', body: 'corps_template', from: 'NOM_EXPEDITEUR' },
      doc: 'https://www.twilio.com/docs/sms/api',
    },
    WHATSAPP: {
      provider: 'WhatsApp Business API (Meta)',
      envVariable: 'CRM_WHATSAPP_PROVIDER_URL',
      method: 'POST',
      format: { messaging_product: 'whatsapp', to: 'numero_client', type: 'text', text: { body: 'corps_template' } },
      doc: 'https://developers.facebook.com/docs/whatsapp/cloud-api/messages',
    },
  };
  return instructions[canal] || instructions.EMAIL_RELANCE;
}

module.exports = {
  getRelances,
  createRelance,
  updateRelance,
  executerRelance,
  getExecutions,
  deleteRelance,
};
