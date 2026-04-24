const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer-core');
const { getNextMissionNumber } = require('../utils/missionNumberGenerator');
const prisma = new PrismaClient();
const { isForceDelete } = require('../utils/authz');
const { syncMissionById, syncMissionsByClient } = require('../services/crmMissionSync');

const VALID_STATUSES = ['PLANIFIEE', 'EN_COURS', 'SUSPENDUE', 'TERMINEE', 'ANNULEE'];
const VALID_PRIORITIES = ['BASSE', 'MOYENNE', 'HAUTE', 'URGENTE'];

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

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priorite, search } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }
    if (priorite && VALID_PRIORITIES.includes(priorite)) {
      where.priorite = priorite;
    }
    if (search) {
      where.OR = [
        { numeroMission: { contains: search, mode: 'insensitive' } },
        { titre: { contains: search, mode: 'insensitive' } },
        { clientNom: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [missions, total] = await Promise.all([
      prisma.mission.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          techniciens: {
            include: {
              technicien: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true,
                  email: true
                }
              }
            }
          },
          interventions: {
            select: {
              id: true,
              status: true,
            },
          },
          _count: {
            select: {
              interventions: true,
              techniciens: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.mission.count({ where })
    ]);

    res.json({
      success: true,
      message: 'Missions récupérées avec succès',
      data: missions,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAll missions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des missions'
    });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      titre,
      description,
      clientId,
      adresseId,
      clientNom,
      nomAdresseChantier,
      clientContact,
      adresse,
      dateDebut,
      dateFin,
      priorite = 'MOYENNE',
      budgetEstime,
      notes
    } = req.body;

    if (!titre || !clientNom || !adresse || !dateDebut) {
      return res.status(400).json({
        success: false,
        error: 'Les champs titre, clientNom, adresse et dateDebut sont requis'
      });
    }

    if (priorite && !VALID_PRIORITIES.includes(priorite)) {
      return res.status(400).json({
        success: false,
        error: `La priorité doit être l'une des suivantes: ${VALID_PRIORITIES.join(', ')}`
      });
    }

    const numeroMission = await getNextMissionNumber();

    const mission = await prisma.mission.create({
      data: {
        numeroMission,
        titre,
        description,
        crmClientId: clientId || null,
        crmAdresseId: adresseId || null,
        clientNom,
        nomAdresseChantier,
        clientContact,
        adresse,
        dateDebut: new Date(dateDebut),
        dateFin: dateFin ? new Date(dateFin) : null,
        priorite,
        budgetEstime,
        notes
      }
    });

    res.status(201).json({
      success: true,
      message: 'Mission créée avec succès',
      data: mission
    });
  } catch (error) {
    console.error('Error in create mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la mission'
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const mission = await prisma.mission.findUnique({
      where: { id },
      include: {
        techniciens: {
          include: {
            technicien: {
              include: {
                specialite: true
              }
            }
          }
        },
        interventions: {
          include: {
            techniciens: {
              include: {
                technicien: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Mission récupérée avec succès',
      data: mission
    });
  } catch (error) {
    console.error('Error in getById mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la mission'
    });
  }
};

exports.assignTechnicien = async (req, res) => {
  try {
    const { id } = req.params;
    const { technicienId, role } = req.body;

    if (!technicienId) {
      return res.status(400).json({
        success: false,
        error: 'Le champ technicienId est requis'
      });
    }

    const mission = await getMissionWithInterventionState(id);

    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée'
      });
    }

    if (missionHasCompletedIntervention(mission)) {
      return res.status(409).json({
        success: false,
        error: 'Impossible de modifier une mission ayant une intervention terminée'
      });
    }

    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }

    const assignment = await prisma.missionTechnicien.create({
      data: {
        missionId: id,
        technicienId,
        role
      },
      include: {
        technicien: {
          include: {
            specialite: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Technicien assigné à la mission avec succès',
      data: assignment
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Ce technicien est déjà assigné à cette mission'
      });
    }
    console.error('Error in assignTechnicien:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'assignation du technicien'
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Le statut doit être l'un des suivants: ${VALID_STATUSES.join(', ')}`
      });
    }

    const missionExist = await getMissionWithInterventionState(id);

    if (!missionExist) {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée'
      });
    }

    if (missionHasCompletedIntervention(missionExist)) {
      return res.status(409).json({
        success: false,
        error: 'Impossible de modifier le statut d\'une mission ayant une intervention terminée'
      });
    }

    const mission = await prisma.mission.update({
      where: { id },
      data: { status }
    });

    res.json({
      success: true,
      message: 'Statut de la mission mis à jour avec succès',
      data: mission
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée'
      });
    }
    console.error('Error in updateStatus mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du statut'
    });
  }
};

exports.getPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const mission = await prisma.mission.findUnique({
      where: { id },
      include: {
        techniciens: {
          include: {
            technicien: {
              include: {
                specialite: true,
              },
            },
          },
        },
        interventions: {
          include: {
            techniciens: {
              include: {
                technicien: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée',
      });
    }

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
    const browser = await puppeteer.launch({
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(buildMissionPdfHtml(mission), { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="fiche-mission-${mission.numeroMission || id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error in getPdf mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du PDF de la mission',
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titre,
      description,
      clientId,
      adresseId,
      clientNom,
      nomAdresseChantier,
      clientContact,
      adresse,
      dateDebut,
      dateFin,
      priorite,
      budgetEstime,
      notes,
      status,
    } = req.body;

    const missionExist = await getMissionWithInterventionState(id);

    if (!missionExist) {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée'
      });
    }

    if (missionHasCompletedIntervention(missionExist)) {
      return res.status(409).json({
        success: false,
        error: 'Impossible de modifier une mission ayant une intervention terminée'
      });
    }

    if (priorite && !VALID_PRIORITIES.includes(priorite)) {
      return res.status(400).json({
        success: false,
        error: `La priorité doit être l'une des suivantes: ${VALID_PRIORITIES.join(', ')}`
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Le statut doit être l'une des suivantes: ${VALID_STATUSES.join(', ')}`
      });
    }

    const mission = await prisma.mission.update({
      where: { id },
      data: {
        titre,
        description,
        crmClientId: clientId || undefined,
        crmAdresseId: adresseId || undefined,
        clientNom,
        nomAdresseChantier,
        clientContact,
        adresse,
        dateDebut: dateDebut ? new Date(dateDebut) : undefined,
        dateFin: dateFin ? new Date(dateFin) : null,
        priorite,
        budgetEstime,
        notes,
        status,
      },
      include: {
        interventions: {
          select: {
            id: true,
            status: true,
          },
        },
        _count: {
          select: {
            interventions: true,
            techniciens: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Mission mise à jour avec succès',
      data: mission
    });
  } catch (error) {
    console.error('Error in update mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la mission'
    });
  }
};

exports.resyncFromCrm = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await syncMissionById(id, req);

    if (!result.updated) {
      return res.status(400).json({
        success: false,
        error: result.reason || 'Impossible de resynchroniser la mission depuis le CRM',
      });
    }

    res.json({
      success: true,
      message: 'Mission resynchronisée depuis le CRM',
      data: result.mission,
    });
  } catch (error) {
    console.error('Error in resyncFromCrm:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la resynchronisation CRM de la mission',
    });
  }
};

exports.resyncFromCrmByClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { addressId, deletedAddressId } = req.body || {};
    const result = await syncMissionsByClient({ clientId, addressId, deletedAddressId }, req);

    res.json({
      success: true,
      message: 'Missions resynchronisées depuis le CRM',
      data: {
        updated: result.updated,
        missions: result.missions,
      },
    });
  } catch (error) {
    console.error('Error in resyncFromCrmByClient:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la resynchronisation CRM des missions',
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const forceDelete = isForceDelete(req);

    const mission = await getMissionWithInterventionState(id);

    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée'
      });
    }

    if (missionHasCompletedIntervention(mission) && !forceDelete) {
      return res.status(409).json({
        success: false,
        error: 'Impossible de supprimer une mission ayant une intervention terminée'
      });
    }

    if (missionHasInterventions(mission) && !forceDelete) {
      return res.status(409).json({
        success: false,
        error: 'Impossible de supprimer une mission qui contient déjà des interventions'
      });
    }

    await prisma.$transaction(async (tx) => {
      if (forceDelete && missionHasInterventions(mission)) {
        const interventionIds = mission.interventions.map((intervention) => intervention.id);

        if (interventionIds.length > 0) {
          await tx.rapport.deleteMany({
            where: {
              interventionId: { in: interventionIds }
            }
          });
        }
      }

      await tx.mission.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: 'Mission supprimée avec succès'
    });
  } catch (error) {
    console.error('Error in delete mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la mission'
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      prisma.mission.count({ where: { status: 'PLANIFIEE' } }),
      prisma.mission.count({ where: { status: 'EN_COURS' } }),
      prisma.mission.count({ where: { status: 'TERMINEE' } }),
      prisma.mission.count({ where: { status: 'ANNULEE' } }),
      prisma.mission.count()
    ]);

    res.json({
      success: true,
      message: 'Statistiques des missions récupérées avec succès',
      data: {
        planifiees: stats[0],
        enCours: stats[1],
        terminees: stats[2],
        annulees: stats[3],
        total: stats[4]
      }
    });
  } catch (error) {
    console.error('Error in getStats missions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
};
