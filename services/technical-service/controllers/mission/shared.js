// Dependances, regles et fonctions communes aux parcours de mission.
const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer-core');
const { getNextMissionNumber } = require('../../utils/missionNumberGenerator');
const prisma = new PrismaClient();
const { isForceDelete } = require('../../utils/authz');
const { syncMissionById, syncMissionsByClient } = require('../../services/crmMissionSync');

const VALID_STATUSES = ['PLANIFIEE', 'EN_COURS', 'SUSPENDUE', 'TERMINEE', 'ANNULEE'];
const VALID_PRIORITIES = ['BASSE', 'MOYENNE', 'HAUTE', 'URGENTE'];

const isAdminLike = (user) => {
  const role = String(user?.role || '').toLowerCase();
  return role === 'admin' || role === 'super_admin';
};

const parseScopedInteger = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildMissionScopeWhere = (req, explicitEnterpriseId, explicitServiceId) => {
  const where = {};
  const requestedEnterpriseId = parseScopedInteger(explicitEnterpriseId);
  const requestedServiceId = parseScopedInteger(explicitServiceId);
  const userEnterpriseId = parseScopedInteger(req.user?.enterpriseId);
  const userServiceId = parseScopedInteger(req.user?.serviceId);

  if (requestedEnterpriseId) {
    where.enterpriseId = requestedEnterpriseId;
  } else if (!isAdminLike(req.user) && userEnterpriseId) {
    where.enterpriseId = userEnterpriseId;
  }

  if (requestedServiceId) {
    where.serviceId = requestedServiceId;
  } else if (!isAdminLike(req.user) && userServiceId) {
    where.serviceId = userServiceId;
  }

  return where;
};

const getMissionWithInterventionState = (id) =>
  prisma.mission.findUnique({
    where: { id },
    include: {
      interventions: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

const missionHasInterventions = (mission) => Array.isArray(mission?.interventions) && mission.interventions.length > 0;
const missionHasCompletedIntervention = (mission) =>
  Array.isArray(mission?.interventions) && mission.interventions.some((intervention) => intervention.status === 'TERMINEE');

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatDateFr = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
};

const formatCurrencyFr = (amount) => {
  if (!amount) return '-';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(Number(amount));
};

const buildMissionPdfHtml = (mission) => {
  const techniciens = Array.isArray(mission?.techniciens) ? mission.techniciens : [];
  const interventions = Array.isArray(mission?.interventions) ? mission.interventions : [];

  return `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Fiche mission ${escapeHtml(mission.numeroMission || '')}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: Arial, sans-serif; color: #000; line-height: 1.3; font-size: 11px; }
          .sheet { width: 190mm; min-height: 277mm; margin: 0 auto; display: flex; flex-direction: column; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; gap: 12px; }
          .brand { display: flex; gap: 12px; align-items: flex-start; }
          .title { font-size: 18px; font-weight: 700; }
          .subtitle { font-size: 12px; color: #333; margin-top: 2px; }
          .meta { font-size: 11px; text-align: right; white-space: pre-line; }
          .section-title { font-size: 13px; font-weight: bold; margin: 12px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #000; }
          table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; }
          th, td { border: 1px solid #000; padding: 6px 8px; font-size: 11px; text-align: left; vertical-align: top; }
          th { background: #f0f0f0; }
          .footer { margin-top: auto; padding-top: 8px; border-top: 1px solid #000; font-size: 10px; text-align: center; color: #444; }
          .muted { color: #555; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <div class="brand">
              <div>
                <div class="title">PROGITECK</div>
                <div class="subtitle">Fiche de Mission</div>
                <div class="subtitle">${escapeHtml(mission?.titre || 'Mission')}</div>
              </div>
            </div>
            <div class="meta">N° Mission: ${escapeHtml(mission?.numeroMission || '-')}\nDate: ${escapeHtml(formatDateFr(mission?.dateDebut))}</div>
          </div>

          <div class="section-title">Informations générales</div>
          <table>
            <tbody>
              <tr><th>Titre</th><td>${escapeHtml(mission?.titre || '-')}</td><th>Statut</th><td>${escapeHtml(mission?.status || '-')}</td></tr>
              <tr><th>Priorité</th><td>${escapeHtml(mission?.priorite || '-')}</td><th>Budget estimé</th><td>${escapeHtml(formatCurrencyFr(mission?.budgetEstime))}</td></tr>
              <tr><th>Date début</th><td>${escapeHtml(formatDateFr(mission?.dateDebut))}</td><th>Date fin</th><td>${escapeHtml(formatDateFr(mission?.dateFin))}</td></tr>
              <tr><th>Description</th><td colspan="3">${escapeHtml(mission?.description || '-')}</td></tr>
              <tr><th>Notes</th><td colspan="3">${escapeHtml(mission?.notes || '-')}</td></tr>
            </tbody>
          </table>

          <div class="section-title">Client</div>
          <table>
            <tbody>
              <tr><th>Nom</th><td>${escapeHtml(mission?.clientNom || '-')}</td><th>Contact</th><td>${escapeHtml(mission?.clientContact || '-')}</td></tr>
              <tr><th>Adresse</th><td colspan="3">${escapeHtml(mission?.adresse || '-')}</td></tr>
            </tbody>
          </table>

          <div class="section-title">Techniciens assignés</div>
          <table>
            <thead>
              <tr><th>Nom</th><th>Email</th><th>Spécialité</th></tr>
            </thead>
            <tbody>
              ${techniciens.length ? techniciens.map((item) => {
                const tech = item?.technicien || {};
                return `<tr>
                  <td>${escapeHtml(`${tech.prenom || ''} ${tech.nom || ''}`.trim() || '-')}</td>
                  <td>${escapeHtml(tech.email || '-')}</td>
                  <td>${escapeHtml(tech.specialite?.nom || '-')}</td>
                </tr>`;
              }).join('') : '<tr><td colspan="3" class="muted">Aucun technicien assigné</td></tr>'}
            </tbody>
          </table>

          <div class="section-title">Interventions</div>
          <table>
            <thead>
              <tr><th>Titre</th><th>Date début</th><th>Statut</th></tr>
            </thead>
            <tbody>
              ${interventions.length ? interventions.map((item) => `<tr>
                <td>${escapeHtml(item?.titre || '-')}</td>
                <td>${escapeHtml(formatDateFr(item?.dateDebut))}</td>
                <td>${escapeHtml(item?.status || '-')}</td>
              </tr>`).join('') : '<tr><td colspan="3" class="muted">Aucune intervention</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <div>SARL au capital de 5 000 000 FCFA Siège Social Abengourou/Treichville RCCM N° CI-ABG-2021-M2-104</div>
            <div>N°CC : 2029843Z- Email : progiteck31@gmail.com – TEL : 225 0576208494/0142649927/0143859286</div>
            <div>N° de compte Bancaire : n°CI121 01302 034304800201 24 ORABANK</div>
          </div>
        </div>
      </body>
    </html>
  `;
};

module.exports = { PrismaClient, getNextMissionNumber, isForceDelete, syncMissionById, syncMissionsByClient, puppeteer, prisma, VALID_STATUSES, VALID_PRIORITIES, isAdminLike, parseScopedInteger, buildMissionScopeWhere, getMissionWithInterventionState, missionHasInterventions, missionHasCompletedIntervention, escapeHtml, formatDateFr, formatCurrencyFr, buildMissionPdfHtml };
