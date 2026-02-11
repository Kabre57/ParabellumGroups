const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer-core');
const path = require('path');
const prisma = new PrismaClient();
const { uploadBuffer, deleteObject, MINIO_BUCKET } = require('../utils/s3');

const VALID_STATUSES = ['BROUILLON', 'SOUMIS', 'VALIDE', 'REJETE'];

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, interventionId, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (interventionId) {
      where.interventionId = interventionId;
    }
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    const [rapports, total] = await Promise.all([
      prisma.rapport.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          intervention: {
            select: {
              id: true,
              titre: true,
              mission: {
                select: {
                  numeroMission: true,
                  titre: true
                }
              }
            }
          },
          redacteur: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              email: true
            }
          }
        },
        orderBy: { dateCreation: 'desc' }
      }),
      prisma.rapport.count({ where })
    ]);

    res.json({
      success: true,
      message: 'Rapports récupérés avec succès',
      data: rapports,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAll rapports:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des rapports'
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { interventionId, titre, contenu, conclusions, recommandations, redacteurId: bodyRedacteurId } = req.body;
    const headerRedacteurId = req.headers['x-user-id'];

    if (!interventionId || !titre || !contenu) {
      return res.status(400).json({
        success: false,
        error: 'Les champs interventionId, titre et contenu sont requis'
      });
    }

    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: {
        techniciens: true
      }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    let redacteurId = bodyRedacteurId || headerRedacteurId;
    if (redacteurId) {
      const existing = await prisma.technicien.findUnique({ where: { id: redacteurId } });
      if (!existing) {
        redacteurId = null;
      }
    }

    if (!redacteurId) {
      const fallbackTech = intervention.techniciens?.[0];
      if (fallbackTech?.technicienId) {
        redacteurId = fallbackTech.technicienId;
      }
    }

    if (!redacteurId) {
      return res.status(400).json({
        success: false,
        error: 'Aucun technicien assigné à l’intervention pour définir le rédacteur'
      });
    }

    const rapport = await prisma.rapport.create({
      data: {
        interventionId,
        redacteurId,
        titre,
        contenu,
        conclusions,
        recommandations
      },
      include: {
        intervention: {
          select: {
            id: true,
            titre: true,
            mission: {
              select: {
                numeroMission: true,
                titre: true
              }
            }
          }
        },
        redacteur: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Rapport créé avec succès',
      data: rapport
    });
  } catch (error) {
    console.error('Error in create rapport:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du rapport'
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

    const updateData = { status };
    if (status === 'VALIDE') {
      updateData.dateValidation = new Date();
    }

    const rapport = await prisma.rapport.update({
      where: { id },
      data: updateData,
      include: {
        intervention: {
          select: {
            titre: true,
            mission: {
              select: {
                numeroMission: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Statut du rapport mis à jour avec succès',
      data: rapport
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Rapport non trouvé'
      });
    }
    console.error('Error in updateStatus rapport:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du statut'
    });
  }
};

/**
 * Récupère un rapport par son ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const rapport = await prisma.rapport.findUnique({
      where: { id },
      include: {
        intervention: {
          include: {
            mission: {
              select: {
                id: true,
                numeroMission: true,
                titre: true,
                clientNom: true,
                clientContact: true,
                adresse: true,
                description: true,
                dateDebut: true,
                dateFin: true,
                priorite: true,
                status: true
              }
            },
            techniciens: {
              include: {
                technicien: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    email: true,
                    telephone: true,
                    matricule: true
                  }
                }
              }
            },
            materielUtilise: {
              include: {
                materiel: {
                  select: {
                    id: true,
                    reference: true,
                    nom: true
                  }
                },
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
        },
        redacteur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            matricule: true,
            competences: true,
            specialite: {
              select: {
                nom: true
              }
            }
          }
        }
      }
    });

    if (!rapport) {
      return res.status(404).json({
        success: false,
        error: 'Rapport non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Rapport récupéré avec succès',
      data: rapport
    });
  } catch (error) {
    console.error('Error in getById rapport:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du rapport'
    });
  }
};

/**
 * Upload des photos liées à un rapport
 */
exports.uploadPhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier reçu'
      });
    }

    const rapport = await prisma.rapport.findUnique({ where: { id } });
    if (!rapport) {
      return res.status(404).json({
        success: false,
        error: 'Rapport non trouvé'
      });
    }

    const publicBaseUrl = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000';
    const uploadedUrls = [];

    for (const file of files) {
      const safeName = (file.originalname || 'photo')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(-120);
      const key = `rapports/${id}/${Date.now()}-${safeName}`;

      await uploadBuffer({
        key,
        buffer: file.buffer,
        contentType: file.mimetype,
      });

      uploadedUrls.push(`${publicBaseUrl}/${process.env.MINIO_BUCKET || 'rapport-photos'}/${key}`);
    }

    const updated = await prisma.rapport.update({
      where: { id },
      data: {
        photos: {
          push: uploadedUrls
        }
      }
    });

    res.json({
      success: true,
      message: 'Photos uploadées avec succès',
      data: { photos: updated.photos }
    });
  } catch (error) {
    console.error('Error in uploadPhotos rapport:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload des photos'
    });
  }
};

/**
 * Supprime une photo d'un rapport
 */
exports.deletePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { url } = req.body || {};

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL de la photo manquante'
      });
    }

    const rapport = await prisma.rapport.findUnique({ where: { id } });
    if (!rapport) {
      return res.status(404).json({
        success: false,
        error: 'Rapport non trouvé'
      });
    }

    const bucket = process.env.MINIO_BUCKET || MINIO_BUCKET || 'rapport-photos';
    const marker = `/${bucket}/`;
    const index = url.indexOf(marker);
    const key = index >= 0 ? url.slice(index + marker.length) : null;

    if (key) {
      await deleteObject({ key });
    }

    const nextPhotos = (rapport.photos || []).filter((photoUrl) => photoUrl !== url);
    const updated = await prisma.rapport.update({
      where: { id },
      data: { photos: { set: nextPhotos } }
    });

    res.json({
      success: true,
      message: 'Photo supprimée avec succès',
      data: { photos: updated.photos }
    });
  } catch (error) {
    console.error('Error in deletePhoto rapport:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la photo'
    });
  }
};

/**
 * Génère un PDF pour un rapport
 */
exports.getPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const rapport = await prisma.rapport.findUnique({
      where: { id },
      include: {
        intervention: {
          include: {
            mission: true,
            techniciens: {
              include: {
                technicien: true
              }
            }
          }
        },
        redacteur: {
          include: {
            specialite: true
          }
        }
      }
    });

    if (!rapport) {
      return res.status(404).json({
        success: false,
        error: 'Rapport non trouvé'
      });
    }

    const escapeHtml = (value) => {
      if (value === null || value === undefined) return '';
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const mission = rapport.intervention?.mission;
    const techniciens = rapport.intervention?.techniciens || [];
    const photos = Array.isArray(rapport.photos) ? rapport.photos : [];
    const internalBaseUrl = process.env.MINIO_INTERNAL_URL;
    const photosForPdf = internalBaseUrl
      ? photos.map((url) => url.replace(process.env.MINIO_PUBLIC_URL || '', internalBaseUrl))
      : photos;

    const logoUrl = process.env.REPORT_LOGO_URL || '';
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #000; margin: 0; padding: 24px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; gap: 12px; }
          .header-left { display: flex; align-items: center; gap: 12px; }
          .logo { width: 56px; height: 56px; object-fit: contain; }
          .watermark {
            position: fixed;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 48px;
            color: rgba(0, 0, 0, 0.08);
            z-index: 0;
            pointer-events: none;
            white-space: nowrap;
          }
          .title { font-size: 18px; font-weight: bold; }
          .subtitle { font-size: 12px; color: #333; }
          .section-title { font-size: 13px; font-weight: bold; margin: 12px 0 6px; border-bottom: 1px solid #000; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th, td { border: 1px solid #000; padding: 6px 8px; font-size: 11px; text-align: left; vertical-align: top; }
          th { background: #f0f0f0; }
          .photos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .photos img { width: 100%; border: 1px solid #ccc; }
          .footer { margin-top: 16px; border-top: 1px solid #000; padding-top: 6px; font-size: 10px; text-align: center; color: #444; }
        </style>
      </head>
      <body>
        <div class="watermark">RAPPORT ${escapeHtml(String(rapport.id).slice(0, 8).toUpperCase())}</div>
        <div class="header">
          <div class="header-left">
            ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" />` : ''}
            <div>
              <div class="title">PARABELLUM GROUP</div>
              <div class="subtitle">Rapport d'Intervention</div>
              <div class="subtitle">${escapeHtml(rapport.titre || 'Rapport')}</div>
            </div>
          </div>
          <div class="subtitle">
            Réf: ${escapeHtml(String(rapport.id).slice(0, 8).toUpperCase())}<br/>
            Date: ${escapeHtml(new Date(rapport.dateCreation).toLocaleDateString('fr-FR'))}
          </div>
        </div>

        <div class="section-title">Mission associée</div>
        <table>
          <tbody>
            <tr>
              <th>N° Mission</th>
              <td>${escapeHtml(mission?.numeroMission || '-')}</td>
              <th>Titre</th>
              <td>${escapeHtml(mission?.titre || '-')}</td>
            </tr>
            <tr>
              <th>Client</th>
              <td>${escapeHtml(mission?.clientNom || '-')}</td>
              <th>Contact</th>
              <td>${escapeHtml(mission?.clientContact || '-')}</td>
            </tr>
            <tr>
              <th>Adresse</th>
              <td colspan="3">${escapeHtml(mission?.adresse || '-')}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">Techniciens</div>
        <table>
          <thead>
            <tr><th>Nom</th><th>Email</th><th>Spécialité</th></tr>
          </thead>
          <tbody>
            ${techniciens.length ? techniciens.map((t) => {
              const tech = t.technicien || {};
              return `<tr>
                <td>${escapeHtml(`${tech.prenom || ''} ${tech.nom || ''}`.trim())}</td>
                <td>${escapeHtml(tech.email || '-')}</td>
                <td>${escapeHtml(tech.specialite?.nom || '-')}</td>
              </tr>`;
            }).join('') : '<tr><td colspan="3">Aucun technicien</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">Observations</div>
        <table>
          <tbody>
            <tr><th>Travaux effectués</th><td>${escapeHtml(rapport.contenu || '-')}</td></tr>
            <tr><th>Conclusions</th><td>${escapeHtml(rapport.conclusions || '-')}</td></tr>
            <tr><th>Recommandations</th><td>${escapeHtml(rapport.recommandations || '-')}</td></tr>
          </tbody>
        </table>

        <div class="section-title">Photos</div>
        <div class="photos">
          ${photosForPdf.length ? photosForPdf.map((url) => `<img src="${escapeHtml(url)}" />`).join('') : '<div>Aucune photo</div>'}
        </div>

        <div class="footer">
          PARABELLUM GROUP • Service Technique Professionnel
        </div>
      </body>
      </html>
    `;

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
    const browser = await puppeteer.launch({
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="rapport-${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error in getPdf rapport:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du PDF'
    });
  }
};
