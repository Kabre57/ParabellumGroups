const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const InvestmentTransactionService = require('../core/services/InvestmentTransactionService');
const InvestmentAccountingService = require('../core/services/InvestmentAccountingService');

async function runTest() {
  console.log("🚀 Démarrage du test fonctionnel : Flux de Placement");

  try {
    // --- ÉTAPE 0 : PRÉ-REQUIS COMPTABLES ---
    console.log("⚙️ Préparation du plan comptable de test...");
    
    // Création du compte de titres (501)
    const accTitres = await prisma.accountingAccount.upsert({
      where: { code: '501000' },
      update: {},
      create: {
        code: '501000',
        label: 'Titres de placement',
        type: 'ASSET',
        isActive: true
      }
    });

    // Création du compte de banque (521)
    const accBanque = await prisma.accountingAccount.upsert({
      where: { code: '521000' },
      update: {},
      create: {
        code: '521000',
        label: 'Banque XOF',
        type: 'ASSET',
        isActive: true
      }
    });

    // Suppression des anciens mappings de test pour éviter les doublons
    await prisma.investmentAccountingMapping.deleteMany({
      where: { 
        assetType: 'BOND',
        transactionType: 'BUY'
      }
    });

    // Création du mapping pour les achats d'obligations (BOND)
    await prisma.investmentAccountingMapping.create({
      data: {
        assetType: 'BOND',
        assetClass: 'FIXED_INCOME',
        transactionType: 'BUY',
        eventType: 'PURCHASE',
        debitAccountId: accTitres.id,
        creditAccountId: accBanque.id,
        isActive: true
      }
    });
    console.log("✅ Plan comptable et mapping prêts.");

    // --- ÉTAPE 1 : CRÉATION PORTEFEUILLE ---
    const portfolio = await prisma.investmentPortfolio.upsert({
      where: { code: 'TEST_PORTFOLIO' },
      update: {},
      create: {
        code: 'TEST_PORTFOLIO',
        label: 'Portefeuille de Test Automatisé',
        baseCurrency: 'XOF',
        status: 'ACTIVE'
      }
    });
    console.log(`✅ Portefeuille prêt : ${portfolio.label}`);

    // --- ÉTAPE 2 : CRÉATION ACTIF ---
    const asset = await prisma.investmentAsset.upsert({
      where: { assetCode: 'BT-2026-XOF' },
      update: {},
      create: {
        assetCode: 'BT-2026-XOF',
        label: 'Bons du Trésor 2026',
        isin: 'SN000123456',
        assetType: 'BOND',
        assetClass: 'FIXED_INCOME',
        currency: 'XOF',
        nominalValue: 10000,
        issueDate: new Date('2026-01-01'),
        maturityDate: new Date('2027-01-01')
      }
    });
    console.log(`✅ Actif créé : ${asset.label}`);

    // --- ÉTAPE 3 : ENREGISTREMENT ACHAT ---
    const transaction = await InvestmentTransactionService.recordTransaction({
      portfolioId: portfolio.id,
      assetId: asset.id,
      transactionType: 'BUY',
      tradeDate: new Date(),
      quantity: 1000,
      unitPrice: 10000,
      fees: 50000,
      currency: 'XOF',
      status: 'PENDING'
    });
    console.log(`✅ Transaction d'achat enregistrée (ID: ${transaction.id})`);

    // --- ÉTAPE 4 : VALIDATION ET POSTAGE ---
    console.log("⏳ Validation de la transaction et génération des écritures...");
    const validatedTx = await InvestmentTransactionService.validateTransaction(transaction.id, 'test-user-id');
    
    // Appel de la méthode correcte : postTransactionAccounting
    const postingResult = await InvestmentAccountingService.postTransactionAccounting(validatedTx.id, {
      enterpriseId: 1,
      enterpriseName: 'Parabellum Groups Test',
      userId: 'test-user-id'
    });
    
    console.log(`✅ Écritures comptables générées : Entry ID ${postingResult.id}`);

    // --- ÉTAPE 5 : VÉRIFICATION ---
    const entry = await prisma.accountingJournalEntry.findUnique({
      where: { id: postingResult.id },
      include: { 
        lines: {
          include: { account: true }
        }
      }
    });

    console.log("\n📊 IMPACT SUR LE JOURNAL DES PLACEMENTS :");
    console.log(`Numéro d'écriture : ${entry.entryNumber}`);
    console.log(`Libellé : ${entry.label}`);
    entry.lines.forEach(line => {
      console.log(`   [${line.account.code}] ${line.account.label.padEnd(25)} | ${line.side.padEnd(6)} : ${line.amount.toLocaleString()} FCFA`);
    });

  } catch (error) {
    console.error("❌ Erreur pendant le test:", error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
