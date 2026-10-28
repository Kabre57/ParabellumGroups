const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const controllerDirectory = path.join(__dirname, '../controllers/intervention');
const facadePath = path.join(__dirname, '../controllers/intervention.controller.js');
const missionDirectory = path.join(__dirname, '../controllers/mission');
const missionFacadePath = path.join(__dirname, '../controllers/mission.controller.js');

const expectedHandlers = [
  'addMateriel',
  'addTechnicien',
  'complete',
  'create',
  'delete',
  'getAll',
  'getById',
  'update',
];

test('le contrôleur conserve tous les gestionnaires utilisés par les routes', () => {
  const facade = fs.readFileSync(facadePath, 'utf8');
  const modules = [...facade.matchAll(/require\('\.\/intervention\/(.+?)'\)/g)].map((match) => `${match[1]}.js`);
  const declarations = modules.flatMap((moduleName) => {
    const source = fs.readFileSync(path.join(controllerDirectory, moduleName), 'utf8');
    return [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
  });

  assert.deepEqual(declarations.sort(), expectedHandlers);
});

test('chaque gestionnaire est défini une seule fois dans son module', () => {
  const modulePaths = [
    '../controllers/intervention/queries.controller.js',
    '../controllers/intervention/lifecycle.controller.js',
    '../controllers/intervention/resources.controller.js',
  ];

  for (const modulePath of modulePaths) {
    const source = fs.readFileSync(path.join(__dirname, modulePath), 'utf8');
    const declarations = [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
    assert.equal(new Set(declarations).size, declarations.length, `${modulePath} ne doit pas redéfinir un gestionnaire`);
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${modulePath} doit rester sous 500 lignes`);
  }
});

test('les contrôleurs techniques n’importent que des règles partagées exportées', () => {
  const sharedPath = path.join(controllerDirectory, 'shared.js');
  const sharedSource = fs.readFileSync(sharedPath, 'utf8');
  const exportBlock = sharedSource.match(/module\.exports\s*=\s*\{([^}]+)\}/);
  const sharedNames = new Set((exportBlock?.[1] || '').split(',').map((name) => name.trim()));

  for (const moduleName of ['queries.controller.js', 'lifecycle.controller.js', 'resources.controller.js']) {
    const source = fs.readFileSync(path.join(controllerDirectory, moduleName), 'utf8');
    const sharedImports = source.match(/const\s*\{([^}]+)\}\s*=\s*require\(['"]\.\/shared['"]\)/);
    for (const name of (sharedImports?.[1] || '').split(',').map((value) => value.trim()).filter(Boolean)) {
      assert.ok(sharedNames.has(name), `${moduleName} importe ${name}, absent des exports partagés`);
    }
  }
});

test('la façade mission conserve les gestionnaires attendus par les routes', () => {
  const facade = fs.readFileSync(missionFacadePath, 'utf8');
  const modules = [...facade.matchAll(/require\('\.\/mission\/(.+?)'\)/g)].map((match) => `${match[1]}.js`);
  const declarations = modules.flatMap((moduleName) => {
    const source = fs.readFileSync(path.join(missionDirectory, moduleName), 'utf8');
    return [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
  });

  assert.deepEqual(declarations.sort(), [
    'assignTechnicien',
    'create',
    'delete',
    'getAll',
    'getById',
    'getPdf',
    'getStats',
    'resyncFromCrm',
    'resyncFromCrmByClient',
    'update',
    'updateStatus',
  ]);
});

test('les modules mission restent courts et utilisent les outils communs exportés', () => {
  const sharedSource = fs.readFileSync(path.join(missionDirectory, 'shared.js'), 'utf8');
  const exportBlock = sharedSource.match(/module\.exports\s*=\s*\{([^}]+)\}/);
  const sharedNames = new Set((exportBlock?.[1] || '').split(',').map((name) => name.trim()));

  for (const entry of fs.readdirSync(missionDirectory)) {
    if (!entry.endsWith('.controller.js')) continue;
    const source = fs.readFileSync(path.join(missionDirectory, entry), 'utf8');
    const imports = source.match(/const\s*\{([^}]+)\}\s*=\s*require\(['"]\.\/shared['"]\)/);
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${entry} doit rester sous 500 lignes`);
    for (const name of (imports?.[1] || '').split(',').map((value) => value.trim()).filter(Boolean)) {
      assert.ok(sharedNames.has(name), `${entry} importe ${name}, absent des exports partagés`);
    }
  }
});
