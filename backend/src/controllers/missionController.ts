// -----------------------------------------------------------------------------
// NOTE IMPORTANTE : Ce fichier inclut UNE SEULE définition de `getVisibleMissions`.
// Si votre ancienne version en contenait plusieurs, supprimez les doublons.
// -----------------------------------------------------------------------------

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

/**
 * GET /missions
 * Liste paginée avec filtres (search, statut, priorite, clientId)
 */
export const getMissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, statut, priorite, clientId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { numIntervention: { contains: search as string, mode: 'insensitive' } },
        { natureIntervention: { contains: search as string, mode: 'insensitive' } },
        { objectifDuContrat: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (statut) whereClause.statut = statut;
    if (priorite) whereClause.priorite = priorite;
    if (clientId) whereClause.clientId = Number(clientId);

    const [missions, total] = await Promise.all([
      prisma.mission.findMany({
        where: whereClause,
        include: {
          client: { select: { name: true, customerNumber: true } }, // ⚠️ adapte si ton champ s'appelle "nom"
          _count: { select: { interventions: true, rapports: true } },
        },
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.mission.count({ where: whereClause }),
    ]);

    return res.json({
      success: true,
      data: {
        missions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des missions:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * GET /missions/:numIntervention
 * Détails d'une mission (interventions, techniciens, rapports)
 */
export const getMissionById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { numIntervention } = req.params;

    const mission = await prisma.mission.findUnique({
      where: { numIntervention },
      include: {
        client: true,
        interventions: {
          include: {
            techniciens: {
              include: {
                technicien: {
                  include: { specialite: true },
                },
              },
            },
          },
          orderBy: { dateHeureDebut: 'desc' },
        },
        rapports: {
          include: {
            technicien: { select: { nom: true, prenom: true } }, // ⚠️ adapte si tes champs diffèrent
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!mission) {
      return res.status(404).json({ success: false, message: 'Mission non trouvée' });
    }

    return res.json({ success: true, data: mission });
  } catch (error) {
    console.error('Erreur lors de la récupération de la mission:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * POST /missions
 * Création d'une mission
 */
export const createMission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }

    const {
      natureIntervention,
      objectifDuContrat,
      description,
      priorite,
      dateSortieFicheIntervention,
      clientId,
    } = req.body;

    // Vérifier que le client existe
    const client = await prisma.customer.findUnique({ where: { id: clientId } });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client non trouvé' });
    }

    // Générer le numéro d'intervention (INT-YYYY-0001)
    const lastMission = await prisma.mission.findFirst({ orderBy: { numIntervention: 'desc' } });
    let nextNumber = 1;
    if (lastMission) {
      const lastNumber = parseInt(lastMission.numIntervention.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const numIntervention = `INT-${new Date().getFullYear()}-${nextNumber.toString().padStart(4, '0')}`;

    const mission = await prisma.mission.create({
      data: {
        numIntervention,
        natureIntervention,
        objectifDuContrat,
        description,
        priorite: priorite || 'normale',
        dateSortieFicheIntervention: new Date(dateSortieFicheIntervention),
        clientId,
      },
      include: { client: true },
    });

    return res.status(201).json({ success: true, data: mission, message: 'Mission créée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la création de la mission:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * PUT /missions/:numIntervention
 * Mise à jour d'une mission
 */
export const updateMission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { numIntervention } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }

    const existingMission = await prisma.mission.findUnique({ where: { numIntervention } });
    if (!existingMission) {
      return res.status(404).json({ success: false, message: 'Mission non trouvée' });
    }

    const {
      natureIntervention,
      objectifDuContrat,
      description,
      priorite,
      statut,
      dateSortieFicheIntervention,
    } = req.body;

    const mission = await prisma.mission.update({
      where: { numIntervention },
      data: {
        natureIntervention,
        objectifDuContrat,
        description,
        priorite,
        statut,
        dateSortieFicheIntervention: dateSortieFicheIntervention
          ? new Date(dateSortieFicheIntervention)
          : undefined,
      },
      include: { client: true },
    });

    return res.json({ success: true, data: mission, message: 'Mission mise à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la mission:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * DELETE /missions/:numIntervention
 * Suppression d'une mission (refusée si interventions/rapports associés)
 */
export const deleteMission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { numIntervention } = req.params;

    const existingMission = await prisma.mission.findUnique({
      where: { numIntervention },
      include: { _count: { select: { interventions: true, rapports: true } } },
    });

    if (!existingMission) {
      return res.status(404).json({ success: false, message: 'Mission non trouvée' });
    }

    if (existingMission._count.interventions > 0 || existingMission._count.rapports > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une mission ayant des interventions ou rapports associés',
      });
    }

    await prisma.mission.delete({ where: { numIntervention } });
    return res.json({ success: true, message: 'Mission supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la mission:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * Validation des entrées
 */
export const validateMission = [
  body('natureIntervention').notEmpty().withMessage("Nature d'intervention requise"),
  body('objectifDuContrat').notEmpty().withMessage('Objectif du contrat requis'),
  body('dateSortieFicheIntervention').isISO8601().withMessage('Date de sortie invalide'),
  body('clientId').isInt().withMessage('Client requis'),
  body('priorite')
    .optional()
    .isIn(['basse', 'normale', 'haute', 'urgente'])
    .withMessage('Priorité invalide'),
];

/**
 * GET /missions/visible
 * Liste "publique" (lecture) des missions actives : planifiée / en_cours / non_terminee
 * ⚠️ Si votre modèle utilise `client.name` (et non `client.nom`), adaptez le select ci-dessous.
 */
export const getVisibleMissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const missions = await prisma.mission.findMany({
      where: { statut: { in: ['planifiee', 'en_cours', 'non_terminee'] } },
      select: {
        numIntervention: true,
        titre: true, // ⚠️ si votre modèle n'a pas "titre", utilisez un champ présent (ex: natureIntervention)
        client: { select: { nom: true } }, // ⚠️ adapte à { name: true } si c'est "name"
        dateDebut: true, // ⚠️ si vos colonnes sont différentes, adapter (ex: dateSortieFicheIntervention)
        dateFinPrevue: true,
        statut: true,
      },
      orderBy: [{ dateDebut: 'asc' }],
    });

    return res.json({ success: true, data: missions });
  } catch (error) {
    console.error('[getVisibleMissions] error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
