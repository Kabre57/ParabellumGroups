const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const counts = await Promise.all([
      prisma.cashVoucher.count(),
      prisma.decaissement.count(),
      prisma.encaissement.count(),
      prisma.purchaseCommitment.count()
    ]);
    
    console.log('--- Database Counts ---');
    console.log('CashVouchers:', counts[0]);
    console.log('Decaissements:', counts[1]);
    console.log('Encaissements:', counts[2]);
    console.log('Commitments:', counts[3]);
    
    if (counts[1] > 0) {
      const sample = await prisma.decaissement.findFirst();
      console.log('Sample Decaissement Date:', sample.dateDecaissement);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
