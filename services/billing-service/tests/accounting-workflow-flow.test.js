const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { validateBalancedAccountingLines } = require('../utils/accountingLines');

const postedEntries = [];
let commitmentUpdates = [];
let treasuryUpdates = [];

const postingService = {
  async postEntry(entry) {
    postedEntries.push(entry);
    return { id: `entry-${postedEntries.length}`, ...entry };
  },
};

const accountResolver = {
  getTreasuryFamilyFromPaymentMethod: () => 'TREASURY_BANK',
  getTreasuryJournalMeta: async () => ({ journalCode: 'BQ', journalLabel: 'Journal de banque' }),
  resolveAccountingAccount: async (_tx, family) => {
    const ids = {
      SUPPLIER_PAYABLE: '401',
      PURCHASE_EXPENSE: '607',
      TREASURY_BANK: '512',
    };
    assert.ok(ids[family], `Unexpected accounting family ${family}`);
    return { id: ids[family] };
  },
};

const originalLoad = Module._load;
Module._load = function loadWithAccountingWorkflowFakes(request, parent, isMain) {
  if (request === '@prisma/client') {
    return { PurchaseCommitmentStatus: { LIQUIDE: 'LIQUIDE', PAYE: 'PAYE' } };
  }
  if (request === '../core/services/AccountingPostingService') return postingService;
  if (request === './treasury') {
    return { getTreasuryAccountingAccountId: async () => 'treasury-1' };
  }
  if (request === './accountingAccountResolver') return accountResolver;
  return originalLoad.call(this, request, parent, isMain);
};

const { recordEngagement, recordLiquidation, recordPayment } = require('../utils/accountingWorkflow');
Module._load = originalLoad;

const makeTransaction = () => ({
  purchaseCommitment: {
    update: async (input) => {
      commitmentUpdates.push(input);
      return input;
    },
  },
  treasuryAccount: {
    update: async (input) => {
      treasuryUpdates.push(input);
      return input;
    },
  },
});

const makeCommitment = (amountTTC = 1000) => ({
  id: 'commitment-1',
  sourceId: 'purchase-order-1',
  sourceNumber: 'BC-001',
  supplierName: 'Fournisseur test',
  enterpriseId: 42,
  enterpriseName: 'Entreprise test',
  amountTTC,
  createdAt: new Date('2026-01-10T00:00:00.000Z'),
});

const totalFor = (accountId, side) => postedEntries
  .flatMap((entry) => entry.lines)
  .filter((line) => line.accountId === accountId && line.side === side)
  .reduce((sum, line) => sum + line.amount, 0);

const reset = () => {
  postedEntries.length = 0;
  commitmentUpdates = [];
  treasuryUpdates = [];
};

test('purchase commitment -> invoice -> payment books the invoiced expense once', async () => {
  reset();
  const tx = makeTransaction();
  const commitment = makeCommitment(1000);
  const invoice = { id: 'invoice-1', numeroFacture: 'FF-001', montantTTC: 1100 };
  const payment = {
    id: 'payment-1',
    numeroPiece: 'DEC-001',
    amountTTC: 1100,
    treasuryAccountId: 'treasury-1',
    dateDecaissement: new Date('2026-01-20T00:00:00.000Z'),
  };

  await recordEngagement(tx, { commitment });
  await recordLiquidation(tx, { commitment, invoice });
  await recordPayment(tx, { commitment, decaissement: payment });

  assert.deepEqual(postedEntries.map((entry) => entry.sourceType), [
    'PURCHASE_ORDER',
    'SUPPLIER_INVOICE_REGUL',
    'DECAISSEMENT',
  ]);
  for (const entry of postedEntries) {
    assert.doesNotThrow(() => validateBalancedAccountingLines(entry.lines));
  }
  assert.equal(totalFor('607', 'DEBIT') - totalFor('607', 'CREDIT'), 1100);
  assert.equal(totalFor('401', 'CREDIT'), 1100);
  assert.equal(totalFor('401', 'DEBIT'), 1100);
  assert.equal(totalFor('512', 'CREDIT'), 1100);
  assert.deepEqual(commitmentUpdates.at(-1), {
    where: { id: 'commitment-1' },
    data: { status: 'PAYE' },
  });
  assert.deepEqual(treasuryUpdates.at(-1).data.currentBalance, { decrement: 1100 });
});

test('invoice equal to the commitment does not create a second expense entry', async () => {
  reset();
  const tx = makeTransaction();
  const commitment = makeCommitment(1000);

  await recordEngagement(tx, { commitment });
  await recordLiquidation(tx, {
    commitment,
    invoice: { id: 'invoice-2', numeroFacture: 'FF-002', montantTTC: 1000 },
  });

  assert.equal(postedEntries.length, 1);
  assert.equal(totalFor('607', 'DEBIT'), 1000);
  assert.equal(totalFor('401', 'CREDIT'), 1000);
  assert.deepEqual(commitmentUpdates.at(-1).data, { status: 'LIQUIDE' });
});

test('invoice below commitment reverses only the difference before payment', async () => {
  reset();
  const tx = makeTransaction();
  const commitment = makeCommitment(1000);
  const invoice = { id: 'invoice-3', numeroFacture: 'FF-003', montantTTC: 900 };
  const payment = { id: 'payment-3', numeroPiece: 'DEC-003', amountTTC: 900 };

  await recordEngagement(tx, { commitment });
  await recordLiquidation(tx, { commitment, invoice });
  await recordPayment(tx, { commitment, decaissement: payment });

  assert.equal(totalFor('607', 'DEBIT') - totalFor('607', 'CREDIT'), 900);
  assert.equal(totalFor('401', 'CREDIT'), 1000);
  assert.equal(totalFor('401', 'DEBIT'), 1000);
  assert.equal(totalFor('512', 'CREDIT'), 900);
});
