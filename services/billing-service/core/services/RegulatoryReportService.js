const { PrismaClient } = require('@prisma/client');
const TrialBalanceService = require('./TrialBalanceService');
const prisma = new PrismaClient();

/**
 * Service gérant la production de rapports réglementaires (ex: SYSCOA).
 * Il s'appuie sur la balance pour construire des états agrégés officiels.
 */
class RegulatoryReportService {
  /**
   * Génère les données de base pour la liasse fiscale (modèle SYSCOHADA par exemple).
   * Ceci est une implémentation simplifiée qui mapperait les comptes de la balance
   * vers les rubriques réglementaires (Bilan, Résultat).
   * 
   * @param {string} fiscalYearId - ID de l'exercice fiscal
   * @param {number} [enterpriseId] - Filtre entreprise
   * @param {Object} [client=prisma] - Instance Prisma
   */
  async generateSyscoaReport(fiscalYearId, enterpriseId, client = prisma) {
    if (!fiscalYearId) throw new Error('fiscalYearId est requis pour un rapport réglementaire.');

    // 1. Obtenir la balance de l'exercice
    const trialBalance = await TrialBalanceService.generateTrialBalance({
      fiscalYearId,
      enterpriseId
    }, client);

    // 2. Modèle de mapping simplifié SYSCOHADA
    const reportStructure = {
      assets: {
        immobilisations: 0,  // Comptes classe 2
        stocks: 0,           // Comptes classe 3
        creances: 0,         // Comptes classe 4 (Actif)
        tresorerie: 0        // Comptes classe 5 (Actif)
      },
      liabilities: {
        capitauxPropres: 0,  // Comptes classe 1
        dettesLongTerme: 0,  // Comptes classe 16
        dettesCourtTerme: 0, // Comptes classe 4 (Passif)
        tresoreriePassif: 0  // Comptes classe 5 (Passif)
      },
      incomeStatement: {
        chiffreAffaires: 0,  // Comptes classe 7
        achats: 0,           // Comptes classe 60
        chargesExternes: 0,  // Comptes classes 61-63
        chargesPersonnel: 0, // Comptes classe 66
        impotsTaxes: 0,      // Comptes classe 64
        resultatNet: 0
      }
    };

    // 3. Agrégation des soldes
    for (const acc of trialBalance) {
      const code = acc.accountCode;
      const balance = acc.closingBalance;

      // Agrégation Bilan Actif (Généralement solde débiteur positif)
      if (code.startsWith('2')) reportStructure.assets.immobilisations += balance;
      else if (code.startsWith('3')) reportStructure.assets.stocks += balance;
      // Agrégation Résultat
      else if (code.startsWith('7')) reportStructure.incomeStatement.chiffreAffaires += Math.abs(balance);
      else if (code.startsWith('60')) reportStructure.incomeStatement.achats += balance;
      else if (code.startsWith('66')) reportStructure.incomeStatement.chargesPersonnel += balance;
      // Note: L'algorithme réel nécessite un plan de mapping comptable avancé (AccountingFamilyDefinition).
    }

    // 4. Calcul des totaux et du Résultat Net
    const totalProduits = reportStructure.incomeStatement.chiffreAffaires;
    const totalCharges = reportStructure.incomeStatement.achats + reportStructure.incomeStatement.chargesPersonnel;
    reportStructure.incomeStatement.resultatNet = totalProduits - totalCharges;

    // 5. Sauvegarde du Snapshot (Optionnel mais recommandé pour l'audit)
    const snapshot = await client.accountingReportSnapshot.create({
      data: {
        reportType: 'REGULATORY',
        fiscalYearId: fiscalYearId,
        enterpriseId: enterpriseId ? Number(enterpriseId) : null,
        parameters: { format: 'SYSCOA' },
        payload: reportStructure,
        generatedAt: new Date()
      }
    });

    return {
      snapshotId: snapshot.id,
      reportData: reportStructure
    };
  }
}

module.exports = new RegulatoryReportService();
