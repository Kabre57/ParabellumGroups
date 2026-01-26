const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { generateDemandeAchatNumber } = require('../utils/purchaseNumberGenerator');

const prisma = new PrismaClient();

// Get all demandes achat with pagination and filters
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, demandeurId, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (demandeurId) {
      where.demandeurId = demandeurId;
    }
    
    if (search) {
      where.OR = [
        { titre: { contains: search, mode: 'insensitive' } },
        { numeroDemande: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [demandes, total] = await Promise.all([
      prisma.demandeAchat.findMany({
        where,
        skip,
        take,
        include: {
          bonsCommande: {
            select: {
              id: true,
              numeroBon: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.demandeAchat.count({ where })
    ]);

    res.json({
      data: demandes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching demandes achat:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des demandes d\'achat' });
  }
};

// Create demande achat
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { titre, description, demandeurId, dateDemande, montantEstime, status } = req.body;

    // Generate unique numero demande
    const numeroDemande = await generateDemandeAchatNumber(prisma);

    const demande = await prisma.demandeAchat.create({
      data: {
        numeroDemande,
        titre,
        description,
        demandeurId,
        dateDemande: dateDemande ? new Date(dateDemande) : new Date(),
        montantEstime,
        status: status || 'BROUILLON'
      },
      include: {
        bonsCommande: true
      }
    });

    res.status(201).json(demande);
  } catch (error) {
    console.error('Error creating demande achat:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la demande d\'achat' });
  }
};

// Get demande achat by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const demande = await prisma.demandeAchat.findUnique({
      where: { id },
      include: {
        bonsCommande: {
          include: {
            fournisseur: true,
            lignes: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!demande) {
      return res.status(404).json({ error: 'Demande d\'achat non trouvée' });
    }

    res.json(demande);
  } catch (error) {
    console.error('Error fetching demande achat:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la demande d\'achat' });
  }
};

// Update demande achat
exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { titre, description, montantEstime } = req.body;

    const demande = await prisma.demandeAchat.update({
      where: { id },
      data: {
        titre,
        description,
        montantEstime
      },
      include: {
        bonsCommande: true
      }
    });

    res.json(demande);
  } catch (error) {
    console.error('Error updating demande achat:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Demande d\'achat non trouvée' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la demande d\'achat' });
  }
};

// Approve demande achat
exports.approve = async (req, res) => {
  try {
    const { id } = req.params;

    const demande = await prisma.demandeAchat.findUnique({
      where: { id }
    });

    if (!demande) {
      return res.status(404).json({ error: 'Demande d\'achat non trouvée' });
    }

    if (demande.status !== 'SOUMISE') {
      return res.status(400).json({ error: 'Seules les demandes soumises peuvent être approuvées' });
    }

    const updatedDemande = await prisma.demandeAchat.update({
      where: { id },
      data: { status: 'APPROUVEE' },
      include: {
        bonsCommande: true
      }
    });

    res.json(updatedDemande);
  } catch (error) {
    console.error('Error approving demande achat:', error);
    res.status(500).json({ error: 'Erreur lors de l\'approbation de la demande d\'achat' });
  }
};

// Reject demande achat
exports.reject = async (req, res) => {
  try {
    const { id } = req.params;

    const demande = await prisma.demandeAchat.findUnique({
      where: { id }
    });

    if (!demande) {
      return res.status(404).json({ error: 'Demande d\'achat non trouvée' });
    }

    if (demande.status !== 'SOUMISE') {
      return res.status(400).json({ error: 'Seules les demandes soumises peuvent être rejetées' });
    }

    const updatedDemande = await prisma.demandeAchat.update({
      where: { id },
      data: { status: 'REJETEE' },
      include: {
        bonsCommande: true
      }
    });

    res.json(updatedDemande);
  } catch (error) {
    console.error('Error rejecting demande achat:', error);
    res.status(500).json({ error: 'Erreur lors du rejet de la demande d\'achat' });
  }
};

// Get demande achat stats
exports.getStats = async (req, res) => {
  try {
    const totalDemandes = await prisma.demandeAchat.count();
    
    const demandesParStatus = await prisma.demandeAchat.groupBy({
      by: ['status'],
      _count: true
    });

    const montantEstimeTotal = await prisma.demandeAchat.aggregate({
      _sum: {
        montantEstime: true
      }
    });

    const stats = {
      totalDemandes,
      demandesParStatus: demandesParStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      montantEstimeTotal: montantEstimeTotal._sum.montantEstime || 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching demande achat stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
};

// Delete demande achat
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.demandeAchat.delete({
      where: { id }
    });

    res.json({ message: 'Demande d\'achat supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting demande achat:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Demande d\'achat non trouvée' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression de la demande d\'achat' });
  }
};
