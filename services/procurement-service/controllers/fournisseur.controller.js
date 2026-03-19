const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

const toNumber = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const computeSupplierTotals = (bonsCommande = []) =>
  bonsCommande.reduce((sum, bon) => sum + Number(bon.montantTotal || 0), 0);

const serializeFournisseur = (fournisseur) => ({
  ...fournisseur,
  name: fournisseur.nom,
  phone: fournisseur.telephone,
  address: fournisseur.adresse,
  category: fournisseur.categorieActivite,
  ordersCount: fournisseur.ordersCount ?? fournisseur.bonsCommande?.length ?? 0,
  totalAmount: fournisseur.totalAmount ?? computeSupplierTotals(fournisseur.bonsCommande),
});

// Get all fournisseurs with pagination and filters
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, categorieActivite, categorie, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    const categoryFilter = categorieActivite || categorie;
    if (categoryFilter) {
      where.categorieActivite = categoryFilter;
    }
    
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [fournisseurs, total] = await Promise.all([
      prisma.fournisseur.findMany({
        where,
        skip,
        take,
        include: {
          bonsCommande: {
            select: {
              id: true,
              numeroBon: true,
              montantTotal: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.fournisseur.count({ where })
    ]);

    res.json({
      data: fournisseurs.map(serializeFournisseur),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching fournisseurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des fournisseurs' });
  }
};

// Create fournisseur
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      nom,
      email,
      telephone,
      phone,
      adresse,
      address,
      categorieActivite,
      categorie,
      status,
      rating,
    } = req.body;

    const fournisseur = await prisma.fournisseur.create({
      data: {
        nom,
        email,
        telephone: telephone || phone || null,
        adresse: adresse || address || null,
        categorieActivite: categorieActivite || categorie || null,
        status: status || 'ACTIF',
        rating: toNumber(rating),
      },
      include: {
        bonsCommande: true
      }
    });

    res.status(201).json(serializeFournisseur(fournisseur));
  } catch (error) {
    console.error('Error creating fournisseur:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Un fournisseur avec cet email existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création du fournisseur' });
  }
};

// Get fournisseur by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id },
      include: {
        bonsCommande: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!fournisseur) {
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }

    res.json(serializeFournisseur(fournisseur));
  } catch (error) {
    console.error('Error fetching fournisseur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du fournisseur' });
  }
};

// Update fournisseur
exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      nom,
      email,
      telephone,
      phone,
      adresse,
      address,
      categorieActivite,
      categorie,
      status,
      rating,
    } = req.body;

    const fournisseur = await prisma.fournisseur.update({
      where: { id },
      data: {
        nom,
        email,
        telephone: telephone ?? phone ?? undefined,
        adresse: adresse ?? address ?? undefined,
        categorieActivite: categorieActivite ?? categorie ?? undefined,
        status,
        rating: rating !== undefined ? toNumber(rating) : undefined,
      },
      include: {
        bonsCommande: true
      }
    });

    res.json(serializeFournisseur(fournisseur));
  } catch (error) {
    console.error('Error updating fournisseur:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Un fournisseur avec cet email existe déjà' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du fournisseur' });
  }
};

// Update fournisseur rating
exports.updateRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (rating < 0 || rating > 5) {
      return res.status(400).json({ error: 'Rating doit être entre 0 et 5' });
    }

    const fournisseur = await prisma.fournisseur.update({
      where: { id },
      data: { rating },
      include: {
        bonsCommande: true
      }
    });

    res.json(serializeFournisseur(fournisseur));
  } catch (error) {
    console.error('Error updating fournisseur rating:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du rating' });
  }
};

// Get fournisseur stats
exports.getStats = async (req, res) => {
  try {
    const { id } = req.params;

    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id },
      include: {
        bonsCommande: true
      }
    });

    if (!fournisseur) {
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }

    const stats = {
      totalCommandes: fournisseur.bonsCommande.length,
      ordersCount: fournisseur.bonsCommande.length,
      montantTotal: computeSupplierTotals(fournisseur.bonsCommande),
      totalAmount: computeSupplierTotals(fournisseur.bonsCommande),
      rating: fournisseur.rating ?? 0,
      commandesParStatus: {
        BROUILLON: fournisseur.bonsCommande.filter(bc => bc.status === 'BROUILLON').length,
        ENVOYE: fournisseur.bonsCommande.filter(bc => bc.status === 'ENVOYE').length,
        CONFIRME: fournisseur.bonsCommande.filter(bc => bc.status === 'CONFIRME').length,
        LIVRE: fournisseur.bonsCommande.filter(bc => bc.status === 'LIVRE').length,
        ANNULE: fournisseur.bonsCommande.filter(bc => bc.status === 'ANNULE').length
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching fournisseur stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
};

// Delete fournisseur
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.fournisseur.delete({
      where: { id }
    });

    res.json({ message: 'Fournisseur supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting fournisseur:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression du fournisseur' });
  }
};
