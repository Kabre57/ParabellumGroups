const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Contrôleur pour la gestion des campagnes de prospection
 */
exports.getAllCampaigns = async (req, res) => {
  try {
    const { 
      status, 
      type, 
      startDate, 
      endDate,
      createdById 
    } = req.query;
    
    const where = {};
    
    if (status) where.status = status.toUpperCase();
    if (type) where.type = type.toUpperCase();
    if (createdById) where.createdById = createdById;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    const campaigns = await prisma.prospectionCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { prospects: true }
        }
      }
    });
    
    res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des campagnes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des campagnes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = await prisma.prospectionCampaign.findUnique({
      where: { id },
      include: {
        prospects: {
          include: {
            prospect: {
              select: {
                id: true,
                companyName: true,
                contactName: true,
                email: true,
                stage: true
              }
            }
          }
        },
        _count: {
          select: { prospects: true }
        }
      }
    });
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campagne non trouvée'
      });
    }
    
    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la campagne:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la campagne',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const campaignData = {
      ...req.body,
      createdById: req.user.id,
      status: 'DRAFT'
    };
    
    const campaign = await prisma.prospectionCampaign.create({
      data: campaignData
    });
    
    res.status(201).json({
      success: true,
      data: campaign,
      message: 'Campagne créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la campagne:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la campagne',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = await prisma.prospectionCampaign.update({
      where: { id },
      data: req.body
    });
    
    res.json({
      success: true,
      data: campaign,
      message: 'Campagne mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la campagne:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la campagne',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.prospectionCampaign.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Campagne supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la campagne:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la campagne',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.addProspectsToCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { prospectIds } = req.body;
    
    const campaignProspects = prospectIds.map(prospectId => ({
      campaignId: id,
      prospectId,
      status: 'PENDING'
    }));
    
    await prisma.campaignProspect.createMany({
      data: campaignProspects,
      skipDuplicates: true
    });
    
    // Mettre à jour le nombre de cibles
    await prisma.prospectionCampaign.update({
      where: { id },
      data: {
        targetCount: {
          increment: prospectIds.length
        }
      }
    });
    
    res.json({
      success: true,
      message: `${prospectIds.length} prospects ajoutés à la campagne`
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout des prospects à la campagne:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout des prospects à la campagne',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.launchCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = await prisma.prospectionCampaign.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        startDate: new Date()
      }
    });
    
    res.json({
      success: true,
      data: campaign,
      message: 'Campagne lancée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du lancement de la campagne:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du lancement de la campagne',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getCampaignStats = async (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = await prisma.prospectionCampaign.findUnique({
      where: { id },
      include: {
        prospects: {
          include: {
            prospect: {
              select: {
                stage: true,
                isConverted: true
              }
            }
          }
        }
      }
    });
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campagne non trouvée'
      });
    }
    
    // Calculer les statistiques
    const stats = {
      totalProspects: campaign.prospects.length,
      sent: campaign.prospects.filter(p => p.status === 'SENT').length,
      opened: campaign.prospects.filter(p => p.status === 'OPENED').length,
      replied: campaign.prospects.filter(p => p.status === 'REPLIED').length,
      converted: campaign.prospects.filter(p => p.status === 'CONVERTED').length,
      bounceRate: campaign.prospects.filter(p => p.bounceReason).length,
      
      // Statistiques par étape
      byStage: campaign.prospects.reduce((acc, cp) => {
        const stage = cp.prospect.stage;
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {})
    };
    
    res.json({
      success: true,
      data: {
        campaign,
        stats
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de campagne:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques de campagne',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};