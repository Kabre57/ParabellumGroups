const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');

// Reconstruction de l'URL locale si DATABASE_URL est absente
if (!process.env.DATABASE_URL) {
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = 'parabellum_billing';
  process.env.DATABASE_URL = `postgresql://${dbUser}:${dbPassword}@localhost:15432/${dbName}?schema=public`;
  console.log('ℹ️ Using constructed local DATABASE_URL...');
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding accounting mappings...');

  // 1. Définition des comptes comptables standards (SYCOHADA)
  const accounts = [
    { code: '607', label: 'Achats de biens et services', type: 'EXPENSE' },
    { code: '625', label: 'Déplacements et missions', type: 'EXPENSE' },
    { code: '615', label: 'Entretien et maintenance', type: 'EXPENSE' },
    { code: '618', label: 'Autres charges d exploitation', type: 'EXPENSE' },
    { code: '411', label: 'Clients', type: 'ASSET' },
    { code: '401', label: 'Fournisseurs', type: 'LIABILITY' },
    { code: '706', label: 'Prestations de services', type: 'REVENUE' }
  ];

  const dbAccounts = {};

  for (const acc of accounts) {
    const upserted = await prisma.accountingAccount.upsert({
      where: { code: acc.code },
      update: { label: acc.label, type: acc.type },
      create: { 
        code: acc.code, 
        label: acc.label, 
        type: acc.type,
        isSystem: true 
      }
    });
    dbAccounts[acc.code] = upserted.id;
    console.log(`✅ Account ${acc.code} checked/created.`);
  }

  // 2. Définition des mappings (remplace la logique en dur précédente)
  const mappings = [
    { sourceType: 'CASH_VOUCHER', categoryKey: 'transport', accountCode: '625' },
    { sourceType: 'CASH_VOUCHER', categoryKey: 'mission', accountCode: '625' },
    { sourceType: 'CASH_VOUCHER', categoryKey: 'achat', accountCode: '607' },
    { sourceType: 'CASH_VOUCHER', categoryKey: 'maintenance', accountCode: '615' },
    { sourceType: 'CASH_VOUCHER', categoryKey: 'technique', accountCode: '615' },
    { sourceType: 'PURCHASE_ORDER', categoryKey: '*', accountCode: '607' },
    { sourceType: 'PURCHASE_QUOTE', categoryKey: '*', accountCode: '607' },
    { sourceType: 'INVOICE', categoryKey: 'REVENUE', accountCode: '706' },
    { sourceType: 'INVOICE', categoryKey: 'DEBIT_CUSTOMER', accountCode: '411' },
    { sourceType: 'PAYMENT', categoryKey: 'CREDIT_CUSTOMER', accountCode: '411' },
    { sourceType: 'DECAISSEMENT', categoryKey: 'CREDIT_SUPPLIER', accountCode: '401' },
    { sourceType: 'DECAISSEMENT', categoryKey: 'DEBIT_SUPPLIER', accountCode: '401' }
  ];

  for (const map of mappings) {
    const accountId = dbAccounts[map.accountCode];
    if (!accountId) continue;

    await prisma.accountingMapping.upsert({
      where: {
        // Comme nous n'avons pas d'index unique sur sourceType + categoryKey dans schema, 
        // on fait une recherche manuelle pour éviter les doublons
        id: (await prisma.accountingMapping.findFirst({
               where: { sourceType: map.sourceType, categoryKey: map.categoryKey }
            }))?.id || 'new-uuid-placeholder'
      },
      update: { accountId },
      create: {
        sourceType: map.sourceType,
        categoryKey: map.categoryKey,
        accountId
      }
    });
    console.log(`🔗 Mapping created: ${map.sourceType} [${map.categoryKey}] -> ${map.accountCode}`);
  }

  console.log('✨ Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
