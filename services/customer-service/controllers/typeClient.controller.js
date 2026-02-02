const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const winston = require('winston');

const prisma = new PrismaClient();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

/**
 * Get all client types
 */
exports.getAll = async (req, res) => {
  try {
    const { isActive } = req.query;

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const typeClients = await prisma.typeClient.findMany({
      where,
      orderBy: [
        { ordre: 'asc' },
        { libelle: 'asc' }
      ],
      include: {
        _count: {
          select: {
            clients: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: typeClients
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des types de client:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des types de client'
    });
  }
};

/**
 * Create a new client type
 */
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      code,
      libelle,
      description,
      couleur,
      icone,
      ordre,
      isActive
    } = req.body;

    // Check if code already exists
    const existingType = await prisma.typeClient.findUnique({
      where: { code }
    });

    if (existingType) {
      return res.status(409).json({
        success: false,
        error: 'Un type de client avec ce code existe déjà'
      });
    }

    const typeClient = await prisma.typeClient.create({
      data: {
        code,
        libelle,
        description,
        couleur: couleur || '#3B82F6',
        icone,
        ordre: ordre || 0,
        isActive: isActive !== false,
        createdBy: req.user.id
      }
    });

    logger.info('Type de client créé', {
      typeClientId: typeClient.id,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Type de client créé avec succès',
      data: typeClient
    });
  } catch (error) {
    logger.error('Erreur lors de la création du type de client:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Un type de client avec ce code existe déjà'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du type de client'
    });
  }
};

/**
 * Get client type by ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const typeClient = await prisma.typeClient.findUnique({
      where: { id },
      include: {
        clients: {
          take: 10,
          select: {
            id: true,
            nom: true,
            raisonSociale: true,
            email: true,
            status: true
          }
        },
        _count: {
          select: {
            clients: true
          }
        }
      }
    });

    if (!typeClient) {
      return res.status(404).json({
        success: false,
        error: 'Type de client non trouvé'
      });
    }

    res.json({
      success: true,
      data: typeClient
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du type de client:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du type de client'
    });
  }
};

/**
 * Update client type
 */
exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const typeClient = await prisma.typeClient.update({
      where: { id },
      data: {
        ...updateData,
        updatedBy: req.user.id
      }
    });

    logger.info('Type de client mis à jour', {
      typeClientId: id,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Type de client mis à jour avec succès',
      data: typeClient
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du type de client:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Type de client non trouvé'
      });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Un type de client avec ce code existe déjà'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du type de client'
    });
  }
};

/**
 * Delete client type
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if type is used by clients
    const clientCount = await prisma.client.count({
      where: { typeClientId: id }
    });

    if (clientCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de supprimer ce type de client car il est utilisé par des clients',
        clientCount
      });
    }

    await prisma.typeClient.delete({
      where: { id }
    });

    logger.info('Type de client supprimé', {
      typeClientId: id,
      userId: req.user.id
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Erreur lors de la suppression du type de client:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Type de client non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du type de client'
    });
  }
};

/**
 * Toggle client type active status
 */
exports.toggleActive = async (req, res) => {
  try {
    const { id } = req.params;

    const typeClient = await prisma.typeClient.findUnique({
      where: { id }
    });

    if (!typeClient) {
      return res.status(404).json({
        success: false,
        error: 'Type de client non trouvé'
      });
    }

    const updatedTypeClient = await prisma.typeClient.update({
      where: { id },
      data: {
        isActive: !typeClient.isActive,
        updatedBy: req.user.id
      }
    });

    res.json({
      success: true,
      message: `Type de client ${updatedTypeClient.isActive ? 'activé' : 'désactivé'}`,
      data: updatedTypeClient
    });
  } catch (error) {
    logger.error('Erreur lors du changement de statut du type de client:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du changement de statut du type de client'
    });
  }
};