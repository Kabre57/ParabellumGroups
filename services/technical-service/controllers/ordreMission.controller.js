const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer-core');
const { getNextMissionOrderNumber } = require('../utils/missionOrderNumberGenerator');

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

exports.getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit,
      pageSize,
      missionId,
      interventionId,
      technicienId,
      status,
      search,
      dateFrom,
      dateTo,
    } = req.query;

    const effectiveLimit = parseInt(limit || pageSize || 20, 10);
    const where = {};

    if (missionId) where.missionId = missionId;
    if (interventionId) where.interventionId = interventionId;
    if (technicienId) where.technicienId = technicienId;
    if (status && ORDER_STATUSES.includes(status)) where.status = status;
    if (dateFrom || dateTo) {
      where.dateDepart = {};
      if (dateFrom) where.dateDepart.gte = new Date(dateFrom);
      if (dateTo) where.dateDepart.lte = new Date(dateTo);
    }
    if (search) {
      where.OR = [
        { numeroOrdre: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
        { objetMission: { contains: search, mode: 'insensitive' } },
        { mission: { is: { titre: { contains: search, mode: 'insensitive' } } } },
        { technicien: { is: { nom: { contains: search, mode: 'insensitive' } } } },
        { technicien: { is: { prenom: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * effectiveLimit;

    const [orders, total] = await Promise.all([
      prisma.ordreMission.findMany({
        where,
        skip,
        take: effectiveLimit,
        include: includeOrderRelations,
        orderBy: [{ dateDepart: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.ordreMission.count({ where }),
    ]);

    res.json({
      success: true,
      message: 'Ordres de mission recuperes avec succes',
      data: orders,
      page: parseInt(page, 10),
      limit: effectiveLimit,
      total,
      pages: Math.ceil(total / effectiveLimit),
    });
  } catch (error) {
    console.error('Error in getAll ordres mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recuperation des ordres de mission',
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.ordreMission.findUnique({
      where: { id },
      include: includeOrderRelations,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Ordre de mission non trouve',
      });
    }

    res.json({
      success: true,
      message: 'Ordre de mission recupere avec succes',
      data: order,
    });
  } catch (error) {
    console.error('Error in getById ordre mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recuperation de l ordre de mission',
    });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      missionId,
      interventionId,
      technicienId,
      vehiculeType,
      vehiculeLabel,
      pieceIdentite,
      fonction,
      qualite,
      destination,
      objetMission,
      notes,
    } = req.body;

    if (!missionId || !technicienId || !vehiculeType) {
      return res.status(400).json({
        success: false,
        error: 'Les champs missionId, technicienId et vehiculeType sont requis',
      });
    }

    if (!VEHICLE_TYPES.includes(vehiculeType)) {
      return res.status(400).json({
        success: false,
        error: `Le type de vehicule doit etre l une des valeurs suivantes: ${VEHICLE_TYPES.join(', ')}`,
      });
    }

    const [mission, technicien, intervention] = await Promise.all([
      prisma.mission.findUnique({ where: { id: missionId } }),
      prisma.technicien.findUnique({ where: { id: technicienId } }),
      interventionId ? prisma.intervention.findUnique({
        where: { id: interventionId },
        include: {
          techniciens: true,
        },
      }) : Promise.resolve(null),
    ]);

    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission non trouvee' });
    }
    if (!technicien) {
      return res.status(404).json({ success: false, error: 'Technicien non trouve' });
    }
    if (interventionId && !intervention) {
      return res.status(404).json({ success: false, error: 'Intervention non trouvee' });
    }
    if (intervention && intervention.missionId !== missionId) {
      return res.status(400).json({ success: false, error: 'L intervention ne correspond pas a la mission selectionnee' });
    }
    if (intervention) {
      const isAssigned = intervention.techniciens.some((assignment) => assignment.technicienId === technicienId);
      if (!isAssigned) {
        return res.status(400).json({
          success: false,
          error: 'Ce technicien n est pas affecte a cette intervention',
        });
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const data = await buildOrderCreateInput({
        client: tx,
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
        createdByUserId: req.user?.id,
      });

      return tx.ordreMission.create({
        data,
        include: includeOrderRelations,
      });
    });

    res.status(201).json({
      success: true,
      message: 'Ordre de mission genere avec succes',
      data: order,
    });
  } catch (error) {
    console.error('Error in create ordre mission:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la generation de l ordre de mission',
    });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const {
      interventionId,
      technicienIds,
      vehiculeType,
      vehiculeLabel,
      qualite,
      destination,
      objetMission,
      notes,
    } = req.body;

    if (!interventionId || !vehiculeType) {
      return res.status(400).json({
        success: false,
        error: 'Les champs interventionId et vehiculeType sont requis',
      });
    }

    if (!VEHICLE_TYPES.includes(vehiculeType)) {
      return res.status(400).json({
        success: false,
        error: `Le type de vehicule doit etre l une des valeurs suivantes: ${VEHICLE_TYPES.join(', ')}`,
      });
    }

    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: {
        mission: true,
        techniciens: {
          include: {
            technicien: {
              include: {
                specialite: true,
              },
            },
          },
        },
      },
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvee',
      });
    }

    const selectedIds = Array.isArray(technicienIds) && technicienIds.length > 0
      ? technicienIds
      : intervention.techniciens.map((assignment) => assignment.technicienId);

    const assignments = intervention.techniciens.filter((assignment) => selectedIds.includes(assignment.technicienId));

    if (assignments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucun technicien affecte a cette intervention',
      });
    }

    const createdOrders = await prisma.$transaction(async (tx) => {
      const orders = [];

      for (const assignment of assignments) {
        const data = await buildOrderCreateInput({
          client: tx,
          mission: intervention.mission,
          intervention,
          technicien: assignment.technicien,
          vehiculeType,
          vehiculeLabel,
          qualite,
          destination,
          objetMission,
          notes,
          createdByUserId: req.user?.id,
        });

        const order = await tx.ordreMission.create({
          data,
          include: includeOrderRelations,
        });
        orders.push(order);
      }

      return orders;
    });

    res.status(201).json({
      success: true,
      message: `${createdOrders.length} ordre(s) de mission genere(s) avec succes`,
      data: createdOrders,
    });
  } catch (error) {
    console.error('Error in createBatch ordres mission:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la generation en lot des ordres de mission',
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      pieceIdentite,
      fonction,
      qualite,
      destination,
      objetMission,
      vehiculeType,
      vehiculeLabel,
      dateDepart,
      dateRetour,
      notes,
      status,
    } = req.body;

    const existing = await prisma.ordreMission.findUnique({
      where: { id },
      include: includeOrderRelations,
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Ordre de mission non trouve',
      });
    }

    if (vehiculeType && !VEHICLE_TYPES.includes(vehiculeType)) {
      return res.status(400).json({
        success: false,
        error: `Le type de vehicule doit etre l une des valeurs suivantes: ${VEHICLE_TYPES.join(', ')}`,
      });
    }

    if (status && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Le statut doit etre l une des valeurs suivantes: ${ORDER_STATUSES.join(', ')}`,
      });
    }

    const order = await prisma.ordreMission.update({
      where: { id },
      data: {
        pieceIdentite: pieceIdentite !== undefined ? (pieceIdentite?.trim() || null) : undefined,
        fonction: fonction !== undefined ? (fonction?.trim() || null) : undefined,
        qualite: qualite !== undefined ? (qualite?.trim() || null) : undefined,
        destination: destination !== undefined ? (destination?.trim() || existing.destination) : undefined,
        objetMission: objetMission !== undefined ? (objetMission?.trim() || existing.objetMission) : undefined,
        vehiculeType: vehiculeType || undefined,
        vehiculeLabel: vehiculeLabel !== undefined ? (vehiculeLabel?.trim() || null) : undefined,
        dateDepart: dateDepart ? new Date(dateDepart) : undefined,
        dateRetour: dateRetour !== undefined ? (dateRetour ? new Date(dateRetour) : null) : undefined,
        notes: notes !== undefined ? (notes?.trim() || null) : undefined,
        status: status || undefined,
      },
      include: includeOrderRelations,
    });

    res.json({
      success: true,
      message: 'Ordre de mission mis a jour avec succes',
      data: order,
    });
  } catch (error) {
    console.error('Error in update ordre mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise a jour de l ordre de mission',
    });
  }
};

exports.markPrinted = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.ordreMission.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Ordre de mission non trouve',
      });
    }

    const order = await prisma.ordreMission.update({
      where: { id },
      data: {
        status: 'IMPRIME',
        printedAt: new Date(),
      },
      include: includeOrderRelations,
    });

    res.json({
      success: true,
      message: 'Ordre de mission marque comme imprime',
      data: order,
    });
  } catch (error) {
    console.error('Error in markPrinted ordre mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise a jour de l ordre de mission',
    });
  }
};

exports.getPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.ordreMission.findUnique({
      where: { id },
      include: includeOrderRelations,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Ordre de mission non trouve',
      });
    }

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
    const browser = await puppeteer.launch({
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(buildMissionOrderHtml(order), { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    if (order.status !== 'IMPRIME') {
      await prisma.ordreMission.update({
        where: { id },
        data: {
          status: 'IMPRIME',
          printedAt: new Date(),
        },
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ordre-mission-${order.numeroOrdre}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error in getPdf ordre mission:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la generation du PDF de l ordre de mission',
    });
  }
};
