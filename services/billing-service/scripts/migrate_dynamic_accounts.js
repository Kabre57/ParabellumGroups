const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const dynamicAccountsData = [
  {
    code: '512',
    label: 'Banque',
    type: 'ASSET',
    isDynamic: true,
    formula: {
      balance: 'bankInflows - bankOutflows',
      movementCount: 'bankMovementCount',
      lastTransaction: 'lastBankTransaction'
    }
  },
  {
    code: '531',
    label: 'Caisse',
    type: 'ASSET',
    isDynamic: true,
    formula: {
      balance: 'cashInflows - cashOutflows',
      movementCount: 'cashMovementCount',
      lastTransaction: 'lastCashTransaction'
    }
  },
  {
    code: '411',
    label: 'Clients',
    type: 'ASSET',
    isDynamic: true,
    formula: {
      balance: 'clientReceivables',
      movementCount: 'invoiceCount',
      lastTransaction: 'lastInvoiceDate'
    }
  },
  {
    code: '401',
    label: 'Fournisseurs',
    type: 'LIABILITY',
    isDynamic: true,
    formula: {
      balance: 'supplierLiabilities',
      movementCount: 'decaissementCount + commitmentCount',
      lastTransaction: 'lastDecaissementDate'
    }
  },
  {
    code: '4456',
    label: 'TVA déductible',
    type: 'ASSET',
    isDynamic: true,
    formula: {
      balance: 'totalDeductibleVat',
      movementCount: 'decaissementCount',
      lastTransaction: 'lastDecaissementDate'
    }
  },
  {
    code: '4457',
    label: 'TVA collectée',
    type: 'LIABILITY',
    isDynamic: true,
    formula: {
      balance: 'totalCollectedVat',
      movementCount: 'invoiceCount',
      lastTransaction: 'lastInvoiceDate'
    }
  },
  {
    code: '706',
    label: 'Prestations de services',
    type: 'REVENUE',
    isDynamic: true,
    formula: {
      balance: 'totalRevenue',
      movementCount: 'invoiceCount',
      lastTransaction: 'lastInvoiceDate'
    }
  },
  {
    code: '607',
    label: 'Achats et approvisionnements',
    type: 'EXPENSE',
    isDynamic: true,
    formula: {
      balance: 'purchasesExpense',
      movementCount: 'decaissementCount',
      lastTransaction: 'lastDecaissementDate'
    }
  },
  {
    code: '618',
    label: 'Autres charges d exploitation',
    type: 'EXPENSE',
    isDynamic: true,
    formula: {
      balance: 'otherExpense',
      movementCount: 'decaissementCount',
      lastTransaction: 'lastDecaissementDate'
    }
  },
  {
    code: '101',
    label: 'Capital et résultat',
    type: 'EQUITY',
    isDynamic: true,
    formula: {
      balance: 'netResult',
      movementCount: '1',
      lastTransaction: 'today'
    }
  }
];

async function migrate() {
  console.log('🚀 Starting Dynamic Accounts Migration...');
  
  for (const data of dynamicAccountsData) {
    try {
      await prisma.accountingAccount.upsert({
        where: { code: data.code },
        update: {
          isDynamic: data.isDynamic,
          formula: data.formula,
          type: data.type
        },
        create: {
          code: data.code,
          label: data.label,
          type: data.type,
          isDynamic: data.isDynamic,
          isSystem: true,
          formula: data.formula
        }
      });
      console.log(`✅ Migrated account ${data.code}: ${data.label}`);
    } catch (error) {
      console.error(`❌ Failed to migrate account ${data.code}:`, error.message);
    }
  }
  
  console.log('🏁 Migration finished.');
  await prisma.$disconnect();
}

migrate();
