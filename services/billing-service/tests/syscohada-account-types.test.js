const test = require('node:test');
const assert = require('node:assert/strict');
const { inferSyscohadaAccountType: infer } = require('../utils/syscohadaAccountTypes');

test('SYSCOHADA types cover cash subdivisions, ordinary charges/revenue, assets and durable resources', () => {
  for (const [code, expected] of [
    ['57111', 'ASSET'], ['5211', 'ASSET'], ['552', 'ASSET'], ['2111', 'ASSET'],
    ['31', 'ASSET'], ['6011', 'EXPENSE'], ['707', 'REVENUE'], ['1011', 'EQUITY'],
    ['1621', 'LIABILITY'], ['1962', 'ASSET'],
  ]) assert.equal(infer(code), expected, code);
});

test('third-party debtor/creditor exceptions override their general group', () => {
  for (const [code, expected] of [
    ['4011', 'LIABILITY'], ['4091', 'ASSET'], ['4111', 'ASSET'], ['4191', 'LIABILITY'],
    ['4211', 'ASSET'], ['422', 'LIABILITY'], ['4287', 'ASSET'], ['4387', 'ASSET'],
    ['4441', 'LIABILITY'], ['4449', 'ASSET'], ['4454', 'ASSET'], ['4487', 'ASSET'],
    ['4711', 'ASSET'], ['4712', 'LIABILITY'], ['481', 'LIABILITY'], ['485', 'ASSET'],
  ]) assert.equal(infer(code), expected, code);
});

test('treasury debts and provisions are not confused with assets or reductions in asset value', () => {
  for (const [code, expected] of [
    ['5261', 'LIABILITY'], ['5267', 'ASSET'], ['566', 'LIABILITY'],
    ['491', 'ASSET'], ['4991', 'LIABILITY'], ['592', 'ASSET'], ['5991', 'LIABILITY'],
  ]) assert.equal(infer(code), expected, code);
});

test('class eight distinguishes other expenses and other revenue', () => {
  for (const prefix of ['81', '83', '85', '87', '89']) assert.equal(infer(`${prefix}1`), 'EXPENSE');
  for (const prefix of ['82', '84', '86', '88']) assert.equal(infer(`${prefix}1`), 'REVENUE');
});

test('mixed and unsupported accounts require an explicit configured chart rather than a silent default', () => {
  for (const code of ['18', '184', '186', '109', '42', '428', '438', '44', '444', '449',
    '45', '46', '47', '471', '4746', '48', '49', '54', '526', '536', '58', '585', '59',
    '', '9', '901', '20', '74', '76', '57111abc', '571.11']) {
    assert.equal(infer(code), null, code);
  }
});
