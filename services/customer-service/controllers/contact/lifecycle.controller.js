const { scopedPrisma, scalarData, assertParentUnchanged } = require('../../utils/scopedPrisma');
const { respondScopeError } = require('../../utils/enterpriseScope');
// Creation, modification et suppression des contacts clients.
const { prisma, logger, validationResult, normalizeOptionalString, normalizeContactPayload } = require('./shared');

/**
 * Create a new contact
 */
exports.create = async (req, res) => {
  try {
    const scoped = await scopedPrisma(req, prisma);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const normalizedPayload = normalizeContactPayload(req.body);
    const {
      clientId,
      civilite,
      nom,
      prenom,
      email,
      emailSecondaire,
      telephone,
      mobile,
      poste,
      departement,
      type,
      principal,
      statut,
      dateNaissance,
      notes,
      preferencesContact
    } = normalizedPayload;

    // Verify client exists
    const client = await scoped.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
    }

    // If setting as principal, unset other principal contacts
    if (principal) {
      await scoped.contact.updateMany({
        where: {
          clientId,
          principal: true
        },
        data: {
          principal: false
        }
      });
    }

    const contact = await scoped.contact.create({
      data: {
        clientId,
        civilite,
        nom,
        prenom,
        email,
        emailSecondaire,
        telephone,
        mobile,
        poste,
        departement,
        type: type || 'COMMERCIAL',
        statut: statut || 'ACTIF',
        principal: principal || false,
        dateNaissance: dateNaissance ? new Date(dateNaissance) : null,
        notes,
        preferencesContact
      },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true,
            email: true
          }
        }
      }
    });

    // Create historique entry
    await scoped.historiqueClient.create({
      data: {
        clientId,
        typeChangement: 'CREATION',
        entite: 'CONTACT',
        entiteId: contact.id,
        nouvelleValeur: contact,
        modifieParId: req.user.id,
        modifieLe: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    logger.info('Contact créé', {
      contactId: contact.id,
      clientId,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Contact créé avec succès',
      data: contact
    });
  } catch (error) {
    if (respondScopeError(res, error)) return;
    logger.error('Erreur lors de la création du contact:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Un contact avec cet email existe déjà pour ce client'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du contact',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update contact
 */
exports.update = async (req, res) => {
  try {
    const scoped = await scopedPrisma(req, prisma);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = normalizeContactPayload(scalarData('contact', req.body));

    // Get existing contact
    const existingContact = await scoped.contact.findUnique({
      where: { id }
    });

    if (!existingContact) {
      return res.status(404).json({
        success: false,
        error: 'Contact non trouvé'
      });
    }

    assertParentUnchanged(updateData, 'clientId', existingContact);

    // If setting as principal, unset other principal contacts
    if (updateData.principal) {
      await scoped.contact.updateMany({
        where: {
          clientId: existingContact.clientId,
          principal: true,
          id: { not: id }
        },
        data: {
          principal: false
        }
      });
    }

    const contact = await scoped.$transaction(async (tx) => {
      const oldContact = { ...existingContact };

      const updatedContact = await tx.contact.update({
        where: { id },
        data: updateData
      });

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId: existingContact.clientId,
          typeChangement: 'MODIFICATION',
          entite: 'CONTACT',
          entiteId: id,
          ancienneValeur: oldContact,
          nouvelleValeur: updatedContact,
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return updatedContact;
    });

    logger.info('Contact mis à jour', {
      contactId: id,
      userId: req.user.id,
      clientId: contact.clientId
    });

    res.json({
      success: true,
      message: 'Contact mis à jour avec succès',
      data: contact
    });
  } catch (error) {
    if (respondScopeError(res, error)) return;
    logger.error('Erreur lors de la mise à jour du contact:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Contact non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du contact',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete contact
 */
exports.delete = async (req, res) => {
  try {
    const scoped = await scopedPrisma(req, prisma);
    const { id } = req.params;

    const contact = await scoped.contact.findUnique({
      where: { id },
      select: { clientId: true }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact non trouvé'
      });
    }

    await scoped.$transaction(async (tx) => {
      // Create historique entry before deletion
      await tx.historiqueClient.create({
        data: {
          clientId: contact.clientId,
          typeChangement: 'SUPPRESSION',
          entite: 'CONTACT',
          entiteId: id,
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      // Delete the contact
      await tx.contact.delete({
        where: { id }
      });
    });

    logger.info('Contact supprimé', {
      contactId: id,
      userId: req.user.id,
      clientId: contact.clientId
    });

    res.status(204).send();
  } catch (error) {
    if (respondScopeError(res, error)) return;
    logger.error('Erreur lors de la suppression du contact:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Contact non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du contact',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Set/unset contact as principal
 */
exports.setPrincipal = async (req, res) => {
  try {
    const scoped = await scopedPrisma(req, prisma);
    const { id } = req.params;
    const { principal } = req.body;

    const contact = await scoped.contact.findUnique({
      where: { id }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact non trouvé'
      });
    }

    await scoped.$transaction(async (tx) => {
      // If setting as principal, unset other principal contacts
      if (principal) {
        await tx.contact.updateMany({
          where: {
            clientId: contact.clientId,
            principal: true,
            id: { not: id }
          },
          data: {
            principal: false
          }
        });
      }

      // Update the contact
      await tx.contact.update({
        where: { id },
        data: { principal }
      });
    });

    res.json({
      success: true,
      message: principal
        ? 'Contact défini comme contact principal'
        : 'Contact retiré des contacts principaux'
    });
  } catch (error) {
    if (respondScopeError(res, error)) return;
    logger.error('Erreur lors de la modification du contact principal:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la modification du contact principal'
    });
  }
};
