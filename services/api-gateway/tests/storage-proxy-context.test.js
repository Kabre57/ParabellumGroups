const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const loadProxyConfigurations = () => {
  const configurations = new Map();
  const noop = () => {};
  const routes = [
    { serviceName: 'STORAGE', basePath: 'http://auth-unit', routes: [{ path: '/storage/*', auth: true, authCookie: 'storage' }] },
    { serviceName: 'CUSTOMERS', basePath: 'http://crm-unit', routes: [{ path: '/customers', auth: true }] },
  ];
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../routes/proxy.js'), 'utf8'), {
    module, __dirname: path.join(__dirname, '../routes'),
    require(name) {
      if (name === 'express') return { Router: () => ({ use: noop }) };
      if (name === 'http-proxy-middleware') return {
        fixRequestBody: noop,
        createProxyMiddleware(config) { configurations.set(config.target, config); return noop; },
      };
      if (name === '../middleware/auth') return { authenticateToken: noop, authenticateStorageToken: noop };
      if (name === '../middleware/permissions') return { requireAdmin: () => noop, requirePermission: () => noop, requirePermissionByPath: () => noop };
      if (name === '../middleware/validation') return { validateSchema: () => noop };
      if (name === '../utils/logger') return { logError: noop, logInfo: noop };
      if (name === 'fs') return { readdirSync: () => ['storage.routes.js', 'customers.routes.js'] };
      if (name === 'path') return path;
      if (name.endsWith('storage.routes.js')) return routes[0];
      if (name.endsWith('customers.routes.js')) return routes[1];
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return configurations;
};

const forwardedHeaders = (config, headers = {}) => {
  const forwarded = {};
  config.onProxyReq({ setHeader(name, value) { forwarded[name] = value; } }, {
    user: { id: 7, enterpriseId: 1 }, headers, query: {},
    originalUrl: '/api/storage/unit-bucket/enterprises/logo.png?enterpriseId=3',
  }, {});
  return forwarded;
};

test('browser storage requests do not invent an active enterprise from the JWT assignment', () => {
  const configs = loadProxyConfigurations();
  const headers = forwardedHeaders(configs.get('http://auth-unit'));
  assert.equal(headers['X-Enterprise-Id'], undefined);
  assert.equal(headers['X-User-Id'], '7');
});

test('ordinary API requests retain the assigned enterprise fallback', () => {
  const configs = loadProxyConfigurations();
  assert.equal(forwardedHeaders(configs.get('http://crm-unit'))['X-Enterprise-Id'], '1');
});

test('explicit enterprise headers are forwarded for validation, including invalid empty values', () => {
  const configs = loadProxyConfigurations();
  for (const config of configs.values()) {
    for (const selected of ['3', '', '1,2', 'invalid']) {
      assert.equal(forwardedHeaders(config, { 'x-enterprise-id': selected })['X-Enterprise-Id'], selected);
    }
  }
});
