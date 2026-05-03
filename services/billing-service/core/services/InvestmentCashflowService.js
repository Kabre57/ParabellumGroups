const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Service de gestion des Cash-flows attendus et reçus sur les placements.
 *
 * Responsabilités :
 *   - Générer les échéances prévisionnelles (coupons, dividendes, loyers, remboursements)
 *   - Suivre les encaissements réels vs prévus
 *   - Mettre à jour le statut des flux (PENDING, RECEIVED, PARTIAL)
 *
 * Ce service est critique pour le suivi des tombées de trésorerie attendues
 * et alimente le tableau de bord des cash-flows prévisionnels.
 */
class InvestmentCashflowService {
  // -----------------------------------------------------------------------
  // SECTION 1 : GÉNÉRATION DES CASH-FLOWS ATTENDUS
  // -----------------------------------------------------------------------

  /**
   * Génère les flux de trésorerie attendus pour un actif donné,
   * selon son type, son taux de coupon et sa fréquence de paiement.
   *
   * @param {string} assetId - ID de l'actif
   * @param {string} portfolioId - ID du portefeuille
   * @param {Object} [client=prisma]
   * @returns {Promise<Array>} Liste des flux générés ou existants
   */
  async generateExpectedCashflows(assetId, portfolioId, client = prisma) {
    // Récupérer l'actif et la position
    const asset = await client.investmentAsset.findUnique({ where: { id: assetId } });
    if (!asset) {
      const err = new Error('Actif introuvable.'); err.statusCode = 404; throw err;
    }

    const holding = await client.investmentHolding.findUnique({
      where: { portfolioId_assetId: { portfolioId, assetId } }
    });
    if (!holding || holding.status === 'CLOSED') {
      const err = new Error('Aucune position ouverte pour cet actif dans ce portefeuille.');
      err.statusCode = 400; throw err;
    }

    const cashflows = [];

    // --- Générer les flux pour les OBLIGATIONS (coupons périodiques + remboursement in fine) ---
    if ((asset.assetType === 'BOND' || asset.assetType === 'TREASURY_BILL') && asset.couponRate && asset.maturityDate) {
      const periodicFlows = this._generateCouponSchedule(asset, holding);
      for (const flow of periodicFlows) {
        cashflows.push(await this._upsertCashflow(client, { ...flow, portfolioId, assetId }));
      }

      // Flux de remboursement du capital à l'échéance
      cashflows.push(await this._upsertCashflow(client, {
        portfolioId, assetId,
        flowType: 'MATURITY',
        dueDate: new Date(asset.maturityDate),
        expectedAmount: Math.round(holding.quantity * (asset.nominalValue || 0) * 100) / 100
      }));
    }

    // --- Générer les flux pour les DAT (remboursement unique à l'échéance avec intérêts) ---
    if (asset.assetType === 'TERM_DEPOSIT' && asset.maturityDate) {
      const interest = asset.nominalValue * holding.quantity * ((asset.couponRate || 0) / 100);
      cashflows.push(await this._upsertCashflow(client, {
        portfolioId, assetId,
        flowType: 'TERM_DEPOSIT_MATURITY',
        dueDate: new Date(asset.maturityDate),
        expectedAmount: Math.round((holding.bookValue + interest) * 100) / 100
      }));
    }

    // --- Flux IMMOBILIER : Loyers périodiques ---
    if (asset.assetType === 'REAL_ESTATE' && asset.couponRate && asset.nominalValue) {
      const monthlyRent = Math.round(asset.nominalValue * (asset.couponRate / 100) / 12 * 100) / 100;
      const endDate = asset.maturityDate ? new Date(asset.maturityDate) : new Date(new Date().getFullYear(), 11, 31);
      let current = new Date();
      current.setDate(1);

      while (current <= endDate) {
        cashflows.push(await this._upsertCashflow(client, {
          portfolioId, assetId,
          flowType: 'RENT',
          dueDate: new Date(current),
          expectedAmount: monthlyRent
        }));
        current.setMonth(current.getMonth() + 1);
      }
    }

    return cashflows;
  }

  // -----------------------------------------------------------------------
  // SECTION 2 : ENREGISTREMENT DES ENCAISSEMENTS RÉELS
  // -----------------------------------------------------------------------

  /**
   * Enregistre un encaissement partiel ou total sur un flux attendu.
   *
   * @param {string} cashflowId - ID du flux attendu
   * @param {number} amount - Montant reçu
   * @param {Object} [client=prisma]
   */
  async receiveCashflow(cashflowId, amount, client = prisma) {
    const cashflow = await client.expectedCashflow.findUnique({ where: { id: cashflowId } });
    if (!cashflow) {
      const err = new Error('Flux de trésorerie introuvable.'); err.statusCode = 404; throw err;
    }
    if (cashflow.status === 'RECEIVED') {
      const err = new Error('Ce flux a déjà été entièrement encaissé.'); err.statusCode = 400; throw err;
    }

    const newReceived = Math.round((cashflow.receivedAmount + amount) * 100) / 100;
    const newStatus = newReceived >= cashflow.expectedAmount ? 'RECEIVED' : 'PARTIAL';

    return client.expectedCashflow.update({
      where: { id: cashflowId },
      data: { receivedAmount: newReceived, status: newStatus }
    });
  }

  /**
   * Liste les flux d'un portefeuille avec filtres.
   * @param {Object} filters
   * @param {Object} [client=prisma]
   */
  async listCashflows(filters = {}, client = prisma) {
    const where = {};
    if (filters.portfolioId) where.portfolioId = filters.portfolioId;
    if (filters.assetId) where.assetId = filters.assetId;
    if (filters.status) where.status = filters.status;
    if (filters.flowType) where.flowType = filters.flowType;
    if (filters.from) where.dueDate = { gte: new Date(filters.from) };
    if (filters.to) where.dueDate = { ...where.dueDate, lte: new Date(filters.to) };

    return client.expectedCashflow.findMany({
      where,
      include: { asset: true },
      orderBy: { dueDate: 'asc' }
    });
  }

  // -----------------------------------------------------------------------
  // SECTION 3 : MÉTHODES INTERNES
  // -----------------------------------------------------------------------

  /**
   * Génère le calendrier des coupons selon la fréquence de paiement de l'actif.
   * @private
   */
  _generateCouponSchedule(asset, holding) {
    const flows = [];
    if (!asset.issueDate || !asset.maturityDate || !asset.couponRate || !asset.nominalValue) return flows;

    const freqMonths = { MONTHLY: 1, QUARTERLY: 3, SEMI_ANNUAL: 6, ANNUAL: 12 }[asset.paymentFrequency] || 12;
    const nominalTotal = asset.nominalValue * holding.quantity;
    const couponAmount = Math.round(nominalTotal * (asset.couponRate / 100) / (12 / freqMonths) * 100) / 100;

    let current = new Date(asset.issueDate);
    current.setMonth(current.getMonth() + freqMonths);
    const maturity = new Date(asset.maturityDate);

    while (current <= maturity) {
      flows.push({ flowType: 'COUPON', dueDate: new Date(current), expectedAmount: couponAmount });
      current.setMonth(current.getMonth() + freqMonths);
    }

    return flows;
  }

  /**
   * Crée ou met à jour un flux attendu (évite les doublons).
   * @private
   */
  async _upsertCashflow(client, data) {
    const existing = await client.expectedCashflow.findFirst({
      where: {
        portfolioId: data.portfolioId,
        assetId: data.assetId,
        flowType: data.flowType,
        dueDate: data.dueDate
      }
    });

    if (existing) return existing;

    return client.expectedCashflow.create({
      data: {
        portfolioId: data.portfolioId,
        assetId: data.assetId,
        flowType: data.flowType,
        dueDate: data.dueDate,
        expectedAmount: data.expectedAmount,
        currency: data.currency || 'XOF',
        status: 'PENDING'
      }
    });
  }
}

module.exports = new InvestmentCashflowService();
