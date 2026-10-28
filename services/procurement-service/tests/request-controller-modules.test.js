const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerDirectory = path.join(__dirname, '../controllers/demandeAchat/requests');
const facadePath = path.join(__dirname, '../controllers/demandeAchat/requests.controller.js');
const sharedPath = path.join(__dirname, '../controllers/demandeAchat/shared.js');
const expectedHandlers = [
  'approve',
  'create',
  'delete',
  'getAll',
  'getApprovalHistory',
  'getById',
  'getStats',
  'reject',
  'submit',
  'update',
];

test('la facade demandes d’achat conserve les gestionnaires des routes', () => {
  const facade = fs.readFileSync(facadePath, 'utf8');
  const modules = [...facade.matchAll(/require\('\.\/requests\/(.+?)'\)/g)].map((match) => `${match[1]}.js`);
  const declarations = modules.flatMap((moduleName) => {
    const source = fs.readFileSync(path.join(controllerDirectory, moduleName), 'utf8');
    return [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
  });

  assert.deepEqual(declarations.sort(), expectedHandlers);
});

test('les modules demandes restent courts et importent les fonctions partagees exportees', () => {
  const shared = fs.readFileSync(sharedPath, 'utf8');
  const sharedExports = new Set(
    (shared.match(/module\.exports\s*=\s*\{([^}]+)\}/)?.[1] || '')
      .split(',')
      .map((name) => name.trim().split(':')[0].trim()),
  );

  for (const entry of fs.readdirSync(controllerDirectory)) {
    if (!entry.endsWith('.controller.js')) continue;
    const source = fs.readFileSync(path.join(controllerDirectory, entry), 'utf8');
    const imports = source.match(/const\s*\{\s*\r?\n([\s\S]*?)\r?\n\s*\}\s*=\s*require\(['"]\.\.\/shared['"]\)/);
    const handlers = [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
    assert.equal(new Set(handlers).size, handlers.length, `${entry} ne doit pas redéfinir un gestionnaire`);
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${entry} doit rester sous 500 lignes`);
    for (const name of (imports?.[1] || '').split(',').map((value) => value.trim()).filter(Boolean)) {
      assert.ok(sharedExports.has(name), `${entry} importe ${name}, absent des exports partagés`);
    }
  }
});
