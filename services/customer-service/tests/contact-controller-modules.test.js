const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerDirectory = path.join(__dirname, '../controllers/contact');
const facadePath = path.join(__dirname, '../controllers/contact.controller.js');
const expectedHandlers = ['create', 'delete', 'getAll', 'getById', 'setPrincipal', 'update'];

test('la facade contacts conserve les gestionnaires exposes par les routes', () => {
  const facade = fs.readFileSync(facadePath, 'utf8');
  const modules = [...facade.matchAll(/require\('\.\/contact\/(.+?)'\)/g)].map((match) => `${match[1]}.js`);
  const declarations = modules.flatMap((moduleName) => {
    const source = fs.readFileSync(path.join(controllerDirectory, moduleName), 'utf8');
    return [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
  });

  assert.deepEqual(declarations.sort(), expectedHandlers);
});

test('les modules contacts restent courts et leurs helpers communs sont exportes', () => {
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
      assert.ok(sharedExports.has(name), `${entry} importe ${name}, absent des exports partages`);
    }
  }
});
