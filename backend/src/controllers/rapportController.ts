import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getRapports = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, missionId, technicienId, statut } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { titre: { contains: search as string, mode: 'insensitive' } },
        { contenu: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (missionId) {
      whereClause.missionId = missionId as string;
    }

    if (technicienId) {
      whereClause.technicienId = Number(technicienId);
    }

    if (statut) {
      whereClause.statut = statut;
    }

    const [rapports, total] = await Promise.all([
      prisma.rapportMission.findMany({
        where: whereClause,
        include: {
          mission: {
            include: {
              client: {
                select: { name: true }
              }
            }
          },
          technicien: {
            include: {
              specialite: true
            }
          },
          intervention: {
            select: { id: true, dateHeureDebut: true, dateHeureFin: true }
          },
          images: true
        },
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.rapportMission.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        rapports,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des rapports:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getRapportById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const rapport = await prisma.rapportMission.findUnique({
      where: { id: Number(id) },
      include: {
        mission: {
          include: {
            client: true
          }
        },
        technicien: {
          include: {
            specialite: true,
            utilisateur: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        },
        intervention: true,
        images: {
          orderBy: { ordre: 'asc' }
        }
      }
    });

    if (!rapport) {
      return res.status(404).json({
        success: false,
        message: 'Rapport non trouvé'
      });
    }

    res.json({
      success: true,
      data: rapport
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du rapport:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createRapport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const {
      titre,
      contenu,
      interventionId,
      technicienId,
      missionId,
      commentaire,
      images
    } = req.body;

    const rapport = await prisma.rapportMission.create({
      data: {
        titre,
        contenu,
        interventionId,
        technicienId,
        missionId,
        commentaire,
        images: images ? {
          create: images.map((img: any, index: number) => ({
            url: img.url,
            description: img.description,
            ordre: index + 1
          }))
        } : undefined
      },
      include: {
        mission: {
          include: {
            client: true
          }
        },
        technicien: {
          include: {
            specialite: true
          }
        },
        images: true
      }
    });

    res.status(201).json({
      success: true,
      data: rapport,
      message: 'Rapport créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du rapport:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateRapport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const existingRapport = await prisma.rapportMission.findUnique({
      where: { id: Number(id) }
    });

    if (!existingRapport) {
      return res.status(404).json({
        success: false,
        message: 'Rapport non trouvé'
      });
    }

    const rapport = await prisma.rapportMission.update({
      where: { id: Number(id) },
      data: req.body,
      include: {
        mission: true,
        technicien: true,
        images: true
      }
    });

    res.json({
      success: true,
      data: rapport,
      message: 'Rapport mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du rapport:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteRapport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingRapport = await prisma.rapportMission.findUnique({
      where: { id: Number(id) }
    });

    if (!existingRapport) {
      return res.status(404).json({
        success: false,
        message: 'Rapport non trouvé'
      });
    }

    await prisma.rapportMission.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Rapport supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du rapport:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const uploadRapportImages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { images } = req.body;

    const rapport = await prisma.rapportMission.findUnique({
      where: { id: Number(id) }
    });

    if (!rapport) {
      return res.status(404).json({
        success: false,
        message: 'Rapport non trouvé'
      });
    }

    const createdImages = await prisma.rapportImage.createMany({
      data: images.map((img: any, index: number) => ({
        rapportId: Number(id),
        url: img.url,
        description: img.description,
        ordre: index + 1
      }))
    });

    res.status(201).json({
      success: true,
      data: createdImages,
      message: 'Images ajoutées avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload des images:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateRapport = [
  body('titre').notEmpty().withMessage('Titre requis'),
  body('contenu').notEmpty().withMessage('Contenu requis'),
  body('technicienId').isInt().withMessage('Technicien requis'),
  body('missionId').notEmpty().withMessage('Mission requise')
];