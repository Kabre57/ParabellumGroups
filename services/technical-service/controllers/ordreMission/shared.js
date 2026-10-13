// Donnees, normalisations et rendu HTML partages des ordres de mission.
const { PrismaClient } = require('@prisma/client');
const { getNextMissionOrderNumber } = require('../../utils/missionOrderNumberGenerator');

const prisma = new PrismaClient();

const VEHICLE_TYPES = ['VEHICULE_DE_SERVICE', 'VEHICULE_DE_TRANSPORT'];
const ORDER_STATUSES = ['GENERE', 'IMPRIME', 'ARCHIVE'];

const formatVehicleLabel = (vehiculeType) =>
  vehiculeType === 'VEHICULE_DE_TRANSPORT' ? 'VEHICULE DE TRANSPORT' : 'VEHICULE DE SERVICE';

const getMissionDestination = (mission) => mission?.adresse || 'DESTINATION A PRECISER';
const getMissionObject = (mission, intervention) => intervention?.titre || mission?.description || mission?.titre || 'MISSION TECHNIQUE';
const getPieceIdentite = (technicien) => technicien?.matricule || technicien?.employeeNumber || '';
const getFonction = (technicien) => technicien?.specialite?.nom || technicien?.poste || 'TECHNICIEN D INTERVENTION';
const getQualite = (intervention) => intervention?.titre || 'TECHNICIEN D INTERVENTION';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatDateFr = (date) => {
  if (!date) return '........../........../............';
  return new Date(date).toLocaleDateString('fr-FR');
};

const buildMissionOrderHtml = (order) => {
  const technicianName = [order.technicien?.prenom, order.technicien?.nom].filter(Boolean).join(' ').trim() || 'TECHNICIEN';
  const destination = (order.destination || 'DESTINATION A PRECISER').toUpperCase();
  const missionTitle = `MISSION A ${destination}`;

  return `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Ordre de mission ${escapeHtml(order.numeroOrdre)}</title>
        <style>
          @page { size: A4 portrait; margin: 24mm 18mm; }
          body { font-family: Arial, sans-serif; color: #111; font-size: 14px; line-height: 1.35; }
          .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
          .brand { font-size: 24px; font-weight: 700; color: #1d4ed8; }
          .meta { text-align: right; font-size: 13px; white-space: pre-line; }
          .title-box { text-align: center; margin: 18px 0 26px; }
          .title-box .title { display: inline-block; border: 2px solid #111; padding: 10px 28px; font-size: 28px; font-weight: 700; }
          .title-box .subtitle { margin-top: 14px; font-size: 22px; font-weight: 700; text-transform: uppercase; }
          .lead { text-align: center; font-size: 15px; font-weight: 700; margin-bottom: 28px; text-transform: uppercase; }
          .page { min-height: 245mm; display: flex; flex-direction: column; }
          .line { display: grid; grid-template-columns: 240px 16px 1fr; gap: 8px; align-items: baseline; margin-bottom: 12px; }
          .label { font-weight: 700; white-space: nowrap; }
          .value { border-bottom: 1px dotted #222; min-height: 20px; padding-bottom: 2px; }
          .closing { margin-top: 28px; font-size: 13px; }
          .signature { margin-top: auto; padding-top: 60px; text-align: right; }
          .signature .role { font-size: 16px; font-weight: 700; margin-bottom: 48px; }
          .signature .name { font-size: 17px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="page">
          <div>
            <div class="top">
              <div class="meta" style="text-align:left;">Ordre de mission N° ${escapeHtml(order.numeroOrdre)}</div>
              <div class="meta">Abidjan, le ${escapeHtml(new Date().toLocaleDateString('fr-FR'))}</div>
            </div>

            <div class="title-box">
              <div class="title">ORDRE DE MISSION</div>
              <div class="subtitle">${escapeHtml(missionTitle)}</div>
            </div>

            <div class="lead">LE DIRECTEUR GENERAL DE LA SOCIETE PROGITECK SARL</div>

            <div class="line"><div class="label">Donne ordre à</div><div>:</div><div class="value">${escapeHtml(technicianName.toUpperCase())}</div></div>
            <div class="line"><div class="label">Pièce d'identité</div><div>:</div><div class="value">${escapeHtml(order.pieceIdentite || 'NON RENSEIGNE')}</div></div>
            <div class="line"><div class="label">Fonction</div><div>:</div><div class="value">${escapeHtml((order.fonction || '').toUpperCase())}</div></div>
            <div class="line"><div class="label">En Qualité de</div><div>:</div><div class="value">${escapeHtml((order.qualite || '').toUpperCase())}</div></div>
            <div class="line"><div class="label">De se rendre en mission à</div><div>:</div><div class="value">${escapeHtml(destination)}</div></div>
            <div class="line"><div class="label">Objet de la mission</div><div>:</div><div class="value">${escapeHtml(order.objetMission || '')}</div></div>
            <div class="line"><div class="label">Moyen de transport</div><div>:</div><div class="value">${escapeHtml((order.vehiculeLabel || order.vehiculeType || '').toUpperCase())}</div></div>
            <div class="line"><div class="label">Date de départ</div><div>:</div><div class="value">${escapeHtml(formatDateFr(order.dateDepart))}</div></div>
            <div class="line"><div class="label">Date de retour</div><div>:</div><div class="value">${escapeHtml(formatDateFr(order.dateRetour))}</div></div>

            <div class="closing">
              En foi de quoi, nous lui délivrons cet ordre de mission, pour servir et valoir ce que de droit.
            </div>
          </div>

          <div class="signature">
            <div class="role">DIECTEUR DES OPERATIONS</div>
          </div>
        </div>
      </body>
    </html>
  `;
};

const includeOrderRelations = {
  mission: true,
  intervention: {
    select: {
      id: true,
      titre: true,
      dateDebut: true,
      dateFin: true,
      status: true,
    },
  },
  technicien: {
    include: {
      specialite: true,
    },
  },
};

async function buildOrderCreateInput({
  client,
  mission,
  intervention,
  technicien,
  vehiculeType,
  vehiculeLabel,
  pieceIdentite,
  fonction,
  qualite,
  destination,
  objetMission,
  notes,
  createdByUserId,
}) {
  const dateDepart = intervention?.dateDebut || mission?.dateDebut || new Date();

  return {
    numeroOrdre: await getNextMissionOrderNumber(new Date(), client),
    missionId: mission.id,
    interventionId: intervention?.id || null,
    technicienId: technicien.id,
    pieceIdentite: pieceIdentite?.trim() || getPieceIdentite(technicien) || null,
    fonction: fonction?.trim() || getFonction(technicien),
    qualite: qualite?.trim() || getQualite(intervention),
    vehiculeType,
    vehiculeLabel: vehiculeLabel?.trim() || formatVehicleLabel(vehiculeType),
    destination: destination?.trim() || getMissionDestination(mission),
    objetMission: objetMission?.trim() || getMissionObject(mission, intervention),
    dateDepart,
    dateRetour: intervention?.dateFin || mission.dateFin || null,
    notes: notes?.trim() || null,
    createdByUserId: createdByUserId || null,
  };
}

module.exports = { prisma, VEHICLE_TYPES, ORDER_STATUSES, buildMissionOrderHtml, includeOrderRelations, buildOrderCreateInput };
