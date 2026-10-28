const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerDirectory = path.join(__dirname, '../controllers/materiel');
const facadePath = path.join(__dirname, '../controllers/materiel.controller.js');
const expectedHandlers = [
  'create',
  'createSortie',
  'delete',
  'getAlertes',
  'getAll',
  'getById',
  'getSortiesEnCours',
  'importMateriels',
  'retourSortie',
  'update',
];

test('la façade matériel conserve les gestionnaires montés par les routes', () => {
  const facade = fs.readFileSync(facadePath, 'utf8');
  const moduleNames = [...facade.matchAll(/require\('\.\/materiel\/(.+?)'\)/g)].map((match) => `${match[1]}.js`);
  const declarations = moduleNames.flatMap((moduleName) => {
    const source = fs.readFileSync(path.join(controllerDirectory, moduleName), 'utf8');
    return [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
  });

  assert.deepEqual(declarations.sort(), expectedHandlers);
});

test('les domaines du matériel restent courts et leurs imports communs sont exportés', () => {
  const sharedPath = path.join(controllerDirectory, 'shared.js');
  const shared = fs.readFileSync(sharedPath, 'utf8');
  const exports = new Set((shared.match(/module\.exports\s*=\s*\{([^}]+)\}/)?.[1] || '').split(',').map((name) => name.trim()));

  for (const entry of fs.readdirSync(controllerDirectory)) {
    if (!entry.endsWith('.controller.js')) continue;
    const source = fs.readFileSync(path.join(controllerDirectory, entry), 'utf8');
    const imports = source.match(/const\s*\{([^}]+)\}\s*=\s*require\(['"]\.\/shared['"]\)/);
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${entry} doit rester sous 500 lignes`);
    for (const name of (imports?.[1] || '').split(',').map((value) => value.trim()).filter(Boolean)) {
      assert.ok(exports.has(name), `${entry} importe ${name}, absent des exports partagés`);
    }
  }
});
