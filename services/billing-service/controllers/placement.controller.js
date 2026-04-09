const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calcule la valorisation actuelle d'un placement basée sur son dernier cours
 */
const calculateValuation = (placement) => {
  const lastCourse = placement.courses && placement.courses.length > 0 
    ? placement.courses[0].value 
    : placement.purchasePrice;
  
  const currentValuation = lastCourse * placement.quantity;
  const gainLoss = currentValuation - placement.totalCost;
  const gainLossPercent = placement.totalCost > 0 ? (gainLoss / placement.totalCost) * 100 : 0;

  return {
    lastCourse,
    currentValuation,
    gainLoss,
    gainLossPercent
  };
};

/**
 * Récupère la liste des placements
 */
exports.getPlacements = async (req, res) => {
  try {
    const { serviceId, type, status } = req.query;
    
    const where = {};
    if (serviceId) where.serviceId = parseInt(serviceId);
    if (type) where.type = type;
    if (status) where.status = status;

    const placements = await prisma.placement.findMany({
      where,
      include: {
        courses: {
          orderBy: { atDate: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enrichedPlacements = placements.map(p => ({
      ...p,
      ...calculateValuation(p)
    }));

    // Calcul des totaux pour la synthèse
    const totals = enrichedPlacements.reduce((acc, p) => {
      acc.totalInvested += p.totalCost;
      acc.currentValuation += p.currentValuation;
      return acc;
    }, { totalInvested: 0, currentValuation: 0 });

    totals.totalGainLoss = totals.currentValuation - totals.totalInvested;
    totals.totalGainLossPercent = totals.totalInvested > 0 
      ? (totals.totalGainLoss / totals.totalInvested) * 100 
      : 0;

    return res.json({
      success: true,
      data: enrichedPlacements,
      summary: totals
    });
  } catch (error) {
    console.error('Erreur getPlacements:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des placements'
    });
  }
};

/**
 * Récupère un placement par son ID avec historique des cours
 */
exports.getPlacementById = async (req, res) => {
  try {
    const { id } = req.params;
    const placement = await prisma.placement.findUnique({
      where: { id },
      include: {
        courses: {
          orderBy: { atDate: 'desc' }
        }
      }
    });

    if (!placement) {
      return res.status(404).json({ success: false, message: 'Placement non trouvé' });
    }

    return res.json({
      success: true,
      data: {
        ...placement,
        ...calculateValuation(placement)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Créer un nouveau placement
 */
exports.createPlacement = async (req, res) => {
  try {
    const { 
      type, name, issuer, country, currency, 
      quantity, purchasePrice, purchaseDate, 
      maturityDate, interestRate, serviceId, 
      serviceName, notes 
    } = req.body;

    const totalCost = quantity * purchasePrice;

    const placement = await prisma.placement.create({
      data: {
        type,
        name,
        issuer,
        country,
        currency: currency || 'XOF',
        quantity: parseFloat(quantity),
        purchasePrice: parseFloat(purchasePrice),
        totalCost,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        maturityDate: maturityDate ? new Date(maturityDate) : null,
        interestRate: interestRate ? parseFloat(interestRate) : null,
        serviceId: serviceId ? parseInt(serviceId) : null,
        serviceName,
        notes,
        status: 'ACTIF'
      }
    });

    // Créer le cours initial (égal au prix d'achat)
    await prisma.assetCourse.create({
      data: {
        placementId: placement.id,
        atDate: placement.purchaseDate,
        value: placement.purchasePrice
      }
    });

    return res.status(201).json({ success: true, data: placement });
  } catch (error) {
    console.error('Erreur createPlacement:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * AJout manuel d'un cours (Saisie manuelle demandée par l'utilisateur)
 */
exports.addAssetCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { value, atDate } = req.body;

    const course = await prisma.assetCourse.create({
      data: {
        placementId: id,
        value: parseFloat(value),
        atDate: atDate ? new Date(atDate) : new Date()
      }
    });

    return res.status(201).json({ success: true, data: course });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Mise à jour du statut d'un placement
 */
exports.updatePlacementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const placement = await prisma.placement.update({
      where: { id },
      data: { status }
    });

    return res.json({ success: true, data: placement });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
