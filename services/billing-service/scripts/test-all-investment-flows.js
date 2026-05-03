const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const InvestmentTransactionService = require('../core/services/InvestmentTransactionService');
const InvestmentAccountingService = require('../core/services/InvestmentAccountingService');

async function runTest() {
  console.log("🚀 Démarrage du test complet de tous les flux de placement\n");

  try {
    // --- ÉTAPE 0 : PRÉ-REQUIS ---
    const accTitres = await prisma.accountingAccount.upsert({ where: { code: '501000' }, update: {}, create: { code: '501000', label: 'Titres de placement', type: 'ASSET' } });
    const accBanque = await prisma.accountingAccount.upsert({ where: { code: '521000' }, update: {}, create: { code: '521000', label: 'Banque XOF', type: 'ASSET' } });
    const accProduits = await prisma.accountingAccount.upsert({ where: { code: '771000' }, update: {}, create: { code: '771000', label: 'Produits financiers', type: 'REVENUE' } });
    const accCharges = await prisma.accountingAccount.upsert({ where: { code: '671000' }, update: {}, create: { code: '671000', label: 'Charges financières', type: 'EXPENSE' } });

    // Nettoyage des mappings de test
    await prisma.investmentAccountingMapping.deleteMany({ where: { assetType: 'BOND' } });

    // Création des mappings
    const mappings = [
      { type: 'BUY', debit: accTitres.id, credit: accBanque.id },
      { type: 'SELL', debit: accTitres.id, credit: accBanque.id, income: accProduits.id, expense: accCharges.id },
      { type: 'COUPON', credit: accBanque.id, income: accProduits.id }
    ];

    for (const m of mappings) {
      await prisma.investmentAccountingMapping.create({
        data: {
          assetType: 'BOND', assetClass: 'FIXED_INCOME', transactionType: m.type, eventType: 'TEST',
          debitAccountId: m.debit, creditAccountId: m.credit, incomeAccountId: m.income, expenseAccountId: m.expense,
          isActive: true
        }
      });
    }

    const portfolio = await prisma.investmentPortfolio.upsert({ where: { code: 'FULL_TEST' }, update: {}, create: { code: 'FULL_TEST', label: 'Portefeuille Test Global', baseCurrency: 'XOF' } });
    const asset = await prisma.investmentAsset.upsert({ where: { assetCode: 'OBLIG-2026' }, update: {}, create: { assetCode: 'OBLIG-2026', label: 'Obligation État 6%', assetType: 'BOND', assetClass: 'FIXED_INCOME' } });

    // --- FLUX 1 : ACHAT INITIAL ---
    console.log("🔹 [FLUX 1] : Achat de 100 titres à 10 000 FCFA");
    const buyTx = await InvestmentTransactionService.recordTransaction({
      portfolioId: portfolio.id, assetId: asset.id, transactionType: 'BUY', tradeDate: new Date(),
      quantity: 100, unitPrice: 10000, fees: 10000
    });
    const validatedBuy = await InvestmentTransactionService.validateTransaction(buyTx.id, 'admin');
    const buyEntry = await InvestmentAccountingService.postTransactionAccounting(validatedBuy.id, { enterpriseId: 1 });
    printEntry(buyEntry, "ACHAT");

    // --- FLUX 2 : RÉCEPTION DE COUPON ---
    console.log("\n🔹 [FLUX 2] : Réception de coupons (Intérêts)");
    const couponTx = await InvestmentTransactionService.recordTransaction({
      portfolioId: portfolio.id, assetId: asset.id, transactionType: 'COUPON', tradeDate: new Date(),
      quantity: 0, unitPrice: 0, netAmount: 60000 // 6% de 1M
    });
    const validatedCoupon = await InvestmentTransactionService.validateTransaction(couponTx.id, 'admin');
    const couponEntry = await InvestmentAccountingService.postTransactionAccounting(validatedCoupon.id, { enterpriseId: 1 });
    printEntry(couponEntry, "COUPON");

    // --- FLUX 3 : VENTE AVEC PLUS-VALUE ---
    console.log("\n🔹 [FLUX 3] : Vente de 50 titres à 12 000 FCFA (Profit)");
    const sellTx = await InvestmentTransactionService.recordTransaction({
      portfolioId: portfolio.id, assetId: asset.id, transactionType: 'SELL', tradeDate: new Date(),
      quantity: 50, unitPrice: 12000, fees: 5000
    });
    const validatedSell = await InvestmentTransactionService.validateTransaction(sellTx.id, 'admin');
    const sellEntry = await InvestmentAccountingService.postTransactionAccounting(validatedSell.id, { enterpriseId: 1 });
    printEntry(sellEntry, "VENTE (GAIN)");

    // --- FLUX 4 : VENTE AVEC MOINS-VALUE ---
    console.log("\n🔹 [FLUX 4] : Vente de 50 titres à 8 000 FCFA (Perte)");
    const lossTx = await InvestmentTransactionService.recordTransaction({
      portfolioId: portfolio.id, assetId: asset.id, transactionType: 'SELL', tradeDate: new Date(),
      quantity: 50, unitPrice: 8000, fees: 5000
    });
    const validatedLoss = await InvestmentTransactionService.validateTransaction(lossTx.id, 'admin');
    const lossEntry = await InvestmentAccountingService.postTransactionAccounting(validatedLoss.id, { enterpriseId: 1 });
    printEntry(lossEntry, "VENTE (PERTE)");

  } catch (error) {
    console.error("❌ Erreur:", error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

async function printEntry(entry, title) {
  const fullEntry = await prisma.accountingJournalEntry.findUnique({
    where: { id: entry.id },
    include: { lines: { include: { account: true } } }
  });
  console.log(`   📝 Journal Entry [${title}]: ${fullEntry.entryNumber}`);
  fullEntry.lines.forEach(l => {
    console.log(`      [${l.account.code}] ${l.account.label.padEnd(25)} | ${l.side.padEnd(6)} : ${l.amount.toLocaleString()} FCFA`);
  });
}

runTest();
