const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerDirectory = path.join(__dirname, '../controllers/client');
const facadePath = path.join(__dirname, '../controllers/client.controller.js');
const expectedHandlers = [
  'archive',
  'create',
  'getAll',
  'getById',
  'getStats',
  'importClients',
  'search',
  'update',
  'updatePriority',
  'updateStatus',
];

test('la façade client conserve les gestionnaires attendus par les routes', () => {
  const facade = fs.readFileSync(facadePath, 'utf8');
  const modules = [...facade.matchAll(/require\('\.\/client\/(.+?)'\)/g)].map((match) => `${match[1]}.js`);
  const declarations = modules.flatMap((moduleName) => {
    const source = fs.readFileSync(path.join(controllerDirectory, moduleName), 'utf8');
    return [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
  });

  assert.deepEqual(declarations.sort(), expectedHandlers);
});

test('les modules client ne redéfinissent pas de gestionnaire et restent sous 500 lignes', () => {
  for (const moduleName of ['queries.controller.js', 'import.controller.js', 'lifecycle.controller.js', 'reporting.controller.js']) {
    const source = fs.readFileSync(path.join(controllerDirectory, moduleName), 'utf8');
    const declarations = [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
    assert.equal(new Set(declarations).size, declarations.length, `${moduleName} ne doit pas redéfinir un gestionnaire`);
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${moduleName} doit rester sous 500 lignes`);
  }
});

test('les contrôleurs client n’importent que des services utilitaires exportés', () => {
  const sharedSource = fs.readFileSync(path.join(controllerDirectory, 'shared.js'), 'utf8');
  const exportBlock = sharedSource.match(/module\.exports\s*=\s*\{([^}]+)\}/);
  const sharedNames = new Set((exportBlock?.[1] || '').split(',').map((name) => name.trim()));

  for (const moduleName of ['queries.controller.js', 'import.controller.js', 'lifecycle.controller.js', 'reporting.controller.js']) {
    const source = fs.readFileSync(path.join(controllerDirectory, moduleName), 'utf8');
    const sharedImports = source.match(/const\s*\{([^}]+)\}\s*=\s*require\(['"]\.\/shared['"]\)/);
    for (const name of (sharedImports?.[1] || '').split(',').map((value) => value.trim()).filter(Boolean)) {
      assert.ok(sharedNames.has(name), `${moduleName} importe ${name}, absent des exports partagés`);
    }
  }
});
