const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const controllerDirectory = path.join(__dirname, '../controllers/prospect');
const facadePath = path.join(__dirname, '../controllers/prospect.controller.js');

const expectedHandlers = [
  'addActivity',
  'addCompetitor',
  'addNote',
  'assignToSequence',
  'convert',
  'create',
  'createCampaign',
  'createTemplate',
  'createTerrainVisit',
  'delete',
  'getActivities',
  'getAll',
  'getCampaigns',
  'getCompetitors',
  'getDocuments',
  'getHistory',
  'getNotes',
  'getSequences',
  'getStats',
  'getTargets',
  'getTemplates',
  'getTerrainVisits',
  'getById',
  'moveStage',
  'update',
  'updateActivity',
  'updateTarget',
  'updateTerrainVisit',
  'uploadDocument',
];

test('la façade CRM conserve les gestionnaires existants des routes', () => {
  const facade = fs.readFileSync(facadePath, 'utf8');
  const modules = [...facade.matchAll(/require\('\.\/prospect\/(.+?)'\)/g)].map((match) => `${match[1]}.js`);
  const declarations = modules.flatMap((moduleName) => {
    const source = fs.readFileSync(path.join(controllerDirectory, moduleName), 'utf8');
    return [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
  });

  assert.deepEqual(declarations.sort(), expectedHandlers.sort());
});

test('les modules CRM ne redéfinissent pas un gestionnaire', () => {
  const modulePaths = [
    '../controllers/prospect/prospects.controller.js',
    '../controllers/prospect/activities.controller.js',
    '../controllers/prospect/campaigns.controller.js',
    '../controllers/prospect/related.controller.js',
  ];

  for (const modulePath of modulePaths) {
    const source = fs.readFileSync(path.join(__dirname, modulePath), 'utf8');
    const declarations = [...source.matchAll(/^exports\.(\w+)\s*=/gm)].map((match) => match[1]);
    assert.equal(new Set(declarations).size, declarations.length, `${modulePath} ne doit pas redéfinir un gestionnaire`);
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${modulePath} doit rester sous 500 lignes`);
  }
});

test('les contrôleurs CRM n’importent que des fonctions partagées exportées', () => {
  const sharedSource = fs.readFileSync(path.join(controllerDirectory, 'shared.js'), 'utf8');
  const exportBlock = sharedSource.match(/module\.exports\s*=\s*\{([^}]+)\}/);
  const sharedNames = new Set((exportBlock?.[1] || '').split(',').map((name) => name.trim()));

  for (const moduleName of ['prospects.controller.js', 'activities.controller.js', 'campaigns.controller.js', 'related.controller.js']) {
    const source = fs.readFileSync(path.join(controllerDirectory, moduleName), 'utf8');
    const sharedImports = source.match(/const\s*\{([^}]+)\}\s*=\s*require\(['"]\.\/shared['"]\)/);
    for (const name of (sharedImports?.[1] || '').split(',').map((value) => value.trim()).filter(Boolean)) {
      assert.ok(sharedNames.has(name), `${moduleName} importe ${name}, absent des exports partagés`);
    }
  }
});
