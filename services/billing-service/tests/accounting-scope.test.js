const test = require('node:test');
const assert = require('node:assert/strict');
const { isAccountAllowedForFamilyScope } = require('../utils/accountingScope');

test('un compte comptable global peut être utilisé par une famille d’entreprise', () => {
  assert.equal(isAccountAllowedForFamilyScope(null, 7), true);
});

test('un compte propre à une entreprise reste dans son périmètre', () => {
  assert.equal(isAccountAllowedForFamilyScope(7, 7), true);
  assert.equal(isAccountAllowedForFamilyScope(8, 7), false);
});

test('un compte d’entreprise ne peut pas être rattaché à une famille globale', () => {
  assert.equal(isAccountAllowedForFamilyScope(7, null), false);
  assert.equal(isAccountAllowedForFamilyScope(null, null), true);
});
