const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const enterprises = [
  { id: 1, parentEnterpriseId: null, isActive: true },
  { id: 2, parentEnterpriseId: null, isActive: true },
  { id: 3, parentEnterpriseId: 1, isActive: true },
  { id: 4, parentEnterpriseId: 1, isActive: false },
  { id: 5, parentEnterpriseId: 4, isActive: true },
];

const request = (overrides = {}) => ({
  headers: { authorization: 'Bearer test-token', ...overrides.headers },
  query: {}, body: {}, params: {},
  user: { id: 10, enterpriseId: 1, role: 'EMPLOYEE', permissions: [] },
  ...overrides,
  ...(overrides.headers ? { headers: { authorization: 'Bearer test-token', ...overrides.headers } } : {}),
});

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
  send() { return this; },
});

const stubReferences = (t, options = {}) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url: String(url), init });
    if (options.unavailable) throw new Error('Upstream unavailable');
    const pathname = new URL(url).pathname;
    let record;
    if (pathname === '/api/enterprises') return { ok: true, status: 200, json: async () => ({ data: options.enterprises || enterprises }) };
    if (pathname.startsWith('/api/clients/')) {
      record = {
        'customer-a': { id: 'customer-a', enterpriseId: 1 },
        'customer-b': { id: 'customer-b', enterpriseId: 2 },
        'customer-child': { id: 'customer-child', enterpriseId: 3 },
        'customer-legacy': { id: 'customer-legacy', enterpriseId: null },
      }[decodeURIComponent(pathname.split('/').pop())];
    }
    if (pathname.startsWith('/api/users/')) {
      record = {
        10: { id: 10, enterpriseId: 1, isActive: true },
        20: { id: 20, enterpriseId: 2, isActive: true },
        30: { id: 30, enterpriseId: 3, isActive: true },
        40: { id: 40, enterpriseId: 1, isActive: false },
      }[decodeURIComponent(pathname.split('/').pop())];
    }
    return { ok: Boolean(record), status: record ? 200 : 404, json: async () => ({ data: record }) };
  });
  return calls;
};

const fixture = () => {
  const data = {
    projet: [
      { id: 'project-a', enterpriseId: 1, clientId: 'customer-a', nom: 'Projet A', status: 'EN_COURS', budget: 100, coutReel: 10 },
      { id: 'project-b', enterpriseId: 2, clientId: 'customer-b', nom: 'Projet B', status: 'EN_COURS', budget: 900, coutReel: 90 },
      { id: 'project-child', enterpriseId: 3, clientId: 'customer-child', nom: 'Filiale', status: 'PLANIFIE', budget: 50, coutReel: 0 },
      { id: 'project-legacy', enterpriseId: null, clientId: 'customer-a', nom: 'Legacy', status: 'PLANIFIE', budget: 800, coutReel: 0 },
    ],
    tache: ['a', 'b', 'child', 'legacy'].map((suffix) => ({ id: `task-${suffix}`, projetId: `project-${suffix}`, titre: suffix, status: 'A_FAIRE' })),
    jalon: ['a', 'b', 'child', 'legacy'].map((suffix) => ({ id: `milestone-${suffix}`, projetId: `project-${suffix}`, nom: suffix, status: 'PLANIFIE' })),
    tacheAssignation: [
      { id: 'assignment-a', tacheId: 'task-a', userId: '10' },
      { id: 'assignment-b', tacheId: 'task-b', userId: '20' },
    ],
  };
  const hydrate = (model, row) => {
    if (!row) return null;
    if (model === 'projet') return { ...row, taches: data.tache.filter((item) => item.projetId === row.id), jalons: data.jalon.filter((item) => item.projetId === row.id) };
    if (model === 'tache' || model === 'jalon') return {
      ...row, projet: data.projet.find((item) => item.id === row.projetId),
      ...(model === 'tache' ? { assignations: data.tacheAssignation.filter((item) => item.tacheId === row.id) } : {}),
    };
    return { ...row, tache: hydrate('tache', data.tache.find((item) => item.id === row.tacheId)) };
  };
  const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => {
    if (key === 'AND') return value.every((condition) => matches(row, condition));
    if (key === 'OR') return value.some((condition) => matches(row, condition));
    if (value && typeof value === 'object') {
      if ('startsWith' in value) return String(row[key] || '').startsWith(value.startsWith);
      if ('some' in value) return (row[key] || []).some((item) => matches(item, value.some));
      return row[key] && matches(row[key], value);
    }
    return row[key] === value;
  });
  const missing = () => Object.assign(new Error('Not found'), { code: 'P2025' });
  const prisma = {};
  for (const model of Object.keys(data)) {
    const find = (where) => data[model].find((row) => matches(hydrate(model, row), where));
    prisma[model] = {
      findFirst: async ({ where } = {}) => hydrate(model, find(where)),
      findMany: async ({ where, skip = 0, take } = {}) => data[model].filter((row) => matches(hydrate(model, row), where)).slice(skip, take === undefined ? undefined : skip + take).map((row) => hydrate(model, row)),
      count: async ({ where } = {}) => data[model].filter((row) => matches(hydrate(model, row), where)).length,
      update: async ({ where, data: update }) => {
        const row = find(where);
        if (!row) throw missing();
        Object.assign(row, update);
        return hydrate(model, row);
      },
      delete: async ({ where }) => {
        const row = find(where);
        if (!row) throw missing();
        data[model].splice(data[model].indexOf(row), 1);
        return hydrate(model, row);
      },
      deleteMany: async ({ where }) => {
        const removed = data[model].filter((row) => matches(hydrate(model, row), where));
        data[model] = data[model].filter((row) => !removed.includes(row));
        return { count: removed.length };
      },
      create: async ({ data: input }) => {
        const row = { id: `new-${model}-${data[model].length}`, ...input };
        if (input.projet) {
          const parent = data.projet.find((item) => matches(hydrate('projet', item), input.projet.connect));
          if (!parent) throw missing();
          row.projetId = parent.id;
          delete row.projet;
        }
        if (input.tache) {
          const parent = data.tache.find((item) => matches(hydrate('tache', item), input.tache.connect));
          if (!parent) throw missing();
          row.tacheId = parent.id;
          delete row.tache;
        }
        data[model].push(row);
        return hydrate(model, row);
      },
    };
  }
  const controller = (name) => {
    const filename = path.resolve(__dirname, '../../controllers', `${name}.controller.js`);
    const localRequire = createRequire(filename);
    const module = { exports: {} };
    const mockRequire = (specifier) => {
      if (specifier === '@prisma/client') return { PrismaClient: class { constructor() { return prisma; } } };
      if (specifier === 'express-validator') return { validationResult: () => ({ isEmpty: () => true }) };
      return localRequire(specifier);
    };
    new Function('require', 'module', 'exports', fs.readFileSync(filename, 'utf8'))(mockRequire, module, module.exports);
    return module.exports;
  };
  return { data, prisma, controller };
};

module.exports = { fixture, request, response, stubReferences, enterprises };
