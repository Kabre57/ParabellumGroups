// Depot, modification et suppression des documents clients.
const { prisma, logger, validationResult } = require('./shared');

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
