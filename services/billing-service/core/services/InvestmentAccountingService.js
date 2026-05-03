const { PrismaClient } = require('@prisma/client');
const AccountingPostingService = require('./AccountingPostingService');
const prisma = new PrismaClient();

/**
 * Service d'Intégration Comptable des Placements (InvestmentAccountingService).
 *
 * Ce service est le PONT entre le module métier Placements et le noyau comptable.
 * Il traduit chaque événement de placement validé en écritures comptables persistantes,
 * en s'appuyant sur InvestmentAccountingMapping et AccountingPostingService.
 *
 * Architecture modulaire :
 *   - Aucune écriture comptable n'est créée directement ici.
 *   - On passe toujours par AccountingPostingService.postEntry()
 *   - Le mapping comptable est piloté par InvestmentAccountingMapping en base.
 */
class InvestmentAccountingService {

  // -----------------------------------------------------------------------
  // SECTION 1 : COMPTABILISATION D'UNE TRANSACTION DE PLACEMENT
  // -----------------------------------------------------------------------

  /**
   * Traduit une transaction de placement en écritures comptables.
   * Doit être appelé après la validation de la transaction (status: SETTLED).
   *
   * @param {string} transactionId - ID de la transaction à comptabiliser
   * @param {Object} meta - Métadonnées optionnelles (userId, enterpriseId, etc.)
   * @param {Object} [client=prisma]
   * @returns {Promise<Object>} L'écriture comptable créée
   */
  async postTransactionAccounting(transactionId, meta = {}, client = prisma) {
    // 1. Récupérer la transaction avec son actif
    const tx = await client.investmentTransaction.findUnique({
      where: { id: transactionId },
      include: { asset: true }
    });

    if (!tx) {
      const err = new Error('Transaction de placement introuvable.'); err.statusCode = 404; throw err;
    }
    if (tx.status !== 'SETTLED') {
      const err = new Error('Seules les transactions validées (SETTLED) peuvent être comptabilisées.'); err.statusCode = 400; throw err;
    }

    // 2. Résoudre le mapping comptable pour ce type de transaction
    const eid = meta.enterpriseId || tx.enterpriseId || null;
    const mapping = await this._resolveMapping(client, tx.asset.assetType, tx.asset.assetClass, tx.transactionType, eid);

    if (!mapping || (!mapping.debitAccountId && !mapping.creditAccountId)) {
      const err = new Error(
        `Aucun mapping comptable trouvé pour assetType=${tx.asset.assetType}, transactionType=${tx.transactionType}. Configurez un InvestmentAccountingMapping.`
      );
      err.statusCode = 422; throw err;
    }

    // 3. Construire les lignes comptables selon le type de transaction
    console.log(`[DEBUG] Transaction: ${tx.transactionType}, NetAmount: ${tx.netAmount}`);
    
    let averageCost = 0;
    if (tx.transactionType === 'SELL' || tx.transactionType === 'MATURITY') {
      const holding = await client.investmentHolding.findUnique({
        where: { portfolioId_assetId: { portfolioId: tx.portfolioId, assetId: tx.assetId } }
      });
      averageCost = holding?.averageCost || 0;
    }

    const lines = this._buildAccountingLines(tx, mapping, averageCost);
    console.log(`[DEBUG] Generated ${lines.length} lines`);

    // 4. Poster l'écriture via le noyau comptable
    const entry = await AccountingPostingService.postEntry({
      entryDate: tx.tradeDate,
      journalCode: 'INVEST',
      journalLabel: 'Journal des Placements',
      label: `${tx.transactionType} - ${tx.asset.label} (x${tx.quantity})`,
      reference: tx.reference || transactionId,
      sourceType: 'INVESTMENT_TRANSACTION',
      sourceId: transactionId,
      enterpriseId: meta.enterpriseId || tx.enterpriseId || null,
      enterpriseName: meta.enterpriseName || tx.enterpriseName || null,
      createdByUserId: meta.userId || tx.createdByUserId,
      status: 'POSTED',
      lines
    }, client);

    return entry;
  }

  // -----------------------------------------------------------------------
  // SECTION 2 : RÉSOLUTION DU MAPPING COMPTABLE
  // -----------------------------------------------------------------------

  /**
   * Recherche le mapping comptable le plus précis disponible.
   * Ordre de priorité : assetType + assetClass + transactionType > assetType seul
   * @private
   */
  async _resolveMapping(client, assetType, assetClass, transactionType, enterpriseId = null) {
    const eid = enterpriseId ? Number(enterpriseId) : null;
    // Cherche d'abord un mapping précis par entreprise
    let mapping = await client.investmentAccountingMapping.findFirst({
      where: { assetType, assetClass, transactionType, isActive: true, enterpriseId: eid }
    });
    // Fallback sur le type de transaction par entreprise
    if (!mapping) {
      mapping = await client.investmentAccountingMapping.findFirst({
        where: { transactionType, isActive: true, enterpriseId: eid }
      });
    }
    // Fallback global (enterpriseId = null) si non trouvé pour l'entreprise
    if (!mapping && eid !== null) {
       mapping = await client.investmentAccountingMapping.findFirst({
         where: { assetType, assetClass, transactionType, isActive: true, enterpriseId: null }
       });
       if (!mapping) {
         mapping = await client.investmentAccountingMapping.findFirst({
           where: { transactionType, isActive: true, enterpriseId: null }
         });
       }
    }
    console.log(`[DEBUG] Mapping found ID: ${mapping?.id} (Ent: ${eid}), Debit: ${mapping?.debitAccountId}, Credit: ${mapping?.creditAccountId}, Income: ${mapping?.incomeAccountId}`);
    return mapping;
  }

  // -----------------------------------------------------------------------
  // SECTION 3 : CONSTRUCTION DES LIGNES D'ÉCRITURES
  // -----------------------------------------------------------------------

  /**
   * Construit les lignes de débit/crédit selon le type de transaction.
   * @private
   */
  _buildAccountingLines(tx, mapping, averageCost = 0) {
    const amount = tx.netAmount;
    const lines = [];

    if (tx.transactionType === 'BUY') {
      // Achat d'actif : DEBIT Titre / CREDIT Trésorerie
      if (mapping.debitAccountId) lines.push({ accountId: mapping.debitAccountId, side: 'DEBIT', amount: tx.netAmount, description: `Acquisition - ${tx.asset?.label || ''}` });
      if (mapping.creditAccountId) lines.push({ accountId: mapping.creditAccountId, side: 'CREDIT', amount: tx.netAmount, description: `Règlement - ${tx.asset?.label || ''}` });

    } else if (tx.transactionType === 'SELL' || tx.transactionType === 'MATURITY') {
      // Vente / Remboursement : DEBIT Trésorerie / CREDIT Titre +/- Gain/Perte
      const cashAmount = tx.netAmount;
      const bookValue = tx.quantity * averageCost;
      const gainLoss = Math.round((cashAmount - bookValue) * 100) / 100;

      // 1. Encaissement Banque
      if (mapping.creditAccountId) lines.push({ accountId: mapping.creditAccountId, side: 'DEBIT', amount: cashAmount, description: `Encaissement cession - ${tx.asset?.label || ''}` });
      
      // 2. Sortie du titre au coût historique (Book Value)
      if (mapping.debitAccountId) lines.push({ accountId: mapping.debitAccountId, side: 'CREDIT', amount: bookValue, description: `Sortie du portefeuille (VNC) - ${tx.asset?.label || ''}` });

      // 3. Constatation du Gain ou de la Perte
      if (gainLoss > 0 && mapping.incomeAccountId) {
        lines.push({ accountId: mapping.incomeAccountId, side: 'CREDIT', amount: gainLoss, description: `Plus-value de cession - ${tx.asset?.label || ''}` });
      } else if (gainLoss < 0 && mapping.expenseAccountId) {
        lines.push({ accountId: mapping.expenseAccountId, side: 'DEBIT', amount: Math.abs(gainLoss), description: `Moins-value de cession - ${tx.asset?.label || ''}` });
      }

    } else if (['COUPON', 'DIVIDEND', 'RENT'].includes(tx.transactionType)) {
      // Revenus : DEBIT Trésorerie / CREDIT Produits financiers
      if (mapping.creditAccountId) lines.push({ accountId: mapping.creditAccountId, side: 'DEBIT', amount: tx.netAmount, description: `Encaissement ${tx.transactionType} - ${tx.asset?.label || ''}` });
      if (mapping.incomeAccountId) lines.push({ accountId: mapping.incomeAccountId, side: 'CREDIT', amount: tx.netAmount, description: `Produit ${tx.transactionType} - ${tx.asset?.label || ''}` });

    } else if (tx.transactionType === 'FEE') {
      // Frais : DEBIT Charges / CREDIT Trésorerie
      if (mapping.expenseAccountId) lines.push({ accountId: mapping.expenseAccountId, side: 'DEBIT', amount: tx.netAmount, description: `Frais - ${tx.asset?.label || ''}` });
      if (mapping.creditAccountId) lines.push({ accountId: mapping.creditAccountId, side: 'CREDIT', amount: tx.netAmount, description: `Règlement frais - ${tx.asset?.label || ''}` });
    }

    return lines;
  }
}

module.exports = new InvestmentAccountingService();
