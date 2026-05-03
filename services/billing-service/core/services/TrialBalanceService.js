const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Service gérant la génération de la Balance Générale (Trial Balance).
 * Il s'appuie de manière stricte sur le journal comptable persistant
 * pour garantir l'auditabilité et l'intégrité des états financiers.
 */
class TrialBalanceService {
  /**
   * Génère la balance générale pour une période ou un exercice donné.
   * 
   * @param {Object} options - Options de filtrage
   * @param {string} options.periodId - ID de la période comptable (optionnel si fiscalYearId fourni)
   * @param {string} options.fiscalYearId - ID de l'exercice (optionnel si periodId fourni)
   * @param {number} [options.enterpriseId] - Filtre par entreprise (optionnel)
   * @param {Object} [client=prisma] - Instance Prisma pour les transactions
   * @returns {Promise<Array>} Liste des comptes avec soldes d'ouverture, mouvements (débit/crédit) et soldes finaux.
   */
  async generateTrialBalance(options, client = prisma) {
    const { periodId, fiscalYearId, enterpriseId, startDate, endDate } = options;

    let resolvedPeriodId = periodId;
    let resolvedFiscalYearId = fiscalYearId;

    if (!resolvedPeriodId && !resolvedFiscalYearId && !startDate && !endDate) {
      const AccountingPeriodService = require('./AccountingPeriodService');
      const currentPeriod = await AccountingPeriodService.getOrCreatePeriodForDate(client, new Date());
      resolvedPeriodId = currentPeriod.id;
      resolvedFiscalYearId = currentPeriod.fiscalYearId;
    }

    // 1. Définir les filtres de base sur les écritures comptables
    const entryFilters = {
      status: 'POSTED', // Seules les écritures validées et postées sont prises en compte
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

    // 2. Récupérer toutes les lignes d'écritures correspondantes
    // Note: Dans un environnement avec d'énormes volumes, on privilégierait une requête SQL native avec SUM() et GROUP BY.
    const journalLines = await client.accountingJournalLine.findMany({
      where: {
        entry: entryFilters
      },
      include: {
        account: true
      }
    });

    // 3. Agréger les données par compte comptable
    const balanceMap = new Map();

    for (const line of journalLines) {
      const accountId = line.accountId;
      
      if (!balanceMap.has(accountId)) {
        balanceMap.set(accountId, {
          accountId: line.account.id,
          accountCode: line.account.code,
          accountLabel: line.account.label,
          openingBalance: line.account.openingBalance || 0, // Idéalement, calculer depuis la clôture de la période N-1
          debit: 0,
          credit: 0,
          closingBalance: 0
        });
      }

      const accountData = balanceMap.get(accountId);

      if (line.side === 'DEBIT') {
        accountData.debit += line.amount;
      } else if (line.side === 'CREDIT') {
        accountData.credit += line.amount;
      }
    }

    // 4. Calcul des soldes de clôture
    const trialBalance = Array.from(balanceMap.values()).map(acc => {
      // Formule générale: Solde Final = Solde Initial + Débit - Crédit
      // (Ajuster si la convention de signe (actif/passif) l'exige. Ici, on reste sur une approche mathématique simple)
      acc.closingBalance = acc.openingBalance + acc.debit - acc.credit;
      
      // On arrondit pour éviter les erreurs de virgule flottante
      acc.debit = Math.round(acc.debit * 100) / 100;
      acc.credit = Math.round(acc.credit * 100) / 100;
      acc.closingBalance = Math.round(acc.closingBalance * 100) / 100;
      
      return acc;
    });

    // 5. Tri par code comptable pour la lisibilité
    trialBalance.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    return trialBalance;
  }
}

module.exports = new TrialBalanceService();
