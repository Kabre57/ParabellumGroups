const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { validateBalancedAccountingLines } = require('../utils/accountingLines');

const read = (...segments) =>
  fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');

test('accounting posting validation accepts balanced multi-line entries', () => {
  assert.doesNotThrow(() => {
    validateBalancedAccountingLines([
      { accountId: '607', side: 'DEBIT', amount: 1000 },
      { accountId: '44566', side: 'DEBIT', amount: 200 },
      { accountId: '401', side: 'CREDIT', amount: 1200 },
    ]);
  });
});

test('accounting posting validation rejects unbalanced multi-line entries', () => {
  assert.throws(
    () =>
      validateBalancedAccountingLines([
        { accountId: '607', side: 'DEBIT', amount: 1000 },
        { accountId: '44566', side: 'DEBIT', amount: 200 },
        { accountId: '401', side: 'CREDIT', amount: 1199 },
      ]),
    /équilibrée/
  );
});

test('journal entry serializer exposes lines and total debit/credit amounts', () => {
  const content = read('utils', 'accounting.js');

  assert.match(content, /serializedLines = lines\.map/);
  assert.match(content, /const totalDebit = serializedLines/);
  assert.match(content, /const totalCredit = serializedLines/);
  assert.match(content, /lineCount: serializedLines\.length/);
  assert.match(content, /lines: serializedLines/);
});

test('manual accounting entry API keeps old payload compatibility and accepts lines arrays', () => {
  const content = read('controllers', 'journalEntry.controller.js');

  assert.match(content, /Array\.isArray\(body\.lines\)/);
  assert.match(content, /debitAccountId/);
  assert.match(content, /creditAccountId/);
  assert.match(content, /AccountingPostingService\.postEntry/);
});

test('balance and general ledger reports aggregate journal lines, not only first debit and credit', () => {
  const balanceContent = read('services', 'accountingBalance.service.js');
  const ledgerContent = read('services', 'generalLedger.service.js');

  assert.match(balanceContent, /entry\.lines\.forEach/);
  assert.match(balanceContent, /row\.debit \+= value/);
  assert.match(balanceContent, /row\.credit \+= value/);
  assert.match(ledgerContent, /entry\.lines\.forEach/);
  assert.match(ledgerContent, /totalDebit/);
  assert.match(ledgerContent, /totalCredit/);
});

test('treasury overview keeps validated encaissement and decaissement journal entries visible', () => {
  const content = read('controllers', 'accountingOverview.controller.js');

  assert.match(content, /postedPaymentIds/);
  assert.match(content, /sourceTreasuryAccount/);
  assert.doesNotMatch(content, /\['ENCAISSEMENT', 'DECAISSEMENT', 'PAYMENT'\]\.includes/);
});

test('business posting workflows use AccountingPostingService instead of direct journal entry writes', () => {
  [
    ['controllers', 'encaissement.controller.js'],
    ['controllers', 'decaissement.controller.js'],
    ['utils', 'accountingWorkflow.js'],
  ].forEach((segments) => {
    const content = read(...segments);
    assert.match(content, /AccountingPostingService\.postEntry/);
    assert.doesNotMatch(content, /accountingJournalEntry\.create/);
  });
});

test('manual encaissements and decaissements can post VAT on dedicated accounts', () => {
  const schema = read('prisma', 'schema.prisma');
  const encaissementController = read('controllers', 'encaissement.controller.js');
  const decaissementController = read('controllers', 'decaissement.controller.js');

  assert.match(schema, /vatAccountingAccountId String\?/);
  assert.match(encaissementController, /vatAccountingAccountId/);
  assert.match(encaissementController, /TVA collectee/);
  assert.match(encaissementController, /AccountingAccountType\.LIABILITY/);
  assert.match(decaissementController, /vatAccountingAccountId/);
  assert.match(decaissementController, /TVA deductible/);
  assert.match(decaissementController, /AccountingAccountType\.ASSET/);
});

test('account creation and family rules are scoped by enterprise', () => {
  const accountController = read('controllers', 'account.controller.js');
  const familyRuleController = read('controllers', 'accountingFamilyRule.controller.js');
  const accountResolver = read('utils', 'accountingAccountResolver.js');

  assert.match(accountController, /resolveEnterpriseContext/);
  assert.match(accountController, /code: normalizedCode,[\s\S]*enterpriseId/);
  assert.doesNotMatch(accountController, /findUnique\(\{\s*where: \{ code: normalizedCode \}/);

  assert.match(familyRuleController, /resolveRuleEnterpriseId/);
  assert.match(familyRuleController, /where: \{ family, enterpriseId \}/);
  assert.match(familyRuleController, /enterpriseId,\s*\n\s*createdByUserId/);

  assert.match(accountResolver, /OR:\s*\[\s*\{ enterpriseId: eid \}/);
  assert.match(accountResolver, /account\.enterpriseId !== null/);
});

test('manual journal creation supports global journals and old decaissements without stored account', () => {
  const journalService = read('core', 'services', 'AccountingJournalService.js');
  const decaissementController = read('controllers', 'decaissement.controller.js');

  assert.match(journalService, /accountingJournal\.findFirst/);
  assert.match(journalService, /enterpriseId: eid/);
  assert.doesNotMatch(journalService, /code_enterpriseId/);

  assert.match(decaissementController, /AccountingFamily\.PURCHASE_EXPENSE/);
  assert.match(decaissementController, /resolveAccountingAccount\(tx, AccountingFamily\.PURCHASE_EXPENSE/);
});
