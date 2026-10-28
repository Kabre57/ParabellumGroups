const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerPath = path.join(__dirname, '../controllers/opportunite.controller.js');
const routesPath = path.join(__dirname, '../routes/opportunite.routes.js');
const moduleDirectory = path.join(__dirname, '../controllers/opportunite');
const expectedHandlers = [
  'addProduct',
  'close',
  'create',
  'getAll',
  'getById',
  'getPipelineStats',
  'update',
  'updateStage',
];

test('les routes d’opportunité conservent les gestionnaires HTTP existants', () => {
  const controller = fs.readFileSync(controllerPath, 'utf8');
  const routes = fs.readFileSync(routesPath, 'utf8');
  const modules = [...controller.matchAll(/require\('\.\/opportunite\/(.+?)'\)/g)].map((match) => `${match[1]}.js`);
  const declarations = modules.flatMap((moduleName) => {
    const source = fs.readFileSync(path.join(moduleDirectory, moduleName), 'utf8');
    return [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
  });

  assert.deepEqual(declarations.sort(), expectedHandlers);
  for (const handler of expectedHandlers) {
    assert.match(routes, new RegExp(`opportuniteController\\.${handler}\\b`));
  }
});

test('les modules d’opportunité sont courts et utilisent les dépendances communes exportées', () => {
  const sharedSource = fs.readFileSync(path.join(moduleDirectory, 'shared.js'), 'utf8');
  const exportBlock = sharedSource.match(/module\.exports\s*=\s*\{([^}]+)\}/);
  const sharedNames = new Set((exportBlock?.[1] || '').split(',').map((name) => name.trim()));

  for (const entry of fs.readdirSync(moduleDirectory)) {
    if (!entry.endsWith('.controller.js')) continue;
    const source = fs.readFileSync(path.join(moduleDirectory, entry), 'utf8');
    const declarations = [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
    const imports = source.match(/const\s*\{([^}]+)\}\s*=\s*require\(['"]\.\/shared['"]\)/);

    assert.equal(new Set(declarations).size, declarations.length, `${entry} ne doit pas redéfinir de gestionnaire`);
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${entry} doit rester sous 500 lignes`);
    for (const name of (imports?.[1] || '').split(',').map((value) => value.trim()).filter(Boolean)) {
      assert.ok(sharedNames.has(name), `${entry} importe ${name}, absent des exports partagés`);
    }
  }
});
