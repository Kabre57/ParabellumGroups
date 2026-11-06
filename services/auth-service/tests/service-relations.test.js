const test = require('node:test');
const assert = require('node:assert/strict');
const {
  syncServiceHierarchy,
  syncServiceManager,
  syncServiceMember,
} = require('../src/utils/serviceRelations');

const createHierarchyClient = (initialRows) => {
  const rows = initialRows.map((row) => ({ ...row }));
  return {
    rows,
    serviceHierarchy: {
      upsert: async ({ where, create, update }) => {
        const current = rows.find((row) => row.serviceId === where.serviceId);
        if (current) Object.assign(current, update);
        else rows.push({ id: rows.length + 1, ...create });
      },
      findMany: async () => rows.map(({ serviceId, parentId }) => ({ serviceId, parentId })),
      update: async ({ where, data }) => {
        const current = rows.find((row) => row.serviceId === where.serviceId);
        Object.assign(current, data);
        return current;
      },
    },
  };
};

const matches = (row, where) => Object.entries(where).every(([key, value]) => {
  if (value === null) return row[key] == null;
  if (value && typeof value === 'object' && Object.hasOwn(value, 'not')) return row[key] !== value.not;
  return row[key] === value;
});

const createManagerClient = () => {
  const rows = [];
  return {
    rows,
    serviceManager: {
      findFirst: async ({ where }) => rows.find((row) => matches(row, where)) || null,
      updateMany: async ({ where, data }) => {
        const matching = rows.filter((row) => matches(row, where));
        matching.forEach((row) => Object.assign(row, data));
        return { count: matching.length };
      },
      update: async ({ where, data }) => {
        const current = rows.find((row) => row.id === where.id);
        Object.assign(current, data);
        return current;
      },
      create: async ({ data }) => {
        const created = { id: rows.length + 1, endDate: null, ...data };
        rows.push(created);
        return created;
      },
    },
  };
};

const createMemberClient = (initialRows) => {
  const rows = initialRows.map((row) => ({ ...row }));
  return {
    rows,
    serviceMember: {
      updateMany: async ({ where, data }) => {
        const matching = rows.filter((row) =>
          row.userId === where.userId && row.endDate == null &&
          (!where.serviceId || row.serviceId !== where.serviceId.not)
        );
        matching.forEach((row) => Object.assign(row, data));
        return { count: matching.length };
      },
      findFirst: async ({ where }) => rows.find((row) =>
        row.userId === where.userId && row.serviceId === where.serviceId && row.endDate == null
      ) || null,
      update: async ({ where, data }) => {
        const current = rows.find((row) => row.id === where.id);
        Object.assign(current, data);
        return current;
      },
      create: async ({ data }) => {
        const created = { id: rows.length + 1, endDate: null, ...data };
        rows.push(created);
        return created;
      },
    },
  };
};

test('la synchronisation de hiérarchie recalcule les niveaux des descendants', async () => {
  const client = createHierarchyClient([
    { serviceId: 1, parentId: null, level: 1 },
    { serviceId: 2, parentId: 1, level: 2 },
    { serviceId: 3, parentId: 2, level: 3 },
  ]);

  await syncServiceHierarchy(client, 1, null);

  assert.deepEqual(client.rows.map(({ serviceId, level }) => [serviceId, level]), [[1, 1], [2, 2], [3, 3]]);
});

test('la synchronisation de hiérarchie rejette les cycles', async () => {
  const client = createHierarchyClient([
    { serviceId: 1, parentId: null, level: 1 },
    { serviceId: 2, parentId: 1, level: 2 },
    { serviceId: 3, parentId: 2, level: 3 },
  ]);

  await assert.rejects(syncServiceHierarchy(client, 1, 3), /hierarchy cycle/i);
});

test('les changements de responsable gardent les anciennes périodes et ne recréent pas la période active', async () => {
  const client = createManagerClient();

  await syncServiceManager(client, 10, 20);
  const firstAssignment = client.rows[0];
  await syncServiceManager(client, 10, 20);
  assert.equal(client.rows.length, 1);
  assert.equal(client.rows[0].startDate, firstAssignment.startDate);

  await syncServiceManager(client, 10, 21);
  await syncServiceManager(client, 10, 20);

  assert.equal(client.rows.length, 3);
  assert.ok(client.rows[0].endDate);
  assert.ok(client.rows[1].endDate);
  assert.equal(client.rows[2].managerId, 20);
  assert.equal(client.rows[2].endDate, null);
});

test('un transfert clôt l’affectation précédente et ouvre la nouvelle', async () => {
  const client = createMemberClient([
    { id: 1, serviceId: 10, userId: 30, position: 'Analyste', isActive: true, endDate: null },
  ]);

  await syncServiceMember(client, 30, 11, { isActive: true, position: 'Responsable' });

  assert.equal(client.rows.length, 2);
  assert.ok(client.rows[0].endDate);
  assert.equal(client.rows[0].isActive, false);
  assert.equal(client.rows[1].serviceId, 11);
  assert.equal(client.rows[1].position, 'Responsable');
});
