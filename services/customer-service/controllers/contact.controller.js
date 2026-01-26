const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

// Get all contacts
exports.getAll = async (req, res) => {
  try {
    const { clientId } = req.query;

    const where = {};
    if (clientId) {
      where.clientId = clientId;
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des contacts' });
  }
};

// Create contact
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { clientId, nom, prenom, email, telephone, poste, principal } = req.body;

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    // If setting as principal, unset other principal contacts
    if (principal) {
      await prisma.contact.updateMany({
        where: {
          clientId,
          principal: true
        },
        data: {
          principal: false
        }
      });
    }

    const contact = await prisma.contact.create({
      data: {
        clientId,
        nom,
        prenom,
        email,
        telephone,
        poste,
        principal: principal || false
      },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(contact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Erreur lors de la création du contact' });
  }
};

// Get contact by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            email: true,
            telephone: true
          }
        }
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact non trouvé' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du contact' });
  }
};

// Update contact
exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nom, prenom, email, telephone, poste, principal } = req.body;

    // If setting as principal, unset other principal contacts
    if (principal) {
      const contact = await prisma.contact.findUnique({
        where: { id }
      });

      if (contact) {
        await prisma.contact.updateMany({
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
    }

    const updatedContact = await prisma.contact.update({
      where: { id },
      data: {
        nom,
        prenom,
        email,
        telephone,
        poste,
        principal
      },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            email: true
          }
        }
      }
    });

    res.json(updatedContact);
  } catch (error) {
    console.error('Error updating contact:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Contact non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du contact' });
  }
};

// Delete contact
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.contact.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting contact:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Contact non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression du contact' });
  }
};
