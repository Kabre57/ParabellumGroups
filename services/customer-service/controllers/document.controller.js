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
 * Get all documents with filtering
 */
exports.getAll = async (req, res) => {
  try {
    const {
      clientId,
      contratId,
      typeDocument,
      categorie,
      estValide,
      page = 1,
      limit = 20,
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (clientId) where.clientId = clientId;
    if (contratId) where.contratId = contratId;
    if (typeDocument) where.typeDocument = typeDocument;
    if (categorie) where.categorie = categorie;
    if (estValide !== undefined) where.estValide = estValide === 'true';
    
    if (search) {
      where.OR = [
        { nomFichier: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { motsCles: { has: search } }
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.documentClient.findMany({
        where,
        skip,
        take,
        include: {
          client: {
            select: {
              id: true,
              nom: true,
              raisonSociale: true
            }
          },
          contrat: {
            select: {
              id: true,
              titre: true,
              numeroContrat: true
            }
          }
        },
        orderBy: { dateUpload: 'desc' }
      }),
      prisma.documentClient.count({ where })
    ]);

    res.json({
      success: true,
      data: documents,
      meta: {
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des documents:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des documents'
    });
  }
};

/**
 * Upload a new document
 */
exports.upload = async (req, res) => {
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
      contratId,
      typeDocument,
      categorie,
      nomFichier,
      chemin,
      taille,
      mimeType,
      description,
      motsCles,
      version,
      estValide,
      dateExpiration,
      signatureDigitale,
      confidential
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

    // Verify contract exists if provided
    if (contratId) {
      const contrat = await prisma.contrat.findUnique({
        where: { id: contratId }
      });
      
      if (!contrat) {
        return res.status(404).json({
          success: false,
          error: 'Contrat non trouvé'
        });
      }
    }

    const document = await prisma.documentClient.create({
      data: {
        clientId,
        contratId,
        typeDocument,
        categorie,
        nomFichier,
        chemin,
        taille: parseInt(taille),
        mimeType,
        description,
        motsCles: motsCles || [],
        version: version || '1.0',
        estValide: estValide !== false,
        dateExpiration: dateExpiration ? new Date(dateExpiration) : null,
        uploadedById: req.user.id,
        dateUpload: new Date(),
        signatureDigitale,
        confidential: confidential || false
      },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true
          }
        }
      }
    });

    // Create historique entry
    await prisma.historiqueClient.create({
      data: {
        clientId,
        typeChangement: 'CREATION',
        entite: 'DOCUMENT',
        entiteId: document.id,
        nouvelleValeur: document,
        modifieParId: req.user.id,
        modifieLe: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    logger.info('Document uploadé', {
      documentId: document.id,
      clientId,
      userId: req.user.id,
      type: document.typeDocument
    });

    res.status(201).json({
      success: true,
      message: 'Document uploadé avec succès',
      data: document
    });
  } catch (error) {
    logger.error('Erreur lors de l\'upload du document:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload du document'
    });
  }
};

/**
 * Get document by ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.documentClient.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true,
            email: true
          }
        },
        contrat: {
          select: {
            id: true,
            titre: true,
            numeroContrat: true,
            reference: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document non trouvé'
      });
    }

    // Check confidentiality
    if (document.confidential && req.user.role !== 'admin' && document.uploadedById !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Accès interdit - Document confidentiel'
      });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du document:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du document'
    });
  }
};

/**
 * Update document metadata
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

    const existingDocument = await prisma.documentClient.findUnique({
      where: { id }
    });

    if (!existingDocument) {
      return res.status(404).json({
        success: false,
        error: 'Document non trouvé'
      });
    }

    // Check permissions for confidential documents
    if (existingDocument.confidential && req.user.role !== 'admin' && existingDocument.uploadedById !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Accès interdit - Document confidentiel'
      });
    }

    // Handle date conversions
    if (updateData.dateExpiration) {
      updateData.dateExpiration = new Date(updateData.dateExpiration);
    }
    if (updateData.taille) {
      updateData.taille = parseInt(updateData.taille);
    }

    const document = await prisma.documentClient.update({
      where: { id },
      data: {
        ...updateData,
        dateModification: new Date()
      }
    });

    // Create historique entry
    await prisma.historiqueClient.create({
      data: {
        clientId: existingDocument.clientId,
        typeChangement: 'MODIFICATION',
        entite: 'DOCUMENT',
        entiteId: id,
        nouvelleValeur: document,
        modifieParId: req.user.id,
        modifieLe: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    logger.info('Document mis à jour', {
      documentId: id,
      clientId: existingDocument.clientId,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Document mis à jour avec succès',
      data: document
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du document:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Document non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du document'
    });
  }
};

/**
 * Delete document
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.documentClient.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document non trouvé'
      });
    }

    // Check permissions for confidential documents
    if (document.confidential && req.user.role !== 'admin' && document.uploadedById !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Accès interdit - Document confidentiel'
      });
    }

    await prisma.$transaction(async (tx) => {
      // Create historique entry before deletion
      await tx.historiqueClient.create({
        data: {
          clientId: document.clientId,
          typeChangement: 'SUPPRESSION',
          entite: 'DOCUMENT',
          entiteId: id,
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      // Delete the document
      await tx.documentClient.delete({
        where: { id }
      });
    });

    logger.info('Document supprimé', {
      documentId: id,
      clientId: document.clientId,
      userId: req.user.id
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Erreur lors de la suppression du document:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Document non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du document'
    });
  }
};

/**
 * Update document validity
 */
exports.updateValidity = async (req, res) => {
  try {
    const { id } = req.params;
    const { estValide, raison } = req.body;

    const document = await prisma.documentClient.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document non trouvé'
      });
    }

    const updatedDocument = await prisma.documentClient.update({
      where: { id },
      data: {
        estValide: estValide !== false,
        dateModification: new Date()
      }
    });

    // Create historique entry
    await prisma.historiqueClient.create({
      data: {
        clientId: document.clientId,
        typeChangement: 'VALIDITE',
        entite: 'DOCUMENT',
        entiteId: id,
        ancienneValeur: { estValide: document.estValide },
        nouvelleValeur: { estValide: updatedDocument.estValide, raison },
        modifieParId: req.user.id,
        modifieLe: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      success: true,
      message: `Document marqué comme ${estValide ? 'valide' : 'invalide'}`,
      data: updatedDocument
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la validité:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la validité'
    });
  }
};

/**
 * Get expired or expiring soon documents
 */
exports.getExpiring = async (req, res) => {
  try {
    const { days = 30, clientId } = req.query;
    const thresholdDate = new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000);

    const where = {
      dateExpiration: {
        lte: thresholdDate,
        gte: new Date()
      },
      estValide: true
    };
    
    if (clientId) where.clientId = clientId;

    const documents = await prisma.documentClient.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true,
            email: true
          }
        }
      },
      orderBy: { dateExpiration: 'asc' }
    });

    const expired = await prisma.documentClient.findMany({
      where: {
        dateExpiration: {
          lt: new Date()
        },
        estValide: true
      },
      take: 10,
      orderBy: { dateExpiration: 'desc' }
    });

    res.json({
      success: true,
      data: {
        expiring: documents,
        expired,
        meta: {
          thresholdDays: parseInt(days),
          thresholdDate,
          expiringCount: documents.length,
          expiredCount: expired.length
        }
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des documents expirants:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des documents expirants'
    });
  }
};