const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const directory = path.resolve('frontend/app/(dashboard)/dashboard/crm/clients/[id]');
const modules = [
  'page.tsx',
  'use-customer-detail.ts',
  'customer-detail-content.tsx',
  'customer-detail-dialogs.tsx',
  'customer-detail.utils.ts',
];

test('la fiche client sépare l’état, le rendu et les formulaires sans changer sa route', () => {
  const sources = Object.fromEntries(
    modules.map((filename) => [filename, fs.readFileSync(path.join(directory, filename), 'utf8')]),
  );

  assert.match(sources['page.tsx'], /export default function CustomerDetailPage/);
  assert.match(sources['page.tsx'], /useCustomerDetail\(\)/);
  assert.match(sources['page.tsx'], /CustomerDetailContent/);
  assert.match(sources['customer-detail-content.tsx'], /CustomerDetailDialogs/);

  for (const [filename, source] of Object.entries(sources)) {
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${filename} doit rester sous 500 lignes`);
    if (filename !== 'page.tsx') assert.ok(source.startsWith('/**'), `${filename} doit être documenté en français`);
  }
});
