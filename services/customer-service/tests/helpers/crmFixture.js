const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const enterprises = [
  { id: 1, parentEnterpriseId: null, isActive: true },
  { id: 2, parentEnterpriseId: null, isActive: true },
  { id: 3, parentEnterpriseId: 1, isActive: true },
  { id: 4, parentEnterpriseId: 3, isActive: true },
  { id: 5, parentEnterpriseId: 1, isActive: false },
];
const request = (overrides = {}) => ({
  params: {}, query: {}, body: {}, ip: '127.0.0.1', get: () => 'isolation-test',
  user: { id: 'operator', enterpriseId: 1, serviceId: 11, role: 'EMPLOYEE', permissions: [] },
  ...overrides,
  headers: { authorization: 'Bearer test-session', ...overrides.headers },
});
const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  send(body) { this.body = body; return this; },
});
const stubAuth = (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url: String(url), init });
    return { ok: true, json: async () => ({ data: enterprises }) };
  });
  return calls;
};

// An independent in-memory subset of Prisma's filters. Controllers and the
// actual scoped adapter run unchanged against two companies and a subsidiary.
const fixture = () => {
  const data = {
    client: [
      { id: 'a', nom: 'Alpha', email: 'a@example.test', enterpriseId: 1, serviceId: 11, typeClientId: 'type', secteurActiviteId: 'sector', status: 'ACTIF' },
      { id: 'a2', nom: 'Autre client A', email: 'a2@example.test', enterpriseId: 1, serviceId: 11, typeClientId: 'type', secteurActiviteId: 'sector', status: 'ACTIF' },
      { id: 'b', nom: 'Secret B', email: 'b@example.test', enterpriseId: 2, serviceId: 22, typeClientId: 'type', secteurActiviteId: 'sector', status: 'ACTIF' },
      { id: 'child', nom: 'Filiale', email: 'child@example.test', enterpriseId: 3, serviceId: 33, typeClientId: 'type', secteurActiviteId: 'sector', status: 'ACTIF' },
      { id: 'legacy', nom: 'Sans entreprise', email: 'legacy@example.test', enterpriseId: null, typeClientId: 'type' },
    ],
    contact: [{ id: 'contact-a', clientId: 'a', nom: 'A' }, { id: 'contact-a2', clientId: 'a2', nom: 'A2' }, { id: 'contact-b', clientId: 'b', nom: 'B' }],
    contrat: [{ id: 'contract-a', clientId: 'a', titre: 'A', status: 'ACTIF', montantHT: 10 }, { id: 'contract-b', clientId: 'b', titre: 'B', status: 'ACTIF', montantHT: 900 }],
    documentClient: [{ id: 'doc-a', clientId: 'a', contratId: 'contract-a' }, { id: 'doc-b', clientId: 'b', contratId: 'contract-b' }],
    adresseClient: [{ id: 'address-a', clientId: 'a' }, { id: 'address-b', clientId: 'b' }],
    opportunite: [{ id: 'opportunity-a', clientId: 'a' }, { id: 'opportunity-b', clientId: 'b' }],
    ligneProduit: [{ id: 'product-a', opportuniteId: 'opportunity-a' }, { id: 'product-b', opportuniteId: 'opportunity-b' }],
    avenantContrat: [{ id: 'amendment-a', contratId: 'contract-a' }, { id: 'amendment-b', contratId: 'contract-b' }],
    interactionClient: [], tacheClient: [], historiqueClient: [], synchronisationProspectClient: [],
    typeClient: [{ id: 'type', code: 'PRO', libelle: 'Professionnels', isActive: true }],
    secteurActivite: [{ id: 'sector', libelle: 'Secteur commun' }],
  };
  const state = { writes: 0, syncs: 0 };
  const db = {};
  const relation = (model, row, key) => {
    if (key === 'client') return ['client', data.client.find((x) => x.id === row.clientId)];
    if (key === 'contrat') return ['contrat', data.contrat.find((x) => x.id === row.contratId)];
    if (key === 'opportunite') return ['opportunite', data.opportunite.find((x) => x.id === row.opportuniteId)];
    if (key === 'clients') return ['client', data.client.filter((x) => x[model === 'typeClient' ? 'typeClientId' : 'secteurActiviteId'] === row.id)];
    if (key === 'enfants') return ['secteurActivite', data.secteurActivite.filter((x) => x.parentId === row.id)];
    const collections = { contacts: 'contact', contrats: 'contrat', adresses: 'adresseClient', documents: 'documentClient', interactions: 'interactionClient', opportunites: 'opportunite', taches: 'tacheClient', historique: 'historiqueClient' };
    if (collections[key]) return [collections[key], data[collections[key]].filter((x) => x.clientId === row.id)];
    return null;
  };
  const matches = (model, row, where = {}) => Object.entries(where).every(([key, condition]) => {
    if (condition === undefined) return true;
    if (key === 'AND') return (Array.isArray(condition) ? condition : [condition]).every((part) => matches(model, row, part));
    if (key === 'OR') return condition.some((part) => matches(model, row, part));
    if (key === 'NOT') return !(Array.isArray(condition) ? condition : [condition]).some((part) => matches(model, row, part));
    const linked = relation(model, row, key);
    if (linked && Array.isArray(linked[1])) return Object.entries(condition).every(([op, filter]) => {
      const results = linked[1].map((item) => matches(linked[0], item, filter));
      return op === 'some' ? results.some(Boolean) : op === 'none' ? !results.some(Boolean) : results.every(Boolean);
    });
    if (linked) return Boolean(linked[1]) && matches(linked[0], linked[1], condition.is || condition);
    if (condition === null || typeof condition !== 'object' || condition instanceof Date) return row[key] === condition;
    return Object.entries(condition).every(([op, value]) => {
      if (op === 'mode') return true;
      if (op === 'in') return value.includes(row[key]);
      if (op === 'not') return row[key] !== value;
      if (op === 'equals') return row[key] === value;
      if (op === 'contains') return String(row[key] || '').toLowerCase().includes(String(value).toLowerCase());
      if (op === 'startsWith') return String(row[key] || '').startsWith(value);
      if (op === 'gte') return row[key] >= value;
      if (op === 'lte') return row[key] <= value;
      throw new Error(`Unsupported fixture filter ${op}`);
    });
  });
  const shape = (model, row, args = {}) => {
    const result = args.select ? {} : structuredClone(row);
    for (const [key, selection] of Object.entries(args.select || args.include || {})) {
      if (!selection) continue;
      if (key === '_count') {
        result._count = {};
        for (const [field, countArgs] of Object.entries(selection.select)) {
          const linked = relation(model, row, field);
          result._count[field] = (linked?.[1] || []).filter((item) => matches(linked[0], item, countArgs.where)).length;
        }
        continue;
      }
      const linked = relation(model, row, key);
      result[key] = linked
        ? Array.isArray(linked[1])
          ? linked[1].filter((item) => matches(linked[0], item, selection.where)).slice(0, selection.take).map((item) => shape(linked[0], item, selection))
          : linked[1] ? shape(linked[0], linked[1], selection) : null
        : row[key];
    }
    return result;
  };
  for (const model of Object.keys(data)) {
    const rows = (where) => data[model].filter((row) => matches(model, row, where));
    const missing = () => Object.assign(new Error('No record found'), { code: 'P2025' });
    db[model] = {
      async findMany(args = {}) { return rows(args.where).slice(args.skip || 0, args.take === undefined ? undefined : (args.skip || 0) + args.take).map((row) => shape(model, row, args)); },
      async findFirst(args = {}) { const row = rows(args.where)[0]; return row ? shape(model, row, args) : null; },
      async count(args = {}) { return rows(args.where).length; },
      async groupBy(args) { return [...new Set(rows(args.where).map((row) => row[args.by[0]]))].map((value) => ({ [args.by[0]]: value, _count: rows(args.where).filter((row) => row[args.by[0]] === value).length })); },
      async aggregate(args) { const result = {}; for (const op of ['_sum', '_avg']) if (args[op]) result[op] = Object.fromEntries(Object.keys(args[op]).map((field) => [field, rows(args.where).reduce((sum, row) => sum + (row[field] || 0), 0)])); return result; },
      async create(args) {
        if (model === 'client' && data.client.some((row) => row.email === args.data.email)) throw Object.assign(new Error('Unique constraint'), { code: 'P2002' });
        const row = { id: `${model}-${data[model].length + 1}`, ...args.data };
        data[model].push(row); state.writes++; return shape(model, row, args);
      },
      async createMany(args) { for (const row of args.data) await this.create({ data: row }); return { count: args.data.length }; },
      async update(args) { const row = rows(args.where)[0]; if (!row) throw missing(); Object.assign(row, args.data); state.writes++; return shape(model, row, args); },
      async updateMany(args) { const owned = rows(args.where); for (const row of owned) Object.assign(row, args.data); state.writes += owned.length; return { count: owned.length }; },
      async delete(args) { const row = rows(args.where)[0]; if (!row) throw missing(); data[model].splice(data[model].indexOf(row), 1); state.writes++; return row; },
      async deleteMany(args) { const owned = rows(args.where); data[model] = data[model].filter((row) => !owned.includes(row)); state.writes += owned.length; return { count: owned.length }; },
    };
    db[model].findFirstOrThrow = async (args) => { const result = await db[model].findFirst(args); if (!result) throw missing(); return result; };
  }
  db.$transaction = async (callback) => {
    const before = structuredClone(data);
    const writes = state.writes;
    try { return await callback(db); } catch (error) { Object.assign(data, before); state.writes = writes; throw error; }
  };
  const modules = new Map();
  const loadController = (relative) => {
    const file = path.resolve(__dirname, '../../controllers', relative);
    if (modules.has(file)) return modules.get(file);
    const localRequire = createRequire(file);
    const module = { exports: {} };
    const requireDependency = (name) => {
      if (name === '@prisma/client') return { PrismaClient: class { constructor() { return db; } } };
      if (name === 'express-validator') return { validationResult: () => ({ isEmpty: () => true }) };
      if (name === 'winston') return { createLogger: () => ({ info() {}, error() {}, warn() {} }), format: { combine() {}, timestamp() {}, json() {} }, transports: { Console: class {} } };
      if (name.includes('technicalMissionSync')) return { syncMissionsFromClientAddress: async () => { state.syncs++; } };
      if (name === './shared') return loadController(path.relative(path.resolve(__dirname, '../../controllers'), path.join(path.dirname(file), 'shared.js')));
      return localRequire(name);
    };
    new Function('require', 'module', 'exports', fs.readFileSync(file, 'utf8'))(requireDependency, module, module.exports);
    modules.set(file, module.exports);
    return module.exports;
  };
  return { db, data, state, loadController };
};

module.exports = { enterprises, request, response, stubAuth, fixture };
