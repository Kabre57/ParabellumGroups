const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Service de Valorisation Périodique des Actifs de Placement (InvestmentValuation).
 *
 * Responsabilités :
 *   - Appliquer la méthode de valorisation appropriée par actif
 *   - Enregistrer le snapshot de valorisation (InvestmentValuation)
 *   - Mettre à jour la valeur de marché des positions (InvestmentHolding)
 *   - Prendre un snapshot global du portefeuille (PortfolioValuationSnapshot)
 *
 * Méthodes supportées :
 *   - AMORTIZED_COST : Coût amorti (pour obligations à taux fixe)
 *   - MARK_TO_MARKET : Valeur de marché réelle (via prix renseigné)
 *   - MANUAL : Valeur saisie manuellement
 */
class InvestmentValuationService {
  // -----------------------------------------------------------------------
  // SECTION 1 : VALORISATION PAR ACTIF
  // -----------------------------------------------------------------------

  /**
   * Lance la valorisation périodique pour tous les actifs d'un portefeuille.
   * Pour chaque position ouverte, applique la méthode de valorisation de l'actif.
   *
   * @param {string} portfolioId - ID du portefeuille à valoriser
   * @param {string|Date} valuationDate - Date de valorisation (ex: fin de mois)
   * @param {Object} [priceInputs={}] - Cours externes fournis: { [assetId]: prix }
   * @param {Object} [client=prisma]
   * @returns {Promise<Object>} Snapshot du portefeuille après valorisation
   */
  async runPeriodicValuation(portfolioId, valuationDate, priceInputs = {}, client = prisma) {
    const date = new Date(valuationDate);

    // Récupérer toutes les positions ouvertes
    const holdings = await client.investmentHolding.findMany({
      where: { portfolioId, status: 'OPEN' },
      include: { asset: true }
    });

    if (holdings.length === 0) {
      return { message: 'Aucune position ouverte trouvée pour ce portefeuille.', valuations: [] };
    }

    const valuations = [];
    let totalBook = 0, totalMarket = 0;

    for (const holding of holdings) {
      const asset = holding.asset;
      const method = this._resolveMethod(asset);
      const priceValue = priceInputs[asset.id] || null;

      let marketValue = holding.bookValue; // Valeur par défaut si aucune méthode applicable
      let accruedInterest = 0;

      if (method === 'MARK_TO_MARKET' && priceValue != null) {
        // Valorisation au prix de marché fourni
        marketValue = holding.quantity * priceValue;
      } else if (method === 'AMORTIZED_COST') {
        // Amortissement linéaire simple (nominal - décote / durée restante)
        marketValue = this._calculateAmortizedCost(asset, holding, date);
      } else if (method === 'MANUAL' && priceValue != null) {
        marketValue = priceValue;
      }

      // Calcul des intérêts courus (pour obligations/DAT avec couponRate)
      if (asset.couponRate && asset.nominalValue && holding.quantity) {
        accruedInterest = this._calculateAccruedInterest(asset, holding, date);
      }

      const unrealizedGainLoss = marketValue - holding.bookValue;

      // Sauvegarde du snapshot de valorisation de l'actif
      const valuation = await client.investmentValuation.upsert({
        where: {
          portfolioId_assetId_valuationDate: {
            portfolioId,
            assetId: asset.id,
            valuationDate: date
          }
        },
        update: {
          marketValue: Math.round(marketValue * 100) / 100,
          accruedInterest: Math.round(accruedInterest * 100) / 100,
          unrealizedGainLoss: Math.round(unrealizedGainLoss * 100) / 100,
          priceSource: priceInputs[asset.id] ? 'EXTERNAL' : 'COMPUTED',
          priceValue,
          valuationMethod: method
        },
        create: {
          portfolioId,
          assetId: asset.id,
          valuationDate: date,
          valuationMethod: method,
          bookValue: holding.bookValue,
          marketValue: Math.round(marketValue * 100) / 100,
          accruedInterest: Math.round(accruedInterest * 100) / 100,
          unrealizedGainLoss: Math.round(unrealizedGainLoss * 100) / 100,
          priceSource: priceInputs[asset.id] ? 'EXTERNAL' : 'COMPUTED',
          priceValue
        }
      });

      // Mise à jour de la position avec la valeur de marché
      await client.investmentHolding.update({
        where: { id: holding.id },
        data: {
          marketValue: Math.round(marketValue * 100) / 100,
          accruedInterest: Math.round(accruedInterest * 100) / 100,
          valuationDate: date
        }
      });

      totalBook += holding.bookValue;
      totalMarket += marketValue;
      valuations.push(valuation);
    }

    // Sauvegarde du snapshot global du portefeuille
    const snapshot = await client.portfolioValuationSnapshot.create({
      data: {
        portfolioId,
        valuationDate: date,
        bookValue: Math.round(totalBook * 100) / 100,
        marketValue: Math.round(totalMarket * 100) / 100,
        cashValue: 0, // À enrichir selon la trésorerie liée au portefeuille
        netAssetValue: Math.round(totalMarket * 100) / 100
      }
    });

    return { snapshot, valuations };
  }

  // -----------------------------------------------------------------------
  // SECTION 2 : MÉTHODES INTERNES DE CALCUL
  // -----------------------------------------------------------------------

  /**
   * Détermine la méthode de valorisation à appliquer pour un actif.
   * @private
   */
  _resolveMethod(asset) {
    if (asset.assetType === 'TERM_DEPOSIT' || asset.assetType === 'BOND') {
      return 'AMORTIZED_COST';
    }
    if (asset.assetType === 'EQUITY' || asset.assetType === 'FUND_UNIT') {
      return 'MARK_TO_MARKET';
    }
    return 'MANUAL';
  }

  /**
   * Calcule le coût amorti linéaire simple d'un actif à une date donnée.
   * @private
   */
  _calculateAmortizedCost(asset, holding, date) {
    if (!asset.maturityDate || !asset.issueDate || !asset.nominalValue) {
      return holding.bookValue; // Pas assez de données, on garde le prix comptable
    }
    const issueDate = new Date(asset.issueDate);
    const maturityDate = new Date(asset.maturityDate);
    const totalDuration = maturityDate - issueDate;
    const elapsed = date - issueDate;
    const ratio = Math.min(elapsed / totalDuration, 1);
    const nominalTotal = asset.nominalValue * holding.quantity;
    const decote = holding.bookValue - nominalTotal;
    return holding.bookValue - (decote * ratio);
  }

  /**
   * Calcule les intérêts courus pour un actif portant intérêt.
   * @private
   */
  _calculateAccruedInterest(asset, holding, date) {
    if (!asset.couponRate || !asset.nominalValue) return 0;
    const today = date || new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const daysElapsed = (today - startOfYear) / (1000 * 60 * 60 * 24);
    return (asset.nominalValue * holding.quantity * (asset.couponRate / 100) * daysElapsed) / 365;
  }
}

module.exports = new InvestmentValuationService();
