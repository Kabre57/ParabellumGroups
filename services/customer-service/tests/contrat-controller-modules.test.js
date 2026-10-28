const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerDirectory = path.join(__dirname, '../controllers/contrat');
const facadePath = path.join(__dirname, '../controllers/contrat.controller.js');
const expectedHandlers = [
  'create',
  'createAvenant',
  'getAll',
  'getById',
  'getExpiringSoon',
  'getStats',
  'updateStatus',
];

test('la façade contrats conserve les gestionnaires utilisés par les routes', () => {
  const facade = fs.readFileSync(facadePath, 'utf8');
  const moduleNames = [...facade.matchAll(/require\('\.\/contrat\/(.+?)'\)/g)].map((match) => `${match[1]}.js`);
  const declarations = moduleNames.flatMap((moduleName) => {
    const source = fs.readFileSync(path.join(controllerDirectory, moduleName), 'utf8');
    return [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
  });

  assert.deepEqual(declarations.sort(), expectedHandlers);
});

test('les modules contrats restent sous 500 lignes et utilisent des dépendances partagées exportées', () => {
  const shared = fs.readFileSync(path.join(controllerDirectory, 'shared.js'), 'utf8');
  const sharedExports = new Set(
    (shared.match(/module\.exports\s*=\s*\{([^}]+)\}/)?.[1] || '').split(',').map((name) => name.trim()),
  );

  for (const entry of fs.readdirSync(controllerDirectory)) {
    if (!entry.endsWith('.controller.js')) continue;
    const source = fs.readFileSync(path.join(controllerDirectory, entry), 'utf8');
    const imports = source.match(/const\s*\{([^}]+)\}\s*=\s*require\(['"]\.\/shared['"]\)/);
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${entry} doit rester sous 500 lignes`);
    for (const name of (imports?.[1] || '').split(',').map((value) => value.trim()).filter(Boolean)) {
      assert.ok(sharedExports.has(name), `${entry} importe ${name}, absent des exports partagés`);
    }
  }
});
