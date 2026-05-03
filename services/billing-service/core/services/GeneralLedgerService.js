const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Service gérant la génération du Grand Livre (General Ledger).
 * Fournit le détail chronologique de toutes les opérations affectant les comptes.
 */
class GeneralLedgerService {
  /**
   * Génère le grand livre.
   * 
   * @param {Object} options - Options de filtrage
   * @param {string} options.periodId - ID de la période comptable
   * @param {string} options.fiscalYearId - ID de l'exercice
   * @param {number} [options.enterpriseId] - Filtre entreprise
   * @param {Array<string>} [options.accountIds] - Liste d'IDs de comptes spécifiques à extraire
   * @param {Object} [client=prisma] - Instance Prisma
   * @returns {Promise<Array>} Grand livre formaté par compte
   */
  async generateLedger(options, client = prisma) {
    const { periodId, fiscalYearId, enterpriseId, accountIds, startDate, endDate } = options;
    let resolvedPeriodId = periodId;
    let resolvedFiscalYearId = fiscalYearId;

    // Si on a des dates mais pas de période, on essaie de trouver la période correspondante
    // ou on filtre par date plus tard.
    if (!resolvedPeriodId && !resolvedFiscalYearId && !startDate && !endDate) {
      const AccountingPeriodService = require('./AccountingPeriodService');
      const currentPeriod = await AccountingPeriodService.getOrCreatePeriodForDate(client, new Date());
      resolvedPeriodId = currentPeriod.id;
      resolvedFiscalYearId = currentPeriod.fiscalYearId;
    }

    const entryFilters = {
      status: 'POSTED',
    };

    if (resolvedPeriodId) entryFilters.periodId = resolvedPeriodId;
    if (resolvedFiscalYearId) entryFilters.fiscalYearId = resolvedFiscalYearId;
    
    // Support des plages de dates explicites
    if (startDate || endDate) {
      entryFilters.entryDate = {};
      if (startDate) entryFilters.entryDate.gte = new Date(startDate);
      if (endDate) entryFilters.entryDate.lte = new Date(endDate);
    }

    if (enterpriseId) entryFilters.enterpriseId = Number(enterpriseId);

    const lineFilters = { entry: entryFilters };
    if (accountIds && accountIds.length > 0) {
      lineFilters.accountId = { in: accountIds };
    }

    // Récupération des lignes avec jointure sur l'entrée pour les dates et libellés
    const journalLines = await client.accountingJournalLine.findMany({
      where: lineFilters,
      include: {
        account: true,
        entry: {
          select: {
            entryNumber: true,
            entryDate: true,
            journalCode: true,
            label: true,
            reference: true
          }
        }
      },
      orderBy: [
        { account: { code: 'asc' } },
        { entry: { entryDate: 'asc' } }
      ]
    });

    // Structuration en arbre: Compte -> Lignes d'écritures
    const ledgerMap = new Map();

    for (const line of journalLines) {
      const accountId = line.accountId;
      
      if (!ledgerMap.has(accountId)) {
        ledgerMap.set(accountId, {
          accountId: line.account.id,
          accountCode: line.account.code,
          accountLabel: line.account.label,
          openingBalance: line.account.openingBalance || 0,
          totalDebit: 0,
          totalCredit: 0,
          currentBalance: line.account.openingBalance || 0,
          lines: []
        });
      }

      const accountData = ledgerMap.get(accountId);
      
      // Calcul du solde progressif
      if (line.side === 'DEBIT') {
        accountData.totalDebit += line.amount;
        accountData.currentBalance += line.amount;
      } else {
        accountData.totalCredit += line.amount;
        accountData.currentBalance -= line.amount;
      }

      // Ajout de la ligne détaillée
      accountData.lines.push({
        lineId: line.id,
        date: line.entry.entryDate,
        journal: line.entry.journalCode,
        entryNumber: line.entry.entryNumber,
        label: line.entry.label,
        reference: line.entry.reference,
        thirdPartyName: line.thirdPartyName,
        debit: line.side === 'DEBIT' ? line.amount : 0,
        credit: line.side === 'CREDIT' ? line.amount : 0,
        runningBalance: Math.round(accountData.currentBalance * 100) / 100
      });
    }

    return Array.from(ledgerMap.values());
  }
}

module.exports = new GeneralLedgerService();
