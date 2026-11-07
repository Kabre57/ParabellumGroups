const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

function load(relativePath, dependencies) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const localRequire = createRequire(filename);
  const module = { exports: {} };
  new Function('require', 'module', 'exports', fs.readFileSync(filename, 'utf8'))(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : localRequire(name),
    module, module.exports
  );
  return module.exports;
}

const prismaMock = { PrismaClient: class {} };
const journals = load('core/services/AccountingJournalService.js', { '@prisma/client': prismaMock });
const rows = [
  { id: 'cash', enterpriseId: 7, code: 'CA', label: 'Caisse principale', isActive: true },
  { id: 'foreign', enterpriseId: 8, code: 'BQ', isActive: true },
  { id: 'inactive', enterpriseId: 7, code: 'OD', isActive: false },
  { id: 'shared', enterpriseId: null, code: 'AC', isActive: true },
];
const client = {
  accountingJournal: {
    findFirst: async ({ where }) => rows.find((row) => row.id === where.id && where.OR.some((scope) => scope.enterpriseId === row.enterpriseId)) || null,
    create: async () => assert.fail('La saisie manuelle ne doit jamais créer un journal'),
  },
};

test('utilise le journal existant et son libellé configuré', async () => {
  assert.deepEqual(await journals.getExistingJournal(client, { journalId: 'cash', enterpriseId: 7 }), rows[0]);
});
test('accepte un journal partagé configuré', async () => {
  assert.equal((await journals.getExistingJournal(client, { journalId: 'shared', enterpriseId: 7 })).id, 'shared');
});
for (const [journalId, statusCode] of [['', 400], ['missing', 404], ['foreign', 404], ['inactive', 400]]) {
  test(`refuse le journal ${journalId || 'absent'}`, async () => {
    await assert.rejects(journals.getExistingJournal(client, { journalId, enterpriseId: 7 }), { statusCode });
  });
}

test('la comptabilisation manuelle refuse un code libre sans créer de journal', async () => {
  const posting = load('core/services/AccountingPostingService.js', {
    '@prisma/client': prismaMock,
    '../../utils/accounting': {},
    './AccountingJournalService': journals,
    './AccountingPeriodService': {},
  });
  await assert.rejects(posting.postEntry({
    label: 'Test', enterpriseId: 7, journalCode: 'NOUVEAU', requireExistingJournal: true,
    lines: [{ accountId: 'a', side: 'DEBIT', amount: 100 }, { accountId: 'b', side: 'CREDIT', amount: 100 }],
  }, { ...client, $transaction: async (callback) => callback(client) }), { statusCode: 400 });
});

test('le contrôleur impose le journal existant même si le client tente de désactiver le contrôle', async () => {
  let payload;
  const controller = load('controllers/journalEntry.controller.js', {
    '@prisma/client': prismaMock,
    '../utils/accounting': { ensureAccountingEntriesWriteAccess: () => null },
    '../utils/enterpriseScope': {
      resolveEnterpriseContext: async () => ({ enterpriseId: 7 }),
      assertEnterpriseInScope: async () => {},
    },
    '../core/services/AccountingPostingService': { postEntry: async (data) => { payload = data; return {}; } },
  });
  const res = { status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
  await controller.createJournalEntry({ body: {
    label: 'Test', journalId: 'cash', requireExistingJournal: false,
    lines: [{ accountId: 'a', side: 'DEBIT', amount: 100 }, { accountId: 'b', side: 'CREDIT', amount: 100 }],
  }, user: {} }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(payload.journalId, 'cash');
  assert.equal(payload.requireExistingJournal, true);
  assert.equal(payload.enterpriseId, 7);
});
