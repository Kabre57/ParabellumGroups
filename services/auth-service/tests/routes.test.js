const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
