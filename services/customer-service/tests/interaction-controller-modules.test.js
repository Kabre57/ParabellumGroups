const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerDirectory = path.join(__dirname, '../controllers/interaction');
const facadePath = path.join(__dirname, '../controllers/interaction.controller.js');
const expectedHandlers = ['create', 'delete', 'getAll', 'getById', 'getStats', 'linkToTask', 'update'];

test('la facade interactions conserve les gestionnaires attendus par les routes', () => {
  const facade = fs.readFileSync(facadePath, 'utf8');
  const modules = [...facade.matchAll(/require\('\.\/interaction\/(.+?)'\)/g)].map((match) => `${match[1]}.js`);
  const declarations = modules.flatMap((moduleName) => {
    const source = fs.readFileSync(path.join(controllerDirectory, moduleName), 'utf8');
    return [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
  });

  assert.deepEqual(declarations.sort(), expectedHandlers);
});

test('les modules interactions restent courts et utilisent les dependances partagees exportees', () => {
  const shared = fs.readFileSync(path.join(controllerDirectory, 'shared.js'), 'utf8');
  const sharedExports = new Set(
    (shared.match(/module\.exports\s*=\s*\{([^}]+)\}/)?.[1] || '').split(',').map((name) => name.trim()),
  );

  for (const entry of fs.readdirSync(controllerDirectory)) {
    if (!entry.endsWith('.controller.js')) continue;
    const source = fs.readFileSync(path.join(controllerDirectory, entry), 'utf8');
    const imports = source.match(/const\s*\{([^}]+)\}\s*=\s*require\(['"]\.\/shared['"]\)/);
    const handlers = [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
    assert.equal(new Set(handlers).size, handlers.length, `${entry} ne doit pas redéfinir un gestionnaire`);
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${entry} doit rester sous 500 lignes`);
    for (const name of (imports?.[1] || '').split(',').map((value) => value.trim()).filter(Boolean)) {
      assert.ok(sharedExports.has(name), `${entry} importe ${name}, absent des exports partagés`);
    }
  }
});
