const { PrismaClient } = require('@prisma/client');
const InvestmentAccountingService = require('./InvestmentAccountingService');
const prisma = new PrismaClient();

/**
 * Service de gestion des Transactions de Placements (InvestmentTransaction).
 *
 * Responsabilités :
 *   - Enregistrement de tout achat, vente, coupon, dividende, etc.
 *   - Mise à jour automatique des positions (InvestmentHolding) après chaque transaction
 *   - Déclenchement de la comptabilisation via InvestmentAccountingService (couplage faible)
 *
 * Architecture modulaire : la comptabilisation est séparée de l'enregistrement métier.
 * On peut déclencher la compta à la demande (workflow contrôlé).
 */
class InvestmentTransactionService {
  // -----------------------------------------------------------------------
  // SECTION 1 : ENREGISTREMENT DES TRANSACTIONS
  // -----------------------------------------------------------------------

  /**
   * Enregistre une transaction sur un portefeuille.
   * Gère automatiquement la mise à jour des positions (Holdings).
   *
   * @param {Object} data - Données de la transaction
   * @param {string} data.portfolioId - ID du portefeuille
   * @param {string} data.assetId - ID de l'actif
   * @param {string} data.transactionType - Type (BUY, SELL, COUPON, DIVIDEND, ...)
   * @param {string|Date} data.tradeDate - Date de transaction
   * @param {number} data.quantity - Quantité
   * @param {number} data.unitPrice - Prix unitaire
   * @param {number} [data.fees=0] - Frais de transaction
   * @param {number} [data.taxes=0] - Taxes
   * @param {string} [data.reference] - Référence externe
   * @param {string} [data.createdByUserId] - ID utilisateur
   * @param {Object} [client=prisma]
   * @returns {Promise<Object>} La transaction créée
   */
  async recordTransaction(data, client = prisma) {
    const {
      portfolioId, assetId, transactionType,
      tradeDate, settlementDate, quantity,
      unitPrice, fees = 0, taxes = 0,
      counterpartyId, reference, notes, createdByUserId,
      assetName, assetType, assetClass // Nouveaux champs pour création à la volée
    } = data;

    // Validation des champs obligatoires
    if (!portfolioId || (!assetId && !assetName) || !transactionType || !tradeDate || quantity == null || unitPrice == null) {
      const err = new Error('portfolioId, asset (id ou nom), transactionType, tradeDate, quantity et unitPrice sont requis.');
      err.statusCode = 400;
      throw err;
    }

    const grossAmount = Math.round(quantity * unitPrice * 100) / 100;
    // Si le montant net est fourni et que la quantité est nulle (cas des coupons), on garde le montant fourni
    let netAmount = data.netAmount;
    if (netAmount == null || quantity > 0) {
      if (transactionType === 'SELL' || transactionType === 'MATURITY') {
        // Pour une vente, les frais diminuent le cash reçu
        netAmount = Math.round((grossAmount - fees - taxes) * 100) / 100;
      } else {
        // Pour un achat, les frais augmentent le décaissement
        netAmount = Math.round((grossAmount + fees + taxes) * 100) / 100;
      }
    }

    let resolvedAssetId = assetId;

    const execute = async (tx) => {
      // 0. Si l'assetId est absent mais qu'on a un nom, on crée l'actif
      if (!resolvedAssetId && assetName) {
        const asset = await tx.investmentAsset.create({
          data: {
            assetCode: `AUTO-${Date.now()}`,
            label: assetName,
            assetType: assetType || 'OTHER',
            assetClass: assetClass || 'OTHER',
            currency: data.currency || 'XOF'
          }
        });
        resolvedAssetId = asset.id;
      }

      // Récupérer l'enterpriseId depuis le portefeuille si non fourni
      let resolvedEnterpriseId = data.enterpriseId;
      if (!resolvedEnterpriseId) {
        const portfolio = await tx.investmentPortfolio.findUnique({
          where: { id: portfolioId },
          select: { enterpriseId: true }
        });
        resolvedEnterpriseId = portfolio?.enterpriseId;
      }

      let metadata = data.metadata || {};

      // Pour les sorties (Vente/Échéance), on capture le coût moyen actuel pour la compta
      if (transactionType === 'SELL' || transactionType === 'MATURITY') {
        const holding = await tx.investmentHolding.findUnique({
          where: { portfolioId_assetId: { portfolioId, assetId: resolvedAssetId } }
        });
        if (holding) {
          metadata.averageCost = holding.averageCost;
        }
      }

      // 1. Créer la transaction
      const transaction = await tx.investmentTransaction.create({
        data: {
          portfolioId,
          assetId: resolvedAssetId,
          enterpriseId: resolvedEnterpriseId ? Number(resolvedEnterpriseId) : null,
          counterpartyId: counterpartyId || null,
          transactionType,
          tradeDate: new Date(tradeDate),
          settlementDate: settlementDate ? new Date(settlementDate) : null,
          quantity,
          unitPrice,
          grossAmount,
          fees,
          taxes,
          netAmount,
          currency: data.currency || 'XOF',
          exchangeRate: data.exchangeRate || null,
          reference: reference || null,
          notes: notes || null,
          createdByUserId: createdByUserId || null,
          status: 'DRAFT',
          metadata: metadata
        }
      });

      // 2. Mettre à jour la position (Holding)
      await this._updateHolding(tx, { portfolioId, assetId: resolvedAssetId, transactionType, quantity, grossAmount });

      return transaction;
    };

    // Exécuter dans une transaction Prisma pour garantir l'atomicité
    if (typeof client.$transaction === 'function') {
      return client.$transaction(execute);
    }
    return execute(client);
  }

  // -----------------------------------------------------------------------
  // SECTION 2 : MISE À JOUR DES POSITIONS (Usage interne)
  // -----------------------------------------------------------------------

  /**
   * Met à jour ou crée la position (InvestmentHolding) suite à une transaction.
   * Logique d'inventaire permanent (FIFO implicite, coût moyen pondéré).
   *
   * @private
   */
  async _updateHolding(tx, { portfolioId, assetId, transactionType, quantity, grossAmount }) {
    const existing = await tx.investmentHolding.findUnique({
      where: { portfolioId_assetId: { portfolioId, assetId } }
    });

    if (transactionType === 'BUY') {
      if (existing) {
        // Recalcul du coût moyen pondéré
        const newTotalQty = existing.quantity + quantity;
        const newBookValue = existing.bookValue + grossAmount;
        const newAvgCost = newBookValue / newTotalQty;

        await tx.investmentHolding.update({
          where: { id: existing.id },
          data: {
            quantity: newTotalQty,
            bookValue: Math.round(newBookValue * 100) / 100,
            averageCost: Math.round(newAvgCost * 100) / 100,
            valuationDate: new Date()
          }
        });
      } else {
        // Création d'une nouvelle position
        await tx.investmentHolding.create({
          data: {
            portfolioId,
            assetId,
            quantity,
            bookValue: Math.round(grossAmount * 100) / 100,
            averageCost: Math.round(grossAmount / quantity * 100) / 100,
            status: 'OPEN',
            valuationDate: new Date()
          }
        });
      }
    } else if (transactionType === 'SELL' || transactionType === 'MATURITY') {
      if (!existing || existing.quantity < quantity) {
        const err = new Error('Position insuffisante pour exécuter cette vente/cession.');
        err.statusCode = 400;
        throw err;
      }

      const newQty = existing.quantity - quantity;
      const newBookValue = newQty * existing.averageCost;

      await tx.investmentHolding.update({
        where: { id: existing.id },
        data: {
          quantity: newQty,
          bookValue: Math.round(newBookValue * 100) / 100,
          status: newQty === 0 ? 'CLOSED' : 'OPEN',
          valuationDate: new Date()
        }
      });
    }
    // Les autres types (COUPON, DIVIDEND, etc.) n'impactent pas la quantité de position
  }

  // -----------------------------------------------------------------------
  // SECTION 3 : VALIDATION D'UNE TRANSACTION
  // -----------------------------------------------------------------------

  /**
   * Valide une transaction en attente (DRAFT -> SETTLED).
   * @param {string} transactionId
   * @param {string} validatedByUserId
   * @param {Object} [client=prisma]
   */
  async validateTransaction(transactionId, validatedByUserId, client = prisma) {
    const tx = await client.investmentTransaction.findUnique({ where: { id: transactionId } });
    if (!tx) {
      const err = new Error('Transaction introuvable.'); err.statusCode = 404; throw err;
    }
    if (tx.status !== 'DRAFT') {
      const err = new Error('Seules les transactions en brouillon peuvent être validées.'); err.statusCode = 400; throw err;
    }

    const updated = await client.investmentTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'SETTLED',
        validatedByUserId,
        validatedAt: new Date()
      }
    });

    // Déclencher la comptabilisation automatique
    try {
      await InvestmentAccountingService.postTransactionAccounting(transactionId, { userId: validatedByUserId }, client);
    } catch (e) {
      console.warn(`[InvTransaction] Erreur comptabilisation automatique: ${e.message}`);
      // On ne bloque pas la validation métier si la compta échoue (mapping manquant par ex)
    }

    return updated;
  }

  /**
   * Liste les transactions d'un portefeuille avec filtres optionnels.
   * @param {Object} filters
   * @param {Object} [client=prisma]
   */
  async listTransactions(filters = {}, client = prisma) {
    const where = {};
    if (filters.portfolioId) where.portfolioId = filters.portfolioId;
    if (filters.enterpriseId) where.enterpriseId = Number(filters.enterpriseId);
    if (filters.assetId) where.assetId = filters.assetId;
    if (filters.transactionType) where.transactionType = filters.transactionType;
    if (filters.status) where.status = filters.status;
    if (filters.from) where.tradeDate = { ...where.tradeDate, gte: new Date(filters.from) };
    if (filters.to) where.tradeDate = { ...where.tradeDate, lte: new Date(filters.to) };

    return client.investmentTransaction.findMany({
      where,
      include: { asset: true },
      orderBy: { tradeDate: 'desc' }
    });
  }
}

module.exports = new InvestmentTransactionService();
