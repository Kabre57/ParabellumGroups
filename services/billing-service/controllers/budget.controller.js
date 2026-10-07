const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { safeAmount, safeDate, safeAccess } = require('../utils/safe-access');
const { resolveEnterpriseIdsForRequest, resolveEnterpriseContext } = require('../utils/enterpriseScope');

/**
 * Analyse de performance budgétaire (Prévisions vs Réel)
 */
exports.getBudgetPerformance = async (req, res) => {
  try {
    const currentYear = parseInt(req.query.year) || new Date().getFullYear();
    const activeEnterprise = await resolveEnterpriseContext(req, req.query.enterpriseId);
    if (!activeEnterprise.enterpriseId) {
      return res.status(400).json({ success: false, message: 'Choisissez une entreprise active pour consulter le budget.' });
    }
    const enterpriseIds = await resolveEnterpriseIdsForRequest(req, req.query.enterpriseId);
    
    // On récupère les budgets de l'année
    const budgets = await prisma.budget.findMany({
      where: {
        fiscalYear: currentYear,
        ...(Array.isArray(enterpriseIds) ? { serviceId: { in: enterpriseIds.length ? enterpriseIds : [-1] } } : {}),
      },
      include: {
        allocations: {
          include: {
            analyticCenter: true
          }
        }
      }
    });

    if (budgets.length === 0) {
      return res.json({
        success: true,
        data: [],
        summary: { totalAllocated: 0, totalSpent: 0, globalPerformance: 0 }
      });
    }

    // Aplatir et sommer les allocations par centre analytique
    const statsByCenter = {};
    let totalAllocated = 0;
    let totalSpent = 0;

    budgets.forEach(budget => {
      const allocations = budget.allocations || [];
      allocations.forEach(alloc => {
        const centerName = safeAccess(alloc, 'analyticCenter.name', 'Centre inconnu');
        if (!statsByCenter[centerName]) {
          statsByCenter[centerName] = {
            centerName,
            allocated: 0,
            spent: 0,
            remaining: 0,
            performance: 0
          };
        }
        
        const allocated = safeAmount(alloc.amount);
        const spent = safeAmount(alloc.spent);

        statsByCenter[centerName].allocated += allocated;
        statsByCenter[centerName].spent += spent;
        
        totalAllocated += allocated;
        totalSpent += spent;
      });
    });

    const performanceData = Object.values(statsByCenter).map(stat => ({
      ...stat,
      remaining: stat.allocated - stat.spent,
      performance: stat.allocated > 0 ? (stat.spent / stat.allocated) * 100 : 0
    }));

    return res.json({
      success: true,
      data: performanceData,
      summary: {
        totalAllocated,
        totalSpent,
        globalPerformance: totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Erreur getBudgetPerformance:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Liste des budgets avec résumé
 */
exports.getBudgets = async (req, res) => {
  try {
    const activeEnterprise = await resolveEnterpriseContext(req, req.query.enterpriseId);
    if (!activeEnterprise.enterpriseId) {
      return res.status(400).json({ success: false, message: 'Choisissez une entreprise active pour consulter les budgets.' });
    }
    const enterpriseIds = await resolveEnterpriseIdsForRequest(req, req.query.enterpriseId);
    const budgets = await prisma.budget.findMany({
      where: Array.isArray(enterpriseIds) ? { serviceId: { in: enterpriseIds.length ? enterpriseIds : [-1] } } : {},
      orderBy: { fiscalYear: 'desc' }
    });
    return res.json({ success: true, data: budgets });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
