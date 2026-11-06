const test = require('node:test');
const assert = require('node:assert/strict');
const { createScopedPrisma } = require('../utils/scopedPrisma');
const { resolveEnterpriseScope } = require('../utils/enterpriseScope');
const { fixture, request, response, stubAuth } = require('./helpers/crmFixture');

test('CRM scoped reads, counts and aggregates exclude foreign and unassigned clients', async () => {
  const { db } = fixture();
  const scoped = createScopedPrisma(db, 1);
  assert.deepEqual((await scoped.client.findMany()).map((row) => row.id), ['a', 'a2']);
  assert.equal(await scoped.client.findUnique({ where: { id: 'b' } }), null);
  assert.equal(await scoped.client.count({ where: { OR: [{ id: 'a' }, { id: 'b' }] } }), 1);
  assert.equal((await scoped.contrat.aggregate({ _sum: { montantHT: true } }))._sum.montantHT, 10);
  for (const [model, id] of [['contact', 'contact-b'], ['documentClient', 'doc-b'], ['avenantContrat', 'amendment-b'], ['ligneProduit', 'product-b']]) {
    assert.equal(await scoped[model].findUnique({ where: { id } }), null);
  }
});

test('CRM foreign updates and deletes cannot mutate data even through a transaction', async () => {
  const { db, data, state } = fixture();
  const scoped = createScopedPrisma(db, 1);
  const before = structuredClone(data);
  await assert.rejects(scoped.client.update({ where: { id: 'b' }, data: { nom: 'Stolen' } }), { statusCode: 404 });
  await assert.rejects(scoped.$transaction((tx) => tx.documentClient.delete({ where: { id: 'doc-b' } })), { code: 'P2025' });
  assert.deepEqual(data, before);
  assert.equal(state.writes, 0);
});

test('CRM creations and updates keep ownership immutable and reject nested writes', async () => {
  const { db, data } = fixture();
  const scoped = createScopedPrisma(db, 1);
  const created = await scoped.client.create({ data: { nom: 'Nouveau', email: 'new@example.test', typeClientId: 'type' } });
  assert.equal(created.enterpriseId, 1);
  assert.equal((await scoped.client.update({ where: { id: 'a' }, data: { enterpriseId: '1', nom: 'Autorisé' } })).enterpriseId, 1);
  await assert.rejects(scoped.client.update({ where: { id: 'a' }, data: { enterpriseId: 2 } }), { statusCode: 403 });
  await assert.rejects(scoped.client.update({ where: { id: 'a' }, data: { contacts: { connect: { id: 'contact-b' } } } }), { statusCode: 400 });
  await assert.rejects(scoped.contact.update({ where: { id: 'contact-a' }, data: { clientId: 'b' } }), { statusCode: 400 });
  assert.equal(data.client.find((row) => row.id === 'a').enterpriseId, 1);
});

test('CRM child creation requires a parent and all references from the same client', async () => {
  const { db, state } = fixture();
  const scoped = createScopedPrisma(db, 1);
  await assert.rejects(scoped.contact.create({ data: { clientId: 'b', nom: 'Intrus' } }), { statusCode: 404 });
  await assert.rejects(scoped.documentClient.create({ data: { clientId: 'a', contratId: 'contract-b' } }), { statusCode: 404 });
  await assert.rejects(scoped.contrat.create({ data: { clientId: 'a', signataireId: 'contact-a2' } }), { statusCode: 404 });
  assert.equal(state.writes, 0);
  const contract = await scoped.contrat.create({ data: { clientId: 'a', signataireId: 'contact-a' } });
  assert.equal(contract.signataireId, 'contact-a');
});

test('CRM bulk writes cannot move ownership and createMany validates every parent before writing', async () => {
  const { db, state } = fixture();
  const scoped = createScopedPrisma(db, 1);
  await assert.rejects(scoped.contact.updateMany({ data: { clientId: 'b' } }), { statusCode: 400 });
  await assert.rejects(scoped.contact.createMany({ data: [{ clientId: 'a', nom: 'OK' }, { clientId: 'b', nom: 'Non' }] }), { statusCode: 404 });
  assert.equal(state.writes, 0);
  assert.equal((await scoped.contact.updateMany({ data: { nom: 'Traité' } })).count, 2);
  assert.equal((await db.contact.findFirst({ where: { id: 'contact-b' } })).nom, 'B');
});

test('global catalogues expose only active-company samples and filtered client counts', async () => {
  const { db } = fixture();
  const scoped = createScopedPrisma(db, 1);
  for (const model of ['typeClient', 'secteurActivite']) {
    const rows = await scoped[model].findMany({ include: { clients: true, _count: { select: { clients: true } } } });
    assert.deepEqual(rows[0].clients.map((row) => row.id), ['a', 'a2']);
    assert.equal(rows[0]._count.clients, 2);
    assert.equal(await scoped[model].count({ where: { clients: { some: { id: 'b' } } } }), 0);
  }
});

test('client list uses the selected subsidiary rather than the assigned parent or its department', async (t) => {
  const calls = stubAuth(t);
  const { loadController } = fixture();
  const controller = loadController('client/queries.controller.js');
  const res = response();
  await controller.getAll(request({ headers: { 'x-enterprise-id': '3' } }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data.map((row) => row.id), ['child']);
  assert.equal(res.body.meta.pagination.total, 1);
  assert.equal(calls.length, 1, 'The enterprise decision is reused only within this request');
});

test('client details and updates return 404 for foreign IDs without history or synchronization', async (t) => {
  stubAuth(t);
  const { loadController, state } = fixture();
  for (const [file, handler] of [['client/queries.controller.js', 'getById'], ['client/lifecycle.controller.js', 'update']]) {
    const res = response();
    await loadController(file)[handler](request({ params: { id: 'b' }, body: { nom: 'Intrus' } }), res);
    assert.equal(res.statusCode, 404);
  }
  assert.equal(state.writes, 0);
  assert.equal(state.syncs, 0);
});

test('client import never updates a foreign record by globally unique email', async (t) => {
  stubAuth(t);
  const { loadController, data, state } = fixture();
  const res = response();
  await loadController('client/import.controller.js').importClients(request({ body: { items: [{ nom: 'Intrus', email: 'b@example.test' }] } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.updated, 0);
  assert.equal(res.body.data.created, 0);
  assert.equal(res.body.data.errors.length, 1);
  assert.equal(data.client.find((row) => row.id === 'b').nom, 'Secret B');
  assert.equal(state.writes, 0);
});

test('client import rejects foreign and malformed enterprise aliases and keeps valid rows', async (t) => {
  stubAuth(t);
  const { loadController, data } = fixture();
  const res = response();
  await loadController('client/import.controller.js').importClients(request({ body: { items: [
    { nom: 'Autre entreprise', email: 'no@example.test', 'entreprise id': 2 },
    { nom: 'Invalide', email: 'bad@example.test', enterpriseId: '1oops' },
    { nom: 'Autorisé', email: 'ok@example.test', enterpriseId: 1 },
  ] } }), res);
  assert.equal(res.body.data.errors.length, 2);
  assert.equal(res.body.data.created, 1);
  assert.equal(data.client.find((row) => row.email === 'ok@example.test').enterpriseId, 1);
});

test('CRM scope refuses unassigned users, malformed values, parent/sibling escalation and implicit global access', async (t) => {
  stubAuth(t);
  for (const value of [null, undefined, [], {}, true, '1e0', '1.0', ' 1 ', Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(resolveEnterpriseScope(request({ body: { enterpriseId: value } })), { statusCode: 400 });
  }
  await assert.rejects(resolveEnterpriseScope(request({ user: { role: 'EMPLOYEE', enterpriseId: null }, query: { enterpriseId: 1 } })), { statusCode: 403 });
  for (const id of [1, 2, 5]) {
    await assert.rejects(resolveEnterpriseScope(request({ user: { role: 'EMPLOYEE', enterpriseId: 3 }, query: { enterpriseId: id } })), { statusCode: 403 });
  }
  assert.equal((await resolveEnterpriseScope(request({ user: { role: 'EMPLOYEE', enterpriseId: 3 }, query: { enterpriseId: 4 } }))).enterpriseId, 4);
  await assert.rejects(resolveEnterpriseScope(request({ user: { role: 'EMPLOYEE', enterpriseId: 1, permissions: ['enterprises.read'] }, query: { enterpriseId: 2 } })), { statusCode: 403 });
  assert.equal((await resolveEnterpriseScope(request({ user: { role: 'EMPLOYEE', enterpriseId: 1, permissions: ['enterprises.read_all'] }, query: { enterpriseId: 2 } }))).enterpriseId, 2);
});

test('CRM scope caches neither successful nor failed decisions across requests', async (t) => {
  const calls = stubAuth(t);
  const req = request();
  await resolveEnterpriseScope(req);
  await resolveEnterpriseScope(req);
  await resolveEnterpriseScope(request({ user: { role: 'EMPLOYEE', enterpriseId: 2 } }));
  assert.equal(calls.length, 2);
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unavailable'); });
  await assert.rejects(resolveEnterpriseScope(request()), { statusCode: 503 });
});

test('CRM mission synchronization keeps the authorized subsidiary context and Bearer token', async (t) => {
  const calls = stubAuth(t);
  const { syncMissionsFromClientAddress } = require('../services/technicalMissionSync');
  await syncMissionsFromClientAddress(request({ headers: { 'x-enterprise-id': '3' } }), 'client/with space');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-session');
  assert.equal(calls[0].init.headers['X-Enterprise-Id'], '3');
  assert.match(calls[0].url, /client%2Fwith%20space$/);
});
