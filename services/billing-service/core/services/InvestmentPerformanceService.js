const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Service de calcul de la Performance des Placements.
 *
 * Responsabilités :
 *   - Calcul du rendement par actif, par classe et par portefeuille
 *   - Calcul de la performance YTD et depuis l'origine
 *   - Persistance des métriques dans InvestmentPerformanceMetric
 */
class InvestmentPerformanceService {
  // -----------------------------------------------------------------------
  // SECTION 1 : CALCUL DU RENDEMENT
  // -----------------------------------------------------------------------

  /**
   * Calcule les indicateurs de performance d'un portefeuille.
   *
   * @param {string} portfolioId - ID du portefeuille
   * @param {string|Date} [asOfDate=today] - Date de calcul
   * @param {Object} [client=prisma]
   * @returns {Promise<Object>} Métriques de performance
   */
  async calculateYield(portfolioId, asOfDate, client = prisma) {
    const date = asOfDate ? new Date(asOfDate) : new Date();

    // Récupérer le dernier snapshot de valorisation du portefeuille
    const latestSnapshot = await client.portfolioValuationSnapshot.findFirst({
      where: { portfolioId },
      orderBy: { valuationDate: 'desc' }
    });

    if (!latestSnapshot) {
      return { message: 'Aucune valorisation disponible pour ce portefeuille.' };
    }

    // Récupérer les transactions pour calculer le coût total investi
    const transactions = await client.investmentTransaction.findMany({
      where: {
        portfolioId,
        status: 'SETTLED',
        transactionType: { in: ['BUY', 'REINVESTMENT'] }
      }
    });

    const totalInvested = transactions.reduce((sum, t) => sum + t.netAmount, 0);

    // Récupérer les flux reçus (coupons, dividendes, loyers)
    const receivedFlows = await client.expectedCashflow.findMany({
      where: { portfolioId, status: { in: ['RECEIVED', 'PARTIAL'] } }
    });
    const totalIncome = receivedFlows.reduce((sum, f) => sum + f.receivedAmount, 0);

    // Calcul du rendement total
    const currentValue = latestSnapshot.netAssetValue;
    const totalReturn = currentValue + totalIncome - totalInvested;
    const totalReturnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    // Calcul YTD (Year-to-Date)
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const snapshotStartOfYear = await client.portfolioValuationSnapshot.findFirst({
      where: { portfolioId, valuationDate: { gte: startOfYear } },
      orderBy: { valuationDate: 'asc' }
    });
    const ytdBase = snapshotStartOfYear ? snapshotStartOfYear.netAssetValue : totalInvested;
    const ytdPct = ytdBase > 0 ? ((currentValue - ytdBase) / ytdBase) * 100 : 0;

    const metrics = {
      portfolioId,
      asOfDate: date,
      totalInvested: Math.round(totalInvested * 100) / 100,
      currentValue: Math.round(currentValue * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalReturn: Math.round(totalReturn * 100) / 100,
      totalReturnPct: Math.round(totalReturnPct * 100) / 100,
      ytdReturnPct: Math.round(ytdPct * 100) / 100
    };

    // Persistance des métriques calculées
    await client.investmentPerformanceMetric.createMany({
      data: [
        { portfolioId, asOfDate: date, metricType: 'TOTAL_RETURN', value: metrics.totalReturnPct, periodLabel: 'ALL' },
        { portfolioId, asOfDate: date, metricType: 'CURRENT_YIELD', value: totalInvested > 0 ? (totalIncome / totalInvested) * 100 : 0, periodLabel: 'INCOME' }
      ]
    });

    return metrics;
  }

  /**
   * Calcule le rendement d'un actif spécifique.
   * @param {string} assetId
   * @param {string} portfolioId
   * @param {Object} [client=prisma]
   */
  async calculateAssetYield(assetId, portfolioId, client = prisma) {
    const holding = await client.investmentHolding.findUnique({
      where: { portfolioId_assetId: { portfolioId, assetId } },
      include: { asset: true }
    });
    if (!holding) {
      const err = new Error('Position introuvable.'); err.statusCode = 404; throw err;
    }

    // Flux de revenus reçus sur cet actif
    const flows = await client.expectedCashflow.findMany({
      where: { portfolioId, assetId, status: { in: ['RECEIVED', 'PARTIAL'] } }
    });
    const totalIncome = flows.reduce((sum, f) => sum + f.receivedAmount, 0);
    const currentMarketValue = holding.marketValue || holding.bookValue;
    const unrealizedGain = currentMarketValue - holding.bookValue;
    const totalReturn = totalIncome + unrealizedGain;
    const yieldPct = holding.bookValue > 0 ? (totalReturn / holding.bookValue) * 100 : 0;

    return {
      assetId, portfolioId,
      assetLabel: holding.asset.label,
      bookValue: holding.bookValue,
      marketValue: currentMarketValue,
      totalIncome: Math.round(totalIncome * 100) / 100,
      unrealizedGain: Math.round(unrealizedGain * 100) / 100,
      totalReturn: Math.round(totalReturn * 100) / 100,
      yieldPct: Math.round(yieldPct * 100) / 100
    };
  }
}

module.exports = new InvestmentPerformanceService();
