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
 * Get all addresses for a client
 */
exports.getAll = async (req, res) => {
  try {
    const { clientId, typeAdresse } = req.query;

    const where = { clientId };
    if (typeAdresse) where.typeAdresse = typeAdresse;

    const adresses = await prisma.adresseClient.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true
          }
        }
      },
      orderBy: [
        { isPrincipal: 'desc' },
        { typeAdresse: 'asc' },
        { ville: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: adresses
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des adresses:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des adresses'
    });
  }
};

/**
 * Create a new address
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
      clientId,
      typeAdresse,
      nomAdresse,
      ligne1,
      ligne2,
      ligne3,
      codePostal,
      ville,
      region,
      pays,
      isPrincipal,
      coordonneesGps,
      informationsAcces
    } = req.body;

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
    }

    // If setting as principal for this type, unset other principal addresses of same type
    if (isPrincipal) {
      await prisma.adresseClient.updateMany({
        where: {
          clientId,
          typeAdresse,
          isPrincipal: true
        },
        data: {
          isPrincipal: false
        }
      });
    }

    const adresse = await prisma.adresseClient.create({
      data: {
        clientId,
        typeAdresse,
        nomAdresse,
        ligne1,
        ligne2,
        ligne3,
        codePostal,
        ville,
        region,
        pays: pays || '""',
        isPrincipal: isPrincipal || false,
        coordonneesGps,
        informationsAcces
      }
    });

    // Create historique entry
    await prisma.historiqueClient.create({
      data: {
        clientId,
        typeChangement: 'CREATION',
        entite: 'ADRESSE',
        entiteId: adresse.id,
        nouvelleValeur: adresse,
        modifieParId: req.user.id,
        modifieLe: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    logger.info('Adresse créée', {
      adresseId: adresse.id,
      clientId,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Adresse créée avec succès',
      data: adresse
    });
  } catch (error) {
    logger.error('Erreur lors de la création de l\'adresse:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'adresse'
    });
  }
};

/**
 * Get address by ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const adresse = await prisma.adresseClient.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true,
            email: true,
            telephone: true
          }
        }
      }
    });

    if (!adresse) {
      return res.status(404).json({
        success: false,
        error: 'Adresse non trouvée'
      });
    }

    res.json({
      success: true,
      data: adresse
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'adresse:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'adresse'
    });
  }
};

/**
 * Update address
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

    const existingAdresse = await prisma.adresseClient.findUnique({
      where: { id }
    });

    if (!existingAdresse) {
      return res.status(404).json({
        success: false,
        error: 'Adresse non trouvée'
      });
    }

    // If setting as principal, unset other principal addresses of same type
    if (updateData.isPrincipal) {
      await prisma.adresseClient.updateMany({
        where: {
          clientId: existingAdresse.clientId,
          typeAdresse: existingAdresse.typeAdresse,
          isPrincipal: true,
          id: { not: id }
        },
        data: {
          isPrincipal: false
        }
      });
    }

    const adresse = await prisma.adresseClient.update({
      where: { id },
      data: updateData
    });

    // Create historique entry
    await prisma.historiqueClient.create({
      data: {
        clientId: existingAdresse.clientId,
        typeChangement: 'MODIFICATION',
        entite: 'ADRESSE',
        entiteId: id,
        nouvelleValeur: adresse,
        modifieParId: req.user.id,
        modifieLe: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    logger.info('Adresse mise à jour', {
      adresseId: id,
      clientId: existingAdresse.clientId,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Adresse mise à jour avec succès',
      data: adresse
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'adresse:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Adresse non trouvée'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'adresse'
    });
  }
};

/**
 * Delete address
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const adresse = await prisma.adresseClient.findUnique({
      where: { id }
    });

    if (!adresse) {
      return res.status(404).json({
        success: false,
        error: 'Adresse non trouvée'
      });
    }

    await prisma.$transaction(async (tx) => {
      // Create historique entry before deletion
      await tx.historiqueClient.create({
        data: {
          clientId: adresse.clientId,
          typeChangement: 'SUPPRESSION',
          entite: 'ADRESSE',
          entiteId: id,
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      // Delete the address
      await tx.adresseClient.delete({
        where: { id }
      });
    });

    logger.info('Adresse supprimée', {
      adresseId: id,
      clientId: adresse.clientId,
      userId: req.user.id
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'adresse:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Adresse non trouvée'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de l\'adresse'
    });
  }
};

/**
 * Set/unset address as principal for its type
 */
exports.setPrincipal = async (req, res) => {
  try {
    const { id } = req.params;

    const adresse = await prisma.adresseClient.findUnique({
      where: { id }
    });

    if (!adresse) {
      return res.status(404).json({
        success: false,
        error: 'Adresse non trouvée'
      });
    }

    await prisma.$transaction(async (tx) => {
      // Unset other principal addresses of same type
      await tx.adresseClient.updateMany({
        where: {
          clientId: adresse.clientId,
          typeAdresse: adresse.typeAdresse,
          isPrincipal: true,
          id: { not: id }
        },
        data: {
          isPrincipal: false
        }
      });

      // Set this address as principal
      await tx.adresseClient.update({
        where: { id },
        data: { isPrincipal: true }
      });
    });

    res.json({
      success: true,
      message: 'Adresse définie comme adresse principale'
    });
  } catch (error) {
    logger.error('Erreur lors de la modification de l\'adresse principale:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la modification de l\'adresse principale'
    });
  }
};