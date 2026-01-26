const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { generateContratNumber } = require('../utils/contratNumberGenerator');

const prisma = new PrismaClient();

// Get all contrats
exports.getAll = async (req, res) => {
  try {
    const { clientId, status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (clientId) {
      where.clientId = clientId;
    }
    if (status) {
      where.status = status;
    }

    const [contrats, total] = await Promise.all([
      prisma.contrat.findMany({
        where,
        skip,
        take,
        include: {
          client: {
            select: {
              id: true,
              nom: true,
              email: true,
              typeClient: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.contrat.count({ where })
    ]);

    res.json({
      data: contrats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching contrats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des contrats' });
  }
};

// Create contrat
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { clientId, titre, dateDebut, dateFin, montant, status } = req.body;

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    // Generate unique contract number
    const numeroContrat = await generateContratNumber(prisma);

    const contrat = await prisma.contrat.create({
      data: {
        clientId,
        numeroContrat,
        titre,
        dateDebut: new Date(dateDebut),
        dateFin: dateFin ? new Date(dateFin) : null,
        montant,
        status: status || 'BROUILLON'
      },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            email: true,
            typeClient: true
          }
        }
      }
    });

    res.status(201).json(contrat);
  } catch (error) {
    console.error('Error creating contrat:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Un contrat avec ce numéro existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création du contrat' });
  }
};

// Get contrat by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const contrat = await prisma.contrat.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            contacts: true
          }
        }
      }
    });

    if (!contrat) {
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }

    res.json(contrat);
  } catch (error) {
    console.error('Error fetching contrat:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du contrat' });
  }
};

// Update contrat status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['BROUILLON', 'ACTIF', 'SUSPENDU', 'TERMINE'].includes(status)) {
      return res.status(400).json({ error: 'Status invalide' });
    }

    const contrat = await prisma.contrat.update({
      where: { id },
      data: { status },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            email: true,
            typeClient: true
          }
        }
      }
    });

    res.json(contrat);
  } catch (error) {
    console.error('Error updating contrat status:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du status' });
  }
};

// Get contrat statistics
exports.getStats = async (req, res) => {
  try {
    const [
      total,
      brouillon,
      actif,
      suspendu,
      termine,
      montantTotal
    ] = await Promise.all([
      prisma.contrat.count(),
      prisma.contrat.count({ where: { status: 'BROUILLON' } }),
      prisma.contrat.count({ where: { status: 'ACTIF' } }),
      prisma.contrat.count({ where: { status: 'SUSPENDU' } }),
      prisma.contrat.count({ where: { status: 'TERMINE' } }),
      prisma.contrat.aggregate({
        _sum: {
          montant: true
        },
        where: {
          status: { in: ['ACTIF', 'BROUILLON'] }
        }
      })
    ]);

    res.json({
      total,
      byStatus: {
        brouillon,
        actif,
        suspendu,
        termine
      },
      montantTotal: montantTotal._sum.montant || 0
    });
  } catch (error) {
    console.error('Error fetching contrat stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
};
