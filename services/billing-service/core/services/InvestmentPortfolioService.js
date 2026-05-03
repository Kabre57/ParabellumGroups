const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Service de gestion des Portefeuilles de Placements (InvestmentPortfolio).
 * Ce service est le point d'entrée principal pour:
 *   - la création et administration des portefeuilles
 *   - la consultation des positions agrégées
 *   - la vue synthétique par classe d'actif
 *
 * Architecture modulaire : Ce service ne comptabilise pas directement.
 * Pour les écritures comptables, il délègue à InvestmentAccountingService.
 */
class InvestmentPortfolioService {
  // -----------------------------------------------------------------------
  // SECTION 1 : GESTION DES PORTEFEUILLES
  // -----------------------------------------------------------------------

  /**
   * Crée un nouveau portefeuille de placements.
   * @param {Object} data - Données du portefeuille
   * @param {string} data.code - Code unique du portefeuille
   * @param {string} data.label - Libellé du portefeuille
   * @param {number} [data.enterpriseId] - ID de l'entreprise associée
   * @param {string} [data.regimeCode] - Code du régime réglementaire
   * @param {string} [data.baseCurrency='XOF'] - Devise de référence
   * @param {string} [data.description] - Description libre
   * @param {Object} [client=prisma] - Instance Prisma pour injection dans une transaction
   * @returns {Promise<Object>} Le portefeuille créé
   */
  async createPortfolio(data, client = prisma) {
    const { code, label, enterpriseId, regimeCode, baseCurrency = 'XOF', description } = data;

    if (!code || !label) {
      const err = new Error('Le code et le libellé du portefeuille sont obligatoires.');
      err.statusCode = 400;
      throw err;
    }

    // Vérifier l'unicité du code par entreprise
    const existing = await client.investmentPortfolio.findUnique({ 
      where: { 
        code_enterpriseId: {
          code: code.trim().toUpperCase(),
          enterpriseId: enterpriseId ? Number(enterpriseId) : null
        }
      } 
    });
    if (existing) {
      const err = new Error(`Un portefeuille avec le code "${code}" existe déjà pour cette entreprise.`);
      err.statusCode = 409;
      throw err;
    }

    return client.investmentPortfolio.create({
      data: {
        code: code.trim().toUpperCase(),
        label: label.trim(),
        enterpriseId: enterpriseId ? Number(enterpriseId) : null,
        regimeCode: regimeCode || null,
        baseCurrency,
        description: description || null,
        status: 'ACTIVE'
      }
    });
  }

  /**
   * Récupère un portefeuille par son ID.
   * @param {string} portfolioId
   * @param {Object} [client=prisma]
   */
  async getPortfolioById(portfolioId, enterpriseId = null, client = prisma) {
    const portfolio = await client.investmentPortfolio.findUnique({
      where: { id: portfolioId }
    });
    if (!portfolio) {
      const err = new Error('Portefeuille introuvable.');
      err.statusCode = 404;
      throw err;
    }
    if (enterpriseId !== null && portfolio.enterpriseId !== Number(enterpriseId)) {
      const err = new Error('Accès au portefeuille non autorisé.');
      err.statusCode = 403;
      throw err;
    }
    return portfolio;
  }

  /**
   * Liste tous les portefeuilles, avec filtres optionnels.
   * @param {Object} [filters={}] - Filtres: enterpriseId, status
   * @param {Object} [client=prisma]
   */
  async listPortfolios(filters = {}, client = prisma) {
    const where = {};
    if (filters.enterpriseId) where.enterpriseId = Number(filters.enterpriseId);
    if (filters.status) where.status = filters.status;

    return client.investmentPortfolio.findMany({
      where,
      orderBy: { code: 'asc' }
    });
  }

  // -----------------------------------------------------------------------
  // SECTION 2 : VUE SYNTHÉTIQUE DU PORTEFEUILLE
  // -----------------------------------------------------------------------

  /**
   * Retourne une vue synthétique du portefeuille :
   *   - Positions actuelles (Holdings)
   *   - Répartition par classe d'actif
   *   - Totaux (valeur comptable, valeur de marché, plus-value latente)
   *
   * @param {string} portfolioId
   * @param {Object} [client=prisma]
   * @returns {Promise<Object>} Résumé enrichi du portefeuille
   */
  async getPortfolioSummary(portfolioId, enterpriseId = null, client = prisma) {
    const portfolio = await this.getPortfolioById(portfolioId, enterpriseId, client);

    // Récupérer toutes les positions ouvertes du portefeuille
    const holdings = await client.investmentHolding.findMany({
      where: { portfolioId, status: 'OPEN' },
      include: { asset: true }
    });

    // Initialisation des totaux
    let totalBookValue = 0;
    let totalMarketValue = 0;
    let totalAccruedInterest = 0;

    // Répartition par classe d'actif
    const byAssetClass = {};

    for (const holding of holdings) {
      const cls = holding.asset.assetClass || 'UNKNOWN';
      totalBookValue += holding.bookValue || 0;
      totalMarketValue += holding.marketValue || 0;
      totalAccruedInterest += holding.accruedInterest || 0;

      if (!byAssetClass[cls]) {
        byAssetClass[cls] = { bookValue: 0, marketValue: 0, count: 0 };
      }
      byAssetClass[cls].bookValue += holding.bookValue || 0;
      byAssetClass[cls].marketValue += holding.marketValue || 0;
      byAssetClass[cls].count += 1;
    }

    const unrealizedGainLoss = totalMarketValue - totalBookValue;

    return {
      portfolio,
      holdings,
      summary: {
        totalBookValue: Math.round(totalBookValue * 100) / 100,
        totalMarketValue: Math.round(totalMarketValue * 100) / 100,
        totalAccruedInterest: Math.round(totalAccruedInterest * 100) / 100,
        unrealizedGainLoss: Math.round(unrealizedGainLoss * 100) / 100,
        positionsCount: holdings.length
      },
      byAssetClass
    };
  }

  /**
   * Met à jour le statut ou les informations d'un portefeuille.
   * @param {string} portfolioId
   * @param {Object} updateData
   * @param {Object} [client=prisma]
   */
  async updatePortfolio(portfolioId, updateData, client = prisma) {
    await this.getPortfolioById(portfolioId, client); // Vérification d'existence
    return client.investmentPortfolio.update({
      where: { id: portfolioId },
      data: updateData
    });
  }
}

module.exports = new InvestmentPortfolioService();
