const test = require('node:test');
const assert = require('node:assert/strict');
const { runBackfill, validateMapping } = require('../scripts/backfill-project-enterprises');
const { enterprises } = require('./helpers/projectFixture');

const mapping = [{ projectId: 'legacy', clientId: 'client-a', enterpriseId: 1 }];
const harness = (t, options = {}) => {
  let writes = 0;
  let transactions = 0;
  t.mock.method(globalThis, 'fetch', async (url) => {
    const pathname = new URL(url).pathname;
    const data = pathname === '/api/auth/me'
      ? { role: options.role || 'ADMIN', isActive: true }
      : pathname === '/api/enterprises'
        ? enterprises
        : pathname.startsWith('/api/users/')
          ? { enterpriseId: options.assigneeEnterpriseId || 1, isActive: options.assigneeActive !== false }
        : { enterpriseId: options.customerEnterpriseId || 1 };
    return { ok: true, json: async () => ({ data }) };
  });
  const prisma = {
    projet: {
      findFirst: async ({ where }) => options.alreadyAssigned ? null : {
        id: where.id, clientId: where.clientId, enterpriseId: null,
        taches: [{ assignations: [{ userId: 'assigned-user' }] }],
      },
      updateMany: async (args) => {
        writes += 1;
        assert.equal(args.where.enterpriseId, null);
        assert.equal(args.where.clientId, 'client-a');
        return { count: options.concurrentChange ? 0 : 1 };
      },
    },
    $transaction: async (callback) => { transactions += 1; return callback(prisma); },
  };
  return { prisma, counts: () => ({ writes, transactions }) };
};

test('le rattachement historique est une prévisualisation par défaut après contrôle CRM', async (t) => {
  const { prisma, counts } = harness(t);
  const report = await runBackfill({ prisma, mapping, authorization: 'Bearer operator' });
  assert.equal(report.mode, 'dry-run');
  assert.deepEqual(counts(), { writes: 0, transactions: 0 });
});

test('une application explicite est conditionnée au client et à l’absence de rattachement existant', async (t) => {
  const { prisma, counts } = harness(t);
  const report = await runBackfill({ prisma, mapping, authorization: 'Bearer operator', apply: true });
  assert.equal(report.mode, 'apply');
  assert.deepEqual(counts(), { writes: 1, transactions: 1 });
});

test('un client CRM d’une autre entreprise invalide tout le lot avant écriture', async (t) => {
  const { prisma, counts } = harness(t, { customerEnterpriseId: 2 });
  await assert.rejects(runBackfill({ prisma, mapping, authorization: 'Bearer operator', apply: true }), { statusCode: 404 });
  assert.equal(counts().writes, 0);
});

test('une assignation historique étrangère ou inactive bloque le rattachement sans mutation', async (t) => {
  for (const options of [{ assigneeEnterpriseId: 2 }, { assigneeActive: false }]) {
    const { prisma, counts } = harness(t, options);
    await assert.rejects(runBackfill({ prisma, mapping, authorization: 'Bearer operator', apply: true }), { statusCode: 404 });
    assert.deepEqual(counts(), { writes: 0, transactions: 0 });
  }
});

test('aucun compte ordinaire ni projet déjà rattaché ne peut être réaffecté par le script', async (t) => {
  await t.test('compte ordinaire', async (child) => {
    const { prisma, counts } = harness(child, { role: 'EMPLOYEE' });
    await assert.rejects(runBackfill({ prisma, mapping, authorization: 'Bearer operator', apply: true }), { statusCode: 403 });
    assert.equal(counts().writes, 0);
  });
  await t.test('projet déjà rattaché', async (child) => {
    const { prisma, counts } = harness(child, { alreadyAssigned: true });
    await assert.rejects(runBackfill({ prisma, mapping, authorization: 'Bearer operator', apply: true }), /déjà rattaché/);
    assert.equal(counts().writes, 0);
  });
});

test('le manifeste refuse les doublons et ne fournit aucune entreprise par défaut', () => {
  assert.throws(() => validateMapping([...mapping, ...mapping]), /deux fois/);
  assert.throws(() => validateMapping([{ projectId: 'legacy', clientId: 'client-a' }]), /enterpriseId/);
  assert.throws(() => validateMapping([{ projectId: 'legacy', clientId: 'client-a', enterpriseId: '1oops' }]), /enterpriseId/);
});

test('un changement concurrent provoque une erreur dans la transaction au lieu d’une réaffectation', async (t) => {
  const { prisma } = harness(t, { concurrentChange: true });
  await assert.rejects(runBackfill({ prisma, mapping, authorization: 'Bearer operator', apply: true }), /transaction annulée/);
});
