import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const createRapportImage = async (req: AuthenticatedRequest, res: Response) => {
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
      rapportId,
      url,
      description,
      ordre
    } = req.body;

    // Vérifier que le rapport existe
    const rapport = await prisma.rapportMission.findUnique({
      where: { id: rapportId }
    });

    if (!rapport) {
      return res.status(404).json({
        success: false,
        message: 'Rapport non trouvé'
      });
    }

    const rapportImage = await prisma.rapportImage.create({
      data: {
        rapportId,
        url,
        description,
        ordre: ordre || 0
      },
      include: {
        rapport: true
      }
    });

    res.status(201).json({
      success: true,
      data: rapportImage,
      message: 'Image ajoutée au rapport avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'image:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getImagesByRapport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rapportId } = req.params;

    const images = await prisma.rapportImage.findMany({
      where: { rapportId: Number(rapportId) },
      orderBy: { ordre: 'asc' }
    });

    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des images:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteRapportImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingImage = await prisma.rapportImage.findUnique({
      where: { id: Number(id) }
    });

    if (!existingImage) {
      return res.status(404).json({
        success: false,
        message: 'Image non trouvée'
      });
    }

    await prisma.rapportImage.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Image supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'image:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateRapportImage = [
  body('rapportId').isInt({ min: 1 }).withMessage('Rapport requis'),
  body('url').notEmpty().withMessage('URL de l\'image requise')
];