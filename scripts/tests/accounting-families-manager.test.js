const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const componentPath = path.join(
  __dirname,
  '..',
  '..',
  'frontend',
  'src',
  'components',
  'comptabilite',
  'comptes',
  'AccountingFamiliesManager.tsx'
);
const component = fs.readFileSync(componentPath, 'utf8');

test('accounting families manager uses a native account selector in the modal', () => {
  assert.match(component, /<select\s+[\s\S]*value=\{selectedCompatibleAccount\?\.id \|\| ''\}/);
  assert.match(component, /Aucun compte compatible/);
  assert.match(component, /Compte compatible/);
});

test('accounting families manager can add the only compatible account without manual selection', () => {
  assert.match(component, /compatibleAccounts\.length === 1 \? compatibleAccounts\[0\]\.id : ''/);
  assert.match(component, /Un seul compte compatible trouvé/);
  assert.match(component, /disabled=\{!accountIdToAdd \|\| addRuleMutation\.isPending\}/);
});
