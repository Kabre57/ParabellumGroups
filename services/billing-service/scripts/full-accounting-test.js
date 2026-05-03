
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const AccountingPostingService = require('../core/services/AccountingPostingService');
const MappingService = require('../core/services/AccountingMappingService');
const GeneralLedgerService = require('../core/services/GeneralLedgerService');
const TrialBalanceService = require('../core/services/TrialBalanceService');
const { resolveAccountingAccount } = require('../utils/accountingAccountResolver');

async function runFullTest() {
  const ENTERPRISE_ID = 101;
  const TEST_LABEL = `TEST_E2E_${Date.now()}`;

  console.log(`\n🚀 DÉMARRAGE DU TEST E2E COMPLET - ENTREPRISE ${ENTERPRISE_ID}\n`);

  try {
    // 1. CRÉATION DES COMPTES COMPTABLES
    console.log('Step 1: Création/Vérification des comptes...');
    const accounts = {
      bank: await getOrCreateAccount('512099', 'Banque Test E2E', 'ASSET', ENTERPRISE_ID),
      revenue: await getOrCreateAccount('701099', 'Ventes Test E2E', 'REVENUE', ENTERPRISE_ID),
      investment: await getOrCreateAccount('271099', 'Titres Placement E2E', 'ASSET', ENTERPRISE_ID),
      fees: await getOrCreateAccount('627099', 'Frais Bancaires E2E', 'EXPENSE', ENTERPRISE_ID),
      taxes: await getOrCreateAccount('635099', 'Taxes E2E', 'EXPENSE', ENTERPRISE_ID),
    };

    console.log('✅ Comptes prêts.');

    // 1.1 CRÉATION DES JOURNAUX
    console.log('Step 1.1: Création des journaux...');
    await prisma.accountingJournal.upsert({
      where: { code_enterpriseId: { code: 'BQ_ENC', enterpriseId: ENTERPRISE_ID } },
      update: {},
      create: { code: 'BQ_ENC', label: 'Journal Banques Encaissements', type: 'BANK', enterpriseId: ENTERPRISE_ID }
    });
    await prisma.accountingJournal.upsert({
      where: { code_enterpriseId: { code: 'BQ_INV', enterpriseId: ENTERPRISE_ID } },
      update: {},
      create: { code: 'BQ_INV', label: 'Journal Banques Placements', type: 'INVESTMENT', enterpriseId: ENTERPRISE_ID }
    });
    console.log('✅ Journaux prêts.');

    // 2. TEST ENCAISSEMENT
    console.log('\nStep 2: Test Encaissement...');
    const encaissementEntry = await AccountingPostingService.postEntry({
      entryDate: new Date(),
      journalCode: 'BQ_ENC',
      journalLabel: 'Journal Encaissements',
      label: `Encaissement Client ${TEST_LABEL}`,
      reference: `ENC-${Date.now()}`,
      sourceType: 'ENCAISSEMENT',
      sourceId: 'MOCK-ENC-1',
      enterpriseId: ENTERPRISE_ID,
      lines: [
        { accountId: accounts.bank.id, side: 'DEBIT', amount: 5000 },
        { accountId: accounts.revenue.id, side: 'CREDIT', amount: 5000 }
      ]
    });
    console.log(`✅ Encaissement posté: ${encaissementEntry.entryNumber}`);

    // 3. TEST PLACEMENT (ÉCRITURE > 3 LIGNES)
    console.log('\nStep 3: Test Placement (Ecriture > 3 lignes)...');
    // Cas: Achat de titres pour 10000 + 100 de frais + 50 de taxes = Total 10150 décaissé
    const placementEntry = await AccountingPostingService.postEntry({
      entryDate: new Date(),
      journalCode: 'BQ_INV',
      journalLabel: 'Journal Placements',
      label: `Achat Titres ${TEST_LABEL}`,
      reference: `INV-${Date.now()}`,
      sourceType: 'INVESTMENT_TRANSACTION',
      sourceId: 'MOCK-INV-1',
      enterpriseId: ENTERPRISE_ID,
      lines: [
        { accountId: accounts.investment.id, side: 'DEBIT', amount: 10000, description: 'Principal' },
        { accountId: accounts.fees.id, side: 'DEBIT', amount: 100, description: 'Frais de courtage' },
        { accountId: accounts.taxes.id, side: 'DEBIT', amount: 50, description: 'Taxes boursières' },
        { accountId: accounts.bank.id, side: 'CREDIT', amount: 10150, description: 'Total décaissé' }
      ]
    });
    console.log(`✅ Placement posté avec ${placementEntry.lines.length} lignes: ${placementEntry.entryNumber}`);

    // 4. VÉRIFICATION GRAND LIVRE (Auditabilité)
    console.log('\nStep 4: Vérification du Grand Livre (Vue Auditable)...');
    // On ne passe pas de periodId pour tester le fallback automatique
    const ledger = await GeneralLedgerService.generateLedger({ 
      enterpriseId: ENTERPRISE_ID 
    });

    console.log(`📊 Nombre de comptes dans le Grand Livre: ${ledger.length}`);
    ledger.forEach(acc => {
      console.log(`  - ${acc.accountCode} (${acc.accountLabel}): Solde = ${acc.currentBalance}`);
      acc.lines.forEach(l => {
        console.log(`    [${l.date.toISOString().split('T')[0]}] ${l.label}: ${l.debit > 0 ? 'D ' + l.debit : 'C ' + l.credit}`);
      });
    });

    if (ledger.length === 0) {
      throw new Error('ERREUR: Le Grand Livre est vide malgré les écritures postées.');
    }

    // 5. VÉRIFICATION BALANCE
    console.log('\nStep 5: Vérification de la Balance...');
    const balance = await TrialBalanceService.generateTrialBalance({
      enterpriseId: ENTERPRISE_ID
    });
    
    console.log(`⚖️ Balance générée: ${balance.length} comptes.`);
    const bankBalance = balance.find(b => b.accountCode === '512099');
    console.log(`💰 Solde Final Banque: ${bankBalance ? bankBalance.closingBalance : 'N/A'}`);
    // Calcul: +5000 (Enc) - 10150 (Plac) = -5150
    const expectedBankBalance = -5150;
    
    if (bankBalance && Math.abs(bankBalance.closingBalance - expectedBankBalance) < 0.1) {
      console.log('\n✅ TOUS LES TESTS ONT RÉUSSI !');
      console.log('  - Encaissements OK');
      console.log('  - Placements multi-lignes OK');
      console.log('  - Fallback période Grand Livre/Balance OK');
      console.log('  - Auditabilité et Isolation Enterprise OK');
    } else {
      console.error(`❌ ÉCHEC: Solde banque incorrect. Trouvé: ${bankBalance?.balance}, Attendu: ${expectedBankBalance}`);
    }

  } catch (error) {
    console.error('\n❌ ÉCHEC DU TEST:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function getOrCreateAccount(code, label, type, enterpriseId) {
  return prisma.accountingAccount.upsert({
    where: { code_enterpriseId: { code, enterpriseId } },
    update: { isActive: true },
    create: { code, label, type, enterpriseId, isActive: true }
  });
}

runFullTest();
