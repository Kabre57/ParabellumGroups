const { scopedPrisma, scalarData, assertParentUnchanged } = require('../utils/scopedPrisma');
const { respondScopeError } = require('../utils/enterpriseScope');
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const winston = require('winston');
const { syncMissionsFromClientAddress } = require('../services/technicalMissionSync');

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
    const scoped = await scopedPrisma(req, prisma);
    const { clientId, typeAdresse } = req.query;

    const where = { clientId };
    if (typeAdresse) where.typeAdresse = typeAdresse;

    const adresses = await scoped.adresseClient.findMany({
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
    if (respondScopeError(res, error)) return;
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
    const scoped = await scopedPrisma(req, prisma);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation adresse en échec', {
        context: {
          userId: req.user?.id,
          errors: errors.array()
        }
      });
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

    const cleanData = {
      clientId,
      typeAdresse,
      nomAdresse: nomAdresse || null,
      ligne1,
      ligne2: ligne2 || null,
      ligne3: ligne3 || null,
      codePostal: codePostal || null,
      ville,
      region: region || null,
      pays: pays || "Cote d'Ivoire",
      isPrincipal: Boolean(isPrincipal),
      coordonneesGps: coordonneesGps || null,
      informationsAcces: informationsAcces || null
    };

    // Verify client exists
    const client = await scoped.client.findUnique({
      where: { id: cleanData.clientId }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
    }

    // If setting as principal for this type, unset other principal addresses of same type
    if (isPrincipal) {
      await scoped.adresseClient.updateMany({
        where: {
          clientId: cleanData.clientId,
          typeAdresse: cleanData.typeAdresse,
          isPrincipal: true
        },
        data: {
          isPrincipal: false
        }
      });
    }

    const adresse = await scoped.adresseClient.create({
      data: {
        ...cleanData
      }
    });

    // Create historique entry
    await scoped.historiqueClient.create({
      data: {
        clientId: cleanData.clientId,
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

    await syncMissionsFromClientAddress(req, cleanData.clientId, { addressId: adresse.id });

    res.status(201).json({
      success: true,
      message: 'Adresse créée avec succès',
      data: adresse
    });
  } catch (error) {
    if (respondScopeError(res, error)) return;
    logger.error('Erreur lors de la création de l\'adresse:', {
      message: error?.message,
      stack: error?.stack,
      body: req.body
    });
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
    const scoped = await scopedPrisma(req, prisma);
    const { id } = req.params;

    const adresse = await scoped.adresseClient.findUnique({
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
    if (respondScopeError(res, error)) return;
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
    const scoped = await scopedPrisma(req, prisma);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation mise à jour adresse en échec', {
        context: {
          userId: req.user?.id,
          errors: errors.array()
        }
      });
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = Object.fromEntries(
      Object.entries(scalarData('adresseClient', req.body || {})).map(([key, value]) => [
        key,
        value === '' ? null : value
      ])
    );

    const existingAdresse = await scoped.adresseClient.findUnique({
      where: { id }
    });

    if (!existingAdresse) {
      return res.status(404).json({
        success: false,
        error: 'Adresse non trouvée'
      });
    }

    // If setting as principal, unset other principal addresses of same type
    assertParentUnchanged(updateData, 'clientId', existingAdresse);

    if (updateData.isPrincipal) {
      await scoped.adresseClient.updateMany({
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

    const adresse = await scoped.adresseClient.update({
      where: { id },
      data: updateData
    });

    // Create historique entry
    await scoped.historiqueClient.create({
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

    await syncMissionsFromClientAddress(req, existingAdresse.clientId, { addressId: id });

    res.json({
      success: true,
      message: 'Adresse mise à jour avec succès',
      data: adresse
    });
  } catch (error) {
    if (respondScopeError(res, error)) return;
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
    const scoped = await scopedPrisma(req, prisma);
    const { id } = req.params;

    const adresse = await scoped.adresseClient.findUnique({
      where: { id }
    });

    if (!adresse) {
      return res.status(404).json({
        success: false,
        error: 'Adresse non trouvée'
      });
    }

    await scoped.$transaction(async (tx) => {
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

    await syncMissionsFromClientAddress(req, adresse.clientId, { deletedAddressId: id });

    res.status(204).send();
  } catch (error) {
    if (respondScopeError(res, error)) return;
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
    const scoped = await scopedPrisma(req, prisma);
    const { id } = req.params;

    const adresse = await scoped.adresseClient.findUnique({
      where: { id }
    });

    if (!adresse) {
      return res.status(404).json({
        success: false,
        error: 'Adresse non trouvée'
      });
    }

    await scoped.$transaction(async (tx) => {
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

    await syncMissionsFromClientAddress(req, adresse.clientId, { addressId: id });

    res.json({
      success: true,
      message: 'Adresse définie comme adresse principale'
    });
  } catch (error) {
    if (respondScopeError(res, error)) return;
    logger.error('Erreur lors de la modification de l\'adresse principale:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la modification de l\'adresse principale'
    });
  }
};
