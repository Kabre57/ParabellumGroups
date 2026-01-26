const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

// Get all clients with pagination and filters
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, typeClient, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (typeClient) {
      where.typeClient = typeClient;
    }
    
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take,
        include: {
          contacts: true,
          contrats: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.client.count({ where })
    ]);

    res.json({
      data: clients,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des clients' });
  }
};

// Create client
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nom, email, telephone, adresse, typeClient, status } = req.body;

    const client = await prisma.client.create({
      data: {
        nom,
        email,
        telephone,
        adresse,
        typeClient,
        status: status || 'PROSPECT'
      },
      include: {
        contacts: true,
        contrats: true
      }
    });

    res.status(201).json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Un client avec cet email existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création du client' });
  }
};

// Get client by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        contacts: true,
        contrats: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    res.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du client' });
  }
};

// Update client
exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nom, email, telephone, adresse, typeClient } = req.body;

    const client = await prisma.client.update({
      where: { id },
      data: {
        nom,
        email,
        telephone,
        adresse,
        typeClient
      },
      include: {
        contacts: true,
        contrats: true
      }
    });

    res.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Un client avec cet email existe déjà' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du client' });
  }
};

// Update client status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIF', 'INACTIF', 'PROSPECT'].includes(status)) {
      return res.status(400).json({ error: 'Status invalide' });
    }

    const client = await prisma.client.update({
      where: { id },
      data: { status },
      include: {
        contacts: true,
        contrats: true
      }
    });

    res.json(client);
  } catch (error) {
    console.error('Error updating client status:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du status' });
  }
};
