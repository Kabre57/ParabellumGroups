const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (...segments) =>
  fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');

test('proxy loader dynamically registers service route definitions', () => {
  const content = read('routes', 'proxy.js');

  assert.match(content, /const loadServiceRoutes = \(\) =>/);
  assert.match(content, /registerServiceRoutes/);
  assert.match(content, /createProxyMiddleware/);
  assert.match(content, /initializeRoutes\(\)/);
});

test('auth route config exposes public auth endpoints and protected admin routes', () => {
  const content = read('routes', 'services', 'auth.routes.js');

  assert.match(content, /serviceName: 'AUTH'/);
  assert.match(content, /path: '\/auth\/login'/);
  assert.match(content, /path: '\/auth\/register'/);
  assert.match(content, /path: '\/auth\/refresh'/);
  assert.match(content, /path: '\/auth\/users'/);
  assert.match(content, /path: '\/permission-requests'/);
  assert.match(content, /admin: true/);
});

test('technical route config keeps permission rules for key technical domains', () => {
  const content = read('routes', 'services', 'technical.routes.js');

  [
    '/interventions',
    '/missions',
    '/techniciens',
    '/specialites',
    '/materiel',
    '/rapports',
    '/ordres-mission',
  ].forEach((route) => {
    assert.match(content, new RegExp(route.replace('/', '\\/')));
  });

  assert.match(content, /permissionByPath: technicalPermissionRules/);
  assert.match(content, /missions\.read/);
  assert.match(content, /interventions\.create_report/);
  assert.match(content, /mission_orders\.read/);
});
