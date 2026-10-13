const { applyEnterpriseScope, buildDateWhere, MappingService, prisma, resolveEnterpriseIdsForRequest } = require('./shared');

// Applique le périmètre de l'entreprise et charge les données de la période demandée.
const loadAccountingOverviewData = async ({ req, startDate, endDate }) => {
    const requestedEnterpriseId = req.query.enterpriseId;
    const invoiceWhere = await applyEnterpriseScope({
      req,
      where: buildDateWhere('dateEmission', startDate, endDate),
      requestedEnterpriseId,
    });
    const paymentWhere = await applyEnterpriseScope({
      req,
      where: buildDateWhere('datePaiement', startDate, endDate),
      requestedEnterpriseId,
    });
    const commitmentWhere = await applyEnterpriseScope({
      req,
      where: buildDateWhere('createdAt', startDate, endDate),
      requestedEnterpriseId,
    });
    const encaissementWhere = await applyEnterpriseScope({
      req,
      where: buildDateWhere('dateEncaissement', startDate, endDate),
      requestedEnterpriseId,
    });
    const decaissementWhere = await applyEnterpriseScope({
      req,
      where:
      !startDate && !endDate
        ? {}
        : {
            OR: [
              buildDateWhere('dateDecaissement', startDate, endDate),
              buildDateWhere('createdAt', startDate, endDate),
            ],
          },
      requestedEnterpriseId,
    });
    const journalEntryWhere = await applyEnterpriseScope({
      req,
      where: buildDateWhere('entryDate', startDate, endDate),
      requestedEnterpriseId,
    });
    const accountingAccountWhere = await applyEnterpriseScope({
      req,
      where: { isActive: true },
      requestedEnterpriseId,
    });
    const treasuryTransferWhere = await applyEnterpriseScope({
      req,
      where: buildDateWhere('date', startDate, endDate),
      requestedEnterpriseId,
    });
    const treasuryEnterpriseIds = await resolveEnterpriseIdsForRequest(req, requestedEnterpriseId);

    console.log('[DEBUG] Step 1: Fetching core accounting data', { startDate, endDate });
    await MappingService.refreshCache(requestedEnterpriseId);

    // Helper pour sécuriser les appels Prisma
    const safeQuery = async (promise, label) => {
      try {
        return await promise;
      } catch (err) {
        console.error(`[CRITICAL] Prisma Query Fail (${label}):`, err.message);
        return [];
      }
    };

    const results = await Promise.all([
      safeQuery(prisma.facture.findMany({
        where: invoiceWhere,
        include: { paiements: true, lignes: true },
        orderBy: { dateEmission: 'desc' },
      }), 'factures'),
      safeQuery(prisma.paiement.findMany({
        where: paymentWhere,
        include: { facture: true, treasuryAccount: { include: { accountingAccount: true } } },
        orderBy: { datePaiement: 'desc' },
      }), 'paiements'),
      safeQuery(prisma.purchaseCommitment.findMany({
        where: commitmentWhere,
        orderBy: { createdAt: 'desc' },
      }), 'commitments'),
      safeQuery(prisma.encaissement.findMany({
        where: encaissementWhere,
        include: { treasuryAccount: { include: { accountingAccount: true } } },
        orderBy: { dateEncaissement: 'desc' },
      }), 'encaissements'),
      safeQuery(prisma.decaissement.findMany({
        where: decaissementWhere,
        include: { treasuryAccount: { include: { accountingAccount: true } } },
        orderBy: [{ dateDecaissement: 'desc' }, { createdAt: 'desc' }],
      }), 'decaissements'),
      safeQuery(prisma.accountingAccount.findMany({
        where: accountingAccountWhere,
        orderBy: [{ code: 'asc' }],
      }), 'persistedAccounts'),
      safeQuery(prisma.accountingJournalEntry.findMany({
        where: journalEntryWhere,
        include: {
          lines: {
            include: { account: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      }), 'manualJournalEntries'),
      safeQuery(prisma.treasuryAccount.findMany({
        where: {
          isActive: true,
          ...(Array.isArray(treasuryEnterpriseIds)
            ? { accountingAccount: { enterpriseId: { in: treasuryEnterpriseIds.length ? treasuryEnterpriseIds : [-1] } } }
            : {}),
        },
        include: { accountingAccount: true },
        orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
      }), 'treasuryAccounts'),
      safeQuery(prisma.treasuryTransfer.findMany({
        where: treasuryTransferWhere,
        include: { sourceAccount: true, destinationAccount: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }), 'treasuryTransfers'),
    ]);

    const [factures, paiements, commitments, encaissements, decaissements, persistedAccounts, manualJournalEntries, treasuryAccounts, treasuryTransfers] = results;


  return {
    requestedEnterpriseId,
    factures,
    paiements,
    commitments,
    encaissements,
    decaissements,
    persistedAccounts,
    manualJournalEntries,
    treasuryAccounts,
    treasuryTransfers,
  };
};

module.exports = { loadAccountingOverviewData };
