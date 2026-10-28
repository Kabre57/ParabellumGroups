const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerDirectory = path.join(__dirname, '..', 'src', 'controllers', 'auth');
const controllerCases = [
  ['register.controller.js', ['register']],
  ['login.controller.js', ['login']],
  ['refreshToken.controller.js', ['refreshToken']],
  ['logout.controller.js', ['logout']],
  ['forgotPassword.controller.js', ['forgotPassword']],
  ['profile.controller.js', ['getCurrentUser', 'updateProfile']],
  ['revokeAllTokens.controller.js', ['revokeAllTokens']],
];

test('la façade auth conserve tous les gestionnaires consommés par les routes', () => {
  const facade = fs.readFileSync(path.join(__dirname, '..', 'src', 'controllers', 'auth.controller.js'), 'utf8');
  const importedModules = [...facade.matchAll(/require\('\.\/auth\/(.+?)'\)/g)].map((match) => `${match[1]}.js`);
  const exports = controllerCases.flatMap(([filename]) => {
    const source = fs.readFileSync(path.join(controllerDirectory, filename), 'utf8');
    const exported = source.match(/module\.exports\s*=\s*\{([^}]*)\}/);
    assert.ok(exported, `${filename} doit déclarer ses gestionnaires publics`);
    return exported[1].split(',').map((name) => name.trim()).filter(Boolean);
  });

  assert.deepEqual(importedModules.sort(), controllerCases.map(([filename]) => filename).sort());
  assert.deepEqual(exports.sort(), [
    'forgotPassword',
    'getCurrentUser',
    'login',
    'logout',
    'refreshToken',
    'register',
    'revokeAllTokens',
    'updateProfile',
  ]);
});

test('les modules auth restent sous 500 lignes et importent des dépendances partagées exportées', () => {
  const shared = fs.readFileSync(path.join(controllerDirectory, 'shared.js'), 'utf8');
  const sharedExports = shared.match(/module\.exports\s*=\s*\{([^}]*)\}/);
  assert.ok(sharedExports, 'shared.js doit déclarer ses dépendances publiques');
  const exportedNames = new Set(sharedExports[1].split(',').map((name) => name.trim()).filter(Boolean));

  for (const entry of fs.readdirSync(controllerDirectory)) {
    if (!entry.endsWith('.js')) continue;
    const source = fs.readFileSync(path.join(controllerDirectory, entry), 'utf8');
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${entry} doit rester sous 500 lignes`);
    if (entry === 'shared.js') continue;

    const imported = source.match(/const\s*\{([^}]*)\}\s*=\s*require\('\.\/shared'\)/);
    assert.ok(imported, `${entry} doit utiliser shared.js`);
    for (const name of imported[1].split(',').map((item) => item.trim()).filter(Boolean)) {
      assert.ok(exportedNames.has(name), `${entry} importe ${name}, absent des exports partagés`);
    }
  }
});
