const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (...segments) =>
  fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');

test('customer service server mounts core CRM endpoints', () => {
  const content = read('server.js');

  assert.match(content, /app\.get\('\/health'/);
  assert.match(content, /app\.get\('\/api-docs'/);
  assert.match(content, /app\.use\('\/api\/clients', clientRoutes\)/);
  assert.match(content, /app\.use\('\/api\/contacts', contactRoutes\)/);
  assert.match(content, /app\.use\('\/api\/contrats', contratRoutes\)/);
  assert.match(content, /app\.use\('\/api\/adresses', adresseRoutes\)/);
  assert.match(content, /app\.use\('\/api\/interactions', interactionRoutes\)/);
  assert.match(content, /app\.use\('\/api\/documents', documentRoutes\)/);
  assert.match(content, /app\.use\('\/api\/opportunites', opportuniteRoutes\)/);
  assert.match(content, /app\.use\('\/api\/type-clients', typeClientRoutes\)/);
  assert.match(content, /app\.use\('\/api\/secteurs', secteurRoutes\)/);
});

test('client routes protect client CRUD and business status transitions', () => {
  const content = read('routes', 'client.routes.js');

  assert.match(content, /const isGenericPhone =/);
  assert.match(content, /router\.get\('\/', authMiddleware, queryValidation, clientController\.getAll\)/);
  assert.match(content, /router\.post\('\/', authMiddleware, requireManager, createValidation, clientController\.create\)/);
  assert.match(content, /router\.patch\('\/:id\/status', authMiddleware, statusValidation, clientController\.updateStatus\)/);
  assert.match(content, /router\.patch\('\/:id\/priority', authMiddleware, priorityValidation, clientController\.updatePriority\)/);
  assert.match(content, /router\.delete\('\/:id\/archive', authMiddleware, requireManager, clientController\.archive\)/);
});

test('contract routes expose lifecycle and avenant workflows', () => {
  const content = read('routes', 'contrat.routes.js');

  assert.match(content, /router\.get\('\/stats'/);
  assert.match(content, /router\.get\('\/expiring'/);
  assert.match(content, /router\.patch\('\/:id\/status'/);
  assert.match(content, /router\.post\('\/:id\/avenants'/);
  assert.match(content, /EN_ATTENTE_SIGNATURE/);
  assert.match(content, /EN_RENOUVELLEMENT/);
});
