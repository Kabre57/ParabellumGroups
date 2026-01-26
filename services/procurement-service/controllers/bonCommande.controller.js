const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { generateBonCommandeNumber } = require('../utils/purchaseNumberGenerator');

const prisma = new PrismaClient();

// Get all bons commande with pagination and filters
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, fournisseurId, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (fournisseurId) {
      where.fournisseurId = fournisseurId;
    }
    
    if (search) {
      where.numeroBon = { contains: search, mode: 'insensitive' };
    }

    const [bons, total] = await Promise.all([
      prisma.bonCommande.findMany({
        where,
        skip,
        take,
        include: {
          fournisseur: {
            select: {
              id: true,
              nom: true,
              email: true
            }
          },
          demandeAchat: {
            select: {
              id: true,
              numeroDemande: true,
              titre: true
            }
          },
          lignes: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.bonCommande.count({ where })
    ]);

    res.json({
      data: bons,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching bons commande:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des bons de commande' });
  }
};

// Create bon commande
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { demandeAchatId, fournisseurId, dateCommande, dateLivraison, montantTotal, status } = req.body;

    // Generate unique numero bon
    const numeroBon = await generateBonCommandeNumber(prisma);

    const bon = await prisma.bonCommande.create({
      data: {
        numeroBon,
        demandeAchatId,
        fournisseurId,
        dateCommande: dateCommande ? new Date(dateCommande) : new Date(),
        dateLivraison: dateLivraison ? new Date(dateLivraison) : null,
        montantTotal,
        status: status || 'BROUILLON'
      },
      include: {
        fournisseur: true,
        demandeAchat: true,
        lignes: true
      }
    });

    res.status(201).json(bon);
  } catch (error) {
    console.error('Error creating bon commande:', error);
    res.status(500).json({ error: 'Erreur lors de la création du bon de commande' });
  }
};

// Get bon commande by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const bon = await prisma.bonCommande.findUnique({
      where: { id },
      include: {
        fournisseur: true,
        demandeAchat: true,
        lignes: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!bon) {
      return res.status(404).json({ error: 'Bon de commande non trouvé' });
    }

    res.json(bon);
  } catch (error) {
    console.error('Error fetching bon commande:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du bon de commande' });
  }
};

// Update bon commande
exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { fournisseurId, dateLivraison, montantTotal } = req.body;

    const bon = await prisma.bonCommande.update({
      where: { id },
      data: {
        fournisseurId,
        dateLivraison: dateLivraison ? new Date(dateLivraison) : null,
        montantTotal
      },
      include: {
        fournisseur: true,
        demandeAchat: true,
        lignes: true
      }
    });

    res.json(bon);
  } catch (error) {
    console.error('Error updating bon commande:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Bon de commande non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du bon de commande' });
  }
};

// Add ligne to bon commande
exports.addLigne = async (req, res) => {
  try {
    const { id } = req.params;
    const { designation, quantite, prixUnitaire } = req.body;

    if (!designation || !quantite || !prixUnitaire) {
      return res.status(400).json({ error: 'designation, quantite et prixUnitaire sont requis' });
    }

    const montant = quantite * parseFloat(prixUnitaire);

    const ligne = await prisma.ligneCommande.create({
      data: {
        bonCommandeId: id,
        designation,
        quantite: parseInt(quantite),
        prixUnitaire: parseFloat(prixUnitaire),
        montant
      }
    });

    // Update bon commande montant total
    const bonLignes = await prisma.ligneCommande.findMany({
      where: { bonCommandeId: id }
    });

    const montantTotal = bonLignes.reduce((sum, l) => sum + parseFloat(l.montant), 0);

    await prisma.bonCommande.update({
      where: { id },
      data: { montantTotal }
    });

    res.status(201).json(ligne);
  } catch (error) {
    console.error('Error adding ligne to bon commande:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la ligne' });
  }
};

// Update bon commande status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['BROUILLON', 'ENVOYE', 'CONFIRME', 'LIVRE', 'ANNULE'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status invalide' });
    }

    const bon = await prisma.bonCommande.update({
      where: { id },
      data: { status },
      include: {
        fournisseur: true,
        demandeAchat: true,
        lignes: true
      }
    });

    // If status is LIVRE, update demande achat status to COMMANDEE
    if (status === 'LIVRE' && bon.demandeAchatId) {
      await prisma.demandeAchat.update({
        where: { id: bon.demandeAchatId },
        data: { status: 'COMMANDEE' }
      });
    }

    res.json(bon);
  } catch (error) {
    console.error('Error updating bon commande status:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Bon de commande non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du status' });
  }
};

// Get bons commande by fournisseur
exports.getByFournisseur = async (req, res) => {
  try {
    const { fournisseurId } = req.params;

    const bons = await prisma.bonCommande.findMany({
      where: { fournisseurId },
      include: {
        fournisseur: true,
        demandeAchat: true,
        lignes: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(bons);
  } catch (error) {
    console.error('Error fetching bons commande by fournisseur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des bons de commande' });
  }
};

// Delete bon commande
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.bonCommande.delete({
      where: { id }
    });

    res.json({ message: 'Bon de commande supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting bon commande:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Bon de commande non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression du bon de commande' });
  }
};
