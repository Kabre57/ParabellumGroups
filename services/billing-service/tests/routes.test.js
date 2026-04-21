const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (...segments) =>
  fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');

test('billing server exposes public health routes and keeps devis router mounted separately', () => {
  const content = read('server.js');

  assert.match(content, /app\.get\('\/health'/);
  assert.match(content, /app\.get\('\/',/);
  assert.match(content, /app\.use\('\/api\/devis', devisRoutes\)/);
  assert.doesNotMatch(content, /app\.use\(authenticateToken\)/);
  assert.match(content, /app\.use\('\/api\/factures', factureRoutes\)/);
  assert.match(content, /app\.use\('\/api\/cash-vouchers', cashVoucherRoutes\)/);
  assert.match(content, /app\.use\('\/api\/internal\/procurement-events', internalProcurementEventRoutes\)/);
});

test('billing route modules protect authenticated domains and preserve public quote response endpoints', () => {
  const devisContent = read('routes', 'devis.routes.js');

  assert.match(devisContent, /router\.get\('\/respond\/:token'/);
  assert.match(devisContent, /router\.post\('\/respond\/:token'/);
  assert.match(devisContent, /router\.use\(authenticateToken\)/);
  assert.match(devisContent, /router\.post\('\/uploads', upload\.single\('image'\), devisController\.uploadQuoteLineImage\)/);

  [
    'facture.routes.js',
    'paiement.routes.js',
    'avoir.routes.js',
    'budget.routes.js',
    'placement.routes.js',
    'purchaseCommitment.routes.js',
    'cashVoucher.routes.js',
    'encaissement.routes.js',
    'decaissement.routes.js',
    'factureFournisseur.routes.js',
    'accounting.routes.js',
    'account.routes.js',
    'journalEntry.routes.js',
    'treasuryAccount.routes.js',
    'treasuryClosure.routes.js',
  ].forEach((file) => {
    assert.match(read('routes', file), /authenticateToken/);
    assert.match(read('routes', file), /router\.use\(authenticateToken\)/);
  });
});

test('internal procurement events rely on service secret ingestion rather than JWT guards', () => {
  const content = read('routes', 'internalProcurementEvent.routes.js');

  assert.match(content, /ensureInternalEventSecret/);
  assert.match(content, /ingestProcurementEvent/);
  assert.doesNotMatch(content, /authenticateToken/);
});
