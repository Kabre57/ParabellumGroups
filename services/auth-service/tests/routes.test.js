const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  completePermissions,
  getKnownPermissionNames,
  getPermissionModules,
  roleTemplates,
  obsoletePermissionNames,
  systemRoles,
  validatePermissionRegistry,
} = require('../src/permissions');

const read = (...segments) =>
  fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');

test('auth route index mounts the expected top-level routers', () => {
  const content = read('src', 'routes', 'index.js');

  assert.match(content, /router\.get\('\/health'/);
  assert.match(content, /router\.use\('\/auth', authRoutes\)/);
  assert.match(content, /router\.use\('\/users', userRoutes\)/);
  assert.match(content, /router\.use\('\/services', serviceRoutes\)/);
  assert.match(content, /router\.use\('\/permissions', permissionRoutes\)/);
  assert.match(content, /router\.use\('\/roles', roleRoutes\)/);
  assert.match(content, /router\.use\('\/audit-logs', auditLogRoutes\)/);
  assert.match(content, /router\.use\('\/permission-requests', permissionChangeRoutes\)/);
  assert.match(content, /router\.use\('\/storage', storageRoutes\)/);
});

test('auth routes expose the expected public and private flows', () => {
  const content = read('src', 'routes', 'auth.routes.js');

  [
    '/register',
    '/login',
    '/refresh',
    '/forgot-password',
    '/logout',
    '/me',
    '/revoke-all',
  ].forEach((route) => {
    assert.match(content, new RegExp(`['"]${route}['"]`));
  });

  assert.match(content, /registerLimiter/);
  assert.match(content, /loginLimiter/);
  assert.match(content, /refreshLimiter/);
  assert.match(content, /authenticate/);
});

test('permission routes enforce role-based access and bounded validation rules', () => {
  const permissionsContent = read('src', 'routes', 'permission.routes.js');
  const workflowContent = read('src', 'routes', 'permissionChange.routes.js');

  assert.match(permissionsContent, /router\.use\(authenticate\)/);
  assert.match(permissionsContent, /router\.get\('\/categories', checkRole\(\['ADMIN', 'GENERAL_DIRECTOR'\]\), getPermissionCategories\)/);
  assert.match(permissionsContent, /router\.get\('\/modules', checkRole\(\['ADMIN', 'GENERAL_DIRECTOR'\]\), getPermissionModuleRegistry\)/);
  assert.match(permissionsContent, /checkRole\('ADMIN'\)/);
  assert.match(permissionsContent, /withMessage\('Permission name must not exceed 100 characters'\)/);
  assert.match(permissionsContent, /withMessage\('Description must not exceed 500 characters'\)/);
  assert.match(permissionsContent, /router\.put\(\s*'\/roles\/:role\/:permissionId'/);
  assert.match(permissionsContent, /canApprove must be a boolean/);

  assert.match(workflowContent, /router\.use\(authenticate\)/);
  assert.match(workflowContent, /router\.get\('\/', checkRole\(\['ADMIN'\]\), listRequests\)/);
  assert.match(workflowContent, /router\.patch\('\/:id\/approve', checkRole\(\['ADMIN','GENERAL_DIRECTOR'\]\), approveRequest\)/);
  assert.match(workflowContent, /router\.patch\('\/:id\/reject', checkRole\(\['ADMIN','GENERAL_DIRECTOR'\]\), \[body\('reason'\)\.optional\(\)\.isString\(\)\], rejectRequest\)/);
  assert.match(workflowContent, /Valid email required/);
  assert.match(workflowContent, /Message required/);
});

test('permission registry is modular and templates only reference known permissions', () => {
  const summary = validatePermissionRegistry();
  const modules = getPermissionModules();
  const knownPermissionNames = new Set(getKnownPermissionNames());

  assert.equal(summary.valid, true, summary.errors.join('\n'));
  assert.equal(modules.length, 11);
  assert.deepEqual(
    modules.map((moduleConfig) => moduleConfig.key),
    [
      'dashboard',
      'commercial',
      'projects',
      'crm',
      'billing',
      'accounting',
      'technical',
      'procurement',
      'hr',
      'communication',
      'administration',
    ]
  );

  assert.ok(completePermissions.purchase_requests);
  assert.ok(completePermissions.materiel);
  assert.ok(systemRoles.some((role) => role.code === 'GERANT'));
  assert.ok(roleTemplates.GERANT.includes('purchase_requests.approve'));
  assert.ok(obsoletePermissionNames.includes('dashboard.export'));

  const obsoleteStillRegistered = obsoletePermissionNames.filter((name) => knownPermissionNames.has(name));
  assert.deepEqual(obsoleteStillRegistered, []);

  const unknownTemplatePermissions = Object.entries(roleTemplates).flatMap(([roleCode, template]) =>
    template
      .map((entry) => (typeof entry === 'string' ? entry : entry?.permissionName || entry?.name || entry?.permission))
      .filter((name) => name && name !== '*' && !knownPermissionNames.has(name))
      .map((name) => `${roleCode}:${name}`)
  );

  assert.deepEqual(unknownTemplatePermissions, []);
});
