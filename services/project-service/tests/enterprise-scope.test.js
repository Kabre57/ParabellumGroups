const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveEnterpriseId } = require('../utils/enterpriseScope');
const { request, stubReferences, enterprises } = require('./helpers/projectFixture');

test('le contexte reste unique et autorise seulement la société assignée et ses filiales actives', async (t) => {
  stubReferences(t);
  assert.equal(await resolveEnterpriseId(request()), 1);
  assert.equal(await resolveEnterpriseId(request({ headers: { 'x-enterprise-id': '3' } })), 3);
  for (const enterpriseId of ['2', '4', '5']) {
    await assert.rejects(resolveEnterpriseId(request({ headers: { 'x-enterprise-id': enterpriseId } })), { statusCode: 403 });
  }
});

test('les sélections malformées et contradictoires ne sont jamais ignorées', async (t) => {
  const calls = stubReferences(t);
  for (const invalid of ['', null, undefined, '1oops', '1.0', '0', '-1', [], {}, true]) {
    await assert.rejects(resolveEnterpriseId(request({ query: { enterpriseId: invalid } })), { statusCode: 400 });
    await assert.rejects(resolveEnterpriseId(request({ headers: { 'x-enterprise-id': invalid } })), { statusCode: 400 });
    await assert.rejects(resolveEnterpriseId(request({ body: { enterpriseId: invalid } })), { statusCode: 400 });
  }
  await assert.rejects(resolveEnterpriseId(request({ headers: { 'x-enterprise-id': '1' }, query: { enterpriseId: '3' } })), { statusCode: 400 });
  await assert.rejects(resolveEnterpriseId(request({ headers: { 'x-enterprise-id': '1' }, body: { enterpriseId: 3 } })), { statusCode: 400 });
  assert.equal(calls.length, 0);
});

test('une permission de lecture simple ne crée pas un accès global', async (t) => {
  stubReferences(t);
  await assert.rejects(resolveEnterpriseId(request({ user: { enterpriseId: 1, permissions: ['enterprises.read'] }, query: { enterpriseId: 2 } })), { statusCode: 403 });
  await assert.rejects(resolveEnterpriseId(request({ user: { enterpriseId: null, permissions: ['enterprises.read'] }, query: { enterpriseId: 1 } })), { statusCode: 403 });
  assert.equal(await resolveEnterpriseId(request({ user: { enterpriseId: null, permissions: ['enterprises.read_all'] }, query: { enterpriseId: 2 } })), 2);
});

test('les comptes globaux doivent choisir une entreprise et ne reçoivent jamais une liste globale implicite', async (t) => {
  stubReferences(t);
  await assert.rejects(resolveEnterpriseId(request({ user: { role: 'ADMIN', enterpriseId: null } })), { statusCode: 400 });
  assert.equal(await resolveEnterpriseId(request({ user: { role: 'ADMIN', enterpriseId: null }, body: { enterpriseId: 2 } })), 2);
  assert.equal(await resolveEnterpriseId(request({ user: { role: 'ADMIN', enterpriseId: 1 } })), 1);
});

test('une panne auth ferme les accès et les décisions ne sont pas partagées entre requêtes', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls += 1;
    if (calls > 1) throw new Error('Auth down');
    return { ok: true, json: async () => ({ data: enterprises }) };
  });
  const req = request();
  assert.equal(await resolveEnterpriseId(req), 1);
  assert.equal(await resolveEnterpriseId(req), 1);
  await assert.rejects(resolveEnterpriseId(request()), { statusCode: 503 });
  assert.equal(calls, 2);
});
