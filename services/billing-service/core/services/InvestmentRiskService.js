const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Service d'analyse des Risques sur les Placements.
 *
 * Responsabilités :
 *   - Calcul d'indicateurs de risque simples et avancés
 *   - Analyse de la concentration par classe d'actif / émetteur
 *   - Persistance des métriques dans InvestmentRiskMetric
 *
 * Indicateurs couverts :
 *   - Concentration par classe d'actif (% allocation)
 *   - Duration (sensibilité au taux)
 *   - Exposition par devise
 *   - Score de risque global (qualitatif)
 */
class InvestmentRiskService {
  // -----------------------------------------------------------------------
  // SECTION 1 : CALCUL DES MÉTRIQUES DE RISQUE
  // -----------------------------------------------------------------------

  /**
   * Calcule et persiste les métriques de risque d'un portefeuille.
   *
   * @param {string} portfolioId - ID du portefeuille
   * @param {string|Date} [asOfDate=today] - Date de référence
   * @param {Object} [client=prisma]
   * @returns {Promise<Object>} Rapport de risque
   */
  async calculateRiskMetrics(portfolioId, asOfDate, client = prisma) {
    const date = asOfDate ? new Date(asOfDate) : new Date();

    // Récupérer toutes les positions ouvertes avec les actifs associés
    const holdings = await client.investmentHolding.findMany({
      where: { portfolioId, status: 'OPEN' },
      include: { asset: true }
    });

    if (holdings.length === 0) {
      return { message: 'Aucune position ouverte pour ce portefeuille.', metrics: [] };
    }

    const totalValue = holdings.reduce((sum, h) => sum + (h.marketValue || h.bookValue), 0);

    // ---- 1. Analyse de Concentration par Classe d'Actif ----
    const concentration = {};
    for (const holding of holdings) {
      const cls = holding.asset.assetClass || 'UNKNOWN';
      if (!concentration[cls]) concentration[cls] = 0;
      concentration[cls] += holding.marketValue || holding.bookValue;
    }

    const concentrationReport = Object.entries(concentration).map(([cls, value]) => ({
      assetClass: cls,
      value: Math.round(value * 100) / 100,
      percentage: Math.round((value / totalValue) * 10000) / 100
    }));

    // ---- 2. Durée Moyenne (Duration simplifiée) ----
    // Approximation: durée résiduelle pondérée par la valeur comptable
    let weightedDuration = 0;
    for (const holding of holdings) {
      if (holding.asset.maturityDate) {
        const daysToMaturity = (new Date(holding.asset.maturityDate) - date) / (1000 * 60 * 60 * 24);
        const yearsToMaturity = Math.max(daysToMaturity / 365, 0);
        const weight = (holding.bookValue / totalValue);
        weightedDuration += yearsToMaturity * weight;
      }
    }

    // ---- 3. Exposition par Devise ----
    const currencyExposure = {};
    for (const holding of holdings) {
      const currency = holding.asset.currency || 'XOF';
      if (!currencyExposure[currency]) currencyExposure[currency] = 0;
      currencyExposure[currency] += holding.marketValue || holding.bookValue;
    }

    // ---- 4. Score de Risque Global (qualitatif) ----
    // Max concentration dans une classe > 70% = HIGH
    const maxConcentration = Math.max(...Object.values(concentration).map(v => v / totalValue));
    let riskScore = 1;
    if (maxConcentration > 0.7) riskScore = 3;
    else if (maxConcentration > 0.5) riskScore = 2;

    const report = {
      portfolioId,
      asOfDate: date,
      totalValue: Math.round(totalValue * 100) / 100,
      concentration: concentrationReport,
      weightedDuration: Math.round(weightedDuration * 100) / 100,
      currencyExposure,
      riskScore,
      riskLabel: ['FAIBLE', 'MODERE', 'ELEVE'][riskScore - 1]
    };

    // Persistance des métriques clés
    const metricsToPersist = [
      { portfolioId, asOfDate: date, metricType: 'BETA', value: riskScore },
      ...concentrationReport.map(c => ({
        portfolioId,
        asOfDate: date,
        metricType: 'VOLATILITY',
        value: c.percentage,
        metadata: { assetClass: c.assetClass }
      }))
    ];

    await client.investmentRiskMetric.createMany({ data: metricsToPersist });

    return report;
  }
}

module.exports = new InvestmentRiskService();
