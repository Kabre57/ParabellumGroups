const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourceRoot = path.join(__dirname, '..', 'src', 'controllers');
const controllerCases = [
  {
    name: 'user',
    facade: 'user.controller.js',
    modules: {
      'queries.controller.js': ['getAllUsers', 'getUserById'],
      'accounts.controller.js': ['createUser', 'updateUser', 'deleteUser'],
      'status.controller.js': ['updateUserStatus'],
    },
  },
  {
    name: 'permission',
    facade: 'permission.controller.js',
    modules: {
      'queries.controller.js': [
        'getAllPermissions',
        'getPermissionModuleRegistry',
        'getPermissionById',
        'getRolePermissions',
      ],
      'permissions.controller.js': ['createPermission', 'updatePermission', 'deletePermission'],
      'roleAssignments.controller.js': ['updateRolePermission', 'deleteRolePermission'],
    },
  },
];

test('les façades utilisateurs et permissions conservent tous les gestionnaires attendus', () => {
  for (const controller of controllerCases) {
    const facade = fs.readFileSync(path.join(sourceRoot, controller.facade), 'utf8');
    const importedModules = [...facade.matchAll(/require\('\.\/(?:user|permission)\/(.+?)'\)/g)]
      .map((match) => `${match[1]}.js`)
      .sort();
    assert.deepEqual(importedModules, Object.keys(controller.modules).sort(), `${controller.name}: modules importés`);

    const exportedNames = Object.entries(controller.modules).flatMap(([filename, expectedNames]) => {
      const source = fs.readFileSync(path.join(sourceRoot, controller.name, filename), 'utf8');
      const exported = source.match(/module\.exports\s*=\s*\{([^}]*)\}/);
      assert.ok(exported, `${filename} doit déclarer ses gestionnaires publics`);
      return exported[1].split(',').map((name) => name.trim()).filter(Boolean);
    });
    const expectedNames = Object.values(controller.modules).flat().sort();
    assert.deepEqual(exportedNames.sort(), expectedNames, `${controller.name}: exports des handlers`);
  }
});

test('les modules utilisateurs et permissions restent sous 500 lignes et utilisent leurs dépendances partagées', () => {
  for (const controller of controllerCases) {
    const directory = path.join(sourceRoot, controller.name);
    const shared = fs.readFileSync(path.join(directory, 'shared.js'), 'utf8');
    const sharedExports = shared.match(/module\.exports\s*=\s*\{([^}]*)\}/);
    assert.ok(sharedExports, `${controller.name}/shared.js doit déclarer ses dépendances publiques`);
    const exportedNames = new Set(sharedExports[1].split(',').map((name) => name.trim()).filter(Boolean));

    for (const entry of fs.readdirSync(directory)) {
      if (!entry.endsWith('.js')) continue;
      const source = fs.readFileSync(path.join(directory, entry), 'utf8');
      assert.ok(source.split(/\r?\n/).length - 1 < 500, `${controller.name}/${entry} doit rester sous 500 lignes`);
      if (entry === 'shared.js') continue;

      const imported = source.match(/const\s*\{([^}]*)\}\s*=\s*require\('\.\/shared'\)/);
      assert.ok(imported, `${controller.name}/${entry} doit utiliser shared.js`);
      for (const name of imported[1].split(',').map((item) => item.trim()).filter(Boolean)) {
        assert.ok(exportedNames.has(name), `${controller.name}/${entry} importe ${name}, absent des exports partagés`);
      }
    }
  }
});
