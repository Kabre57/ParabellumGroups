const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const jwt = require('jsonwebtoken');

const source = fs.readFileSync(path.join(__dirname, '../src/controllers/storage.controller.js'), 'utf8');
const cookieSource = fs.readFileSync(path.join(__dirname, '../src/utils/storageAccessCookie.js'), 'utf8');

const makeHarness = ({ metadata = { enterpriseid: '2' }, enterprises, logos = [], failure } = {}) => {
  const records = enterprises || [
    { id: 1, parentEnterpriseId: null, isActive: true },
    { id: 2, parentEnterpriseId: 1, isActive: true },
    { id: 3, parentEnterpriseId: 1, isActive: true },
    { id: 4, parentEnterpriseId: 2, isActive: true },
    { id: 9, parentEnterpriseId: null, isActive: true },
  ];
  const state = { fetched: 0, piped: 0, destroyed: 0, dbQueries: 0 };
  const body = {
    on() { return this; },
    pipe() { state.piped++; },
    destroy() { state.destroyed++; },
  };
  const database = { enterprise: {
    async findUnique({ where }) {
      state.dbQueries++;
      if (failure) throw failure;
      return records.find((enterprise) => enterprise.id === where.id) || null;
    },
    async findMany() { return logos; },
  } };
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, URL, process: { env: { S3_BUCKET_NAME: 'unit-bucket' } },
    console: { error() {} },
    require(name) {
      if (name === '../config/database') return database;
      if (name === '../utils/s3') return {
        isS3Configured: () => true,
        async getObjectStreamFromS3() {
          state.fetched++;
          return { Body: body, Metadata: metadata, ContentType: 'application/pdf', ContentLength: 12 };
        },
      };
      throw new Error(`Unexpected dependency ${name}`);
    },
  }, { filename: 'storage.controller.js' });
  return {
    state,
    async request({ user = { enterpriseId: 2, role: 'EMPLOYE' }, query = {}, headers = {}, key = 'documents/private.pdf' } = {}) {
      const response = {
        statusCode: 200, headers: {}, payload: undefined,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.payload = payload; return this; },
        setHeader(name, value) { this.headers[name] = value; },
      };
      await module.exports.serveStorageObject({ params: { 0: `unit-bucket/${key}` }, user, query, headers }, response);
      return response;
    },
  };
};

const assertDenied = (harness, response, status = 404) => {
  assert.equal(response.statusCode, status);
  assert.equal(harness.state.piped, 0, 'A refused object must never be streamed');
  assert.equal(harness.state.destroyed, harness.state.fetched, 'Every fetched, refused stream must be closed');
};

test('private object metadata establishes ownership without relying on query or active header', async () => {
  const harness = makeHarness();
  const response = await harness.request();
  assert.equal(response.statusCode, 200);
  assert.equal(harness.state.piped, 1);
  assert.equal(harness.state.destroyed, 0);
  assert.equal(response.headers['Cache-Control'], 'private, no-store');
});

test('an unowned private object is denied even when its query claims the caller enterprise', async () => {
  for (const user of [{ role: 'EMPLOYE', enterpriseId: 2 }, { role: 'ADMIN', enterpriseId: 2 }]) {
    const harness = makeHarness({ metadata: {} });
    assertDenied(harness, await harness.request({ user, query: { enterpriseId: '2' } }));
  }
});

test('invalid metadata cannot fall back to a caller-selected enterprise or legacy logo', async () => {
  const harness = makeHarness({ metadata: { enterpriseid: '2abc' }, logos: [
    { id: 2, logoUrl: '/api/storage/unit-bucket/enterprises/logo.png' },
  ] });
  assertDenied(harness, await harness.request({ key: 'enterprises/logo.png', query: { enterpriseId: '2' } }));
});

test('forged query, active header and conflicting context all deny and close the object stream', async () => {
  const contexts = [
    { query: { enterpriseId: '9' } },
    { headers: { 'x-enterprise-id': '9' } },
    { query: { enterpriseId: '2' }, headers: { 'x-enterprise-id': '9' } },
    { query: { enterpriseId: '9' }, headers: { 'x-enterprise-id': '2' } },
  ];
  for (const context of contexts) {
    const harness = makeHarness();
    assertDenied(harness, await harness.request(context));
  }
});

test('malformed query and header enterprise identifiers are rejected before storage is accessed', async () => {
  const invalid = ['', '0', '-1', '1.5', '2abc', '2.0', '2e0', ' 2 ', ['2'], {}, null, Number.MAX_SAFE_INTEGER + 1];
  for (const value of invalid) {
    for (const context of [{ query: { enterpriseId: value } }, { headers: { 'x-enterprise-id': value } }]) {
      const harness = makeHarness();
      const response = await harness.request(context);
      assertDenied(harness, response, 400);
      assert.equal(harness.state.fetched, 0);
    }
  }
});

test('hierarchy permits descendants and denies parents, siblings and unrelated enterprises', async () => {
  const descendant = makeHarness({ metadata: { enterpriseid: '4' } });
  assert.equal((await descendant.request()).statusCode, 200);
  assert.equal(descendant.state.piped, 1);
  for (const enterpriseid of ['1', '3', '9']) {
    const harness = makeHarness({ metadata: { enterpriseid } });
    assertDenied(harness, await harness.request({ query: { enterpriseId: enterpriseid } }));
  }
});

test('ordinary enterprise permission and wildcard do not grant global storage access', async () => {
  for (const permissions of [['enterprises.read'], ['*'], []]) {
    const harness = makeHarness({ metadata: { enterpriseid: '9' } });
    assertDenied(harness, await harness.request({ user: { role: 'EMPLOYE', enterpriseId: 2, permissions } }));
  }
});

test('explicit read_all and admin roles permit known active owners without broadening context', async () => {
  for (const user of [
    { role: 'EMPLOYE', permissions: ['enterprises.read_all'] },
    { role: { code: 'ADMIN' }, enterpriseId: 2 },
  ]) {
    const harness = makeHarness({ metadata: { enterpriseid: '9' } });
    assert.equal((await harness.request({ user })).statusCode, 200);
    assert.equal(harness.state.piped, 1);
    const conflicting = makeHarness({ metadata: { enterpriseid: '9' } });
    assertDenied(conflicting, await conflicting.request({ user, headers: { 'x-enterprise-id': '2' } }));
  }
});

test('users without an assigned enterprise cannot claim ownership using context', async () => {
  const harness = makeHarness();
  assertDenied(harness, await harness.request({ user: { role: 'EMPLOYE' }, query: { enterpriseId: '2' } }));
});

test('missing and inactive owners are refused even to administrators', async () => {
  for (const enterprises of [[], [{ id: 2, isActive: false, parentEnterpriseId: null }]]) {
    const harness = makeHarness({ enterprises });
    assertDenied(harness, await harness.request({ user: { role: 'ADMIN' } }));
  }
});

test('inactive intermediates and cyclic hierarchies cannot grant access', async () => {
  const inactive = makeHarness({ metadata: { enterpriseid: '4' }, enterprises: [
    { id: 1, isActive: true, parentEnterpriseId: null },
    { id: 2, isActive: false, parentEnterpriseId: 1 },
    { id: 4, isActive: true, parentEnterpriseId: 2 },
  ] });
  assertDenied(inactive, await inactive.request({ user: { role: 'EMPLOYE', enterpriseId: 1 } }));
  const cyclic = makeHarness({ metadata: { enterpriseid: '4' }, enterprises: [
    { id: 4, isActive: true, parentEnterpriseId: 2 },
    { id: 2, isActive: true, parentEnterpriseId: 4 },
  ] });
  assertDenied(cyclic, await cyclic.request({ user: { role: 'EMPLOYE', enterpriseId: 1 } }));
});

test('legacy logos remain available without a header after an exact persisted URL match', async () => {
  for (const logoUrl of [
    '/api/storage/unit-bucket/enterprises/logo.png?enterpriseId=2',
    'https://storage.example.test/unit-bucket/enterprises/logo.png',
    'https://unit-bucket.s3.amazonaws.com/enterprises/logo.png',
  ]) {
    const harness = makeHarness({ metadata: {}, logos: [{ id: 2, logoUrl }] });
    assert.equal((await harness.request({ key: 'enterprises/logo.png' })).statusCode, 200);
    assert.equal(harness.state.piped, 1);
  }
});

test('legacy logo ownership cannot come from substring, wrong bucket, unrelated owner or ambiguity', async () => {
  for (const logos of [
    [{ id: 2, logoUrl: '/api/storage/unit-bucket/enterprises/logo.png.backup' }],
    [{ id: 2, logoUrl: '/api/storage/other-bucket/enterprises/logo.png' }],
    [{ id: 9, logoUrl: '/api/storage/unit-bucket/enterprises/logo.png' }],
    [{ id: 2, logoUrl: '/api/storage/unit-bucket/enterprises/logo.png' },
      { id: 3, logoUrl: '/api/storage/unit-bucket/enterprises/logo.png' }],
    [],
  ]) {
    const harness = makeHarness({ metadata: {}, logos });
    assertDenied(harness, await harness.request({ key: 'enterprises/logo.png', query: { enterpriseId: '2' } }));
  }
});

test('legacy logo query must match the owner resolved from its persisted URL', async () => {
  const harness = makeHarness({ metadata: {}, logos: [
    { id: 2, logoUrl: '/api/storage/unit-bucket/enterprises/logo.png' },
  ] });
  assertDenied(harness, await harness.request({ key: 'enterprises/logo.png', query: { enterpriseId: '9' } }));
});

test('an authorization lookup failure closes the storage stream without sending object data', async () => {
  const harness = makeHarness({ failure: new Error('Database unavailable') });
  assertDenied(harness, await harness.request(), 500);
});

test('storage cookies retain only explicit global enterprise permission and preserve admin identity', () => {
  const secret = 'unit-test-storage-cookie-secret';
  const module = { exports: {} };
  vm.runInNewContext(cookieSource, {
    module, require, process: { env: { JWT_SECRET: secret, NODE_ENV: 'production' } },
  }, { filename: 'storageAccessCookie.js' });
  for (const role of ['EMPLOYE', 'ADMIN']) {
    let stored;
    const accessToken = jwt.sign({
      userId: 7, enterpriseId: 2, role,
      permissions: ['enterprises.read', '*', 'enterprises.read_all', 'documents.read'],
    }, secret, { expiresIn: 3600, issuer: 'parabellum-auth-service' });
    module.exports.setStorageAccessCookie({ cookie(name, token, options) { stored = { name, token, options }; } }, accessToken);
    const payload = jwt.verify(stored.token, secret, { issuer: 'parabellum-auth-service' });
    assert.deepEqual(payload.permissions, ['enterprises.read_all']);
    assert.equal(payload.role, role);
    assert.equal(payload.enterpriseId, 2);
    assert.equal(stored.name, 'pbl_storage_token');
    assert.equal(stored.options.path, '/api/storage');
    assert.equal(stored.options.httpOnly, true);
    assert.equal(stored.options.secure, true);
  }
});
