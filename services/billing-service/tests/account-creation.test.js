const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

// Execute the production helpers/controller with isolated collaborators. No
// Prisma client, database connection or shared Module._load hook is created.
const loadModule = (relativePath, dependencies) => {
  const filename = path.resolve(__dirname, '..', relativePath);
  const localRequire = createRequire(filename);
  const module = { exports: {} };
  const requireDependency = (specifier) => Object.prototype.hasOwnProperty.call(dependencies, specifier)
    ? dependencies[specifier] : localRequire(specifier);
  new Function('require', 'module', 'exports', 'console', fs.readFileSync(filename, 'utf8'))(
    requireDependency, module, module.exports, { error: () => {} }
  );
  return module.exports;
};

const accountTypes = Object.fromEntries(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((type) => [type, type]));
const accounting = loadModule('utils/accounting.js', {
  '@prisma/client': { AccountingAccountType: accountTypes, AccountingEntrySide: { DEBIT: 'DEBIT', CREDIT: 'CREDIT' } },
});
const typeResolver = loadModule('utils/accountTypeResolver.js', { './accounting': accounting });

const fixture = (accounts = [], options = {}) => {
  const rows = accounts.map((account, index) => ({ id: `account-${index}`, isActive: true, openingBalance: 0, currentBalance: 0, ...account }));
  const calls = { context: [], duplicates: [], parents: [], creates: [], updates: [], scopes: [], journalCounts: 0 };
  const prisma = {
    accountingAccount: {
      findFirst: async (query) => {
        calls.duplicates.push(query);
        return rows.find((account) => account.code === query.where.code && account.enterpriseId === query.where.enterpriseId) || null;
      },
      findMany: async (query) => {
        calls.parents.push(query);
        return rows.filter((account) => account.isActive === query.where.isActive && query.where.code.in.includes(account.code) &&
          query.where.OR.some((scope) => account.enterpriseId === scope.enterpriseId));
      },
      findUnique: async ({ where }) => rows.find((account) => account.id === where.id) || null,
      create: async (query) => {
        calls.creates.push(query);
        if (options.createError) throw options.createError;
        const row = { id: 'created', isActive: true, ...query.data };
        rows.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        calls.updates.push({ where, data });
        const row = rows.find((account) => account.id === where.id);
        Object.assign(row, data);
        return row;
      },
    },
    accountingJournalLine: { count: async () => { calls.journalCounts += 1; return options.journalLineCount || 0; } },
  };
  const shared = {
    ...accounting, prisma,
    resolveEnterpriseContext: async (...args) => {
      calls.context.push(args);
      if (options.scopeError) throw options.scopeError;
      return { enterpriseId: Object.prototype.hasOwnProperty.call(options, 'enterpriseId') ? options.enterpriseId : 7 };
    },
    assertEnterpriseInScope: async (...args) => { calls.scopes.push(args); },
  };
  const controller = loadModule('controllers/account/lifecycle.controller.js', {
    './shared': shared, '../../utils/accountTypeResolver': typeResolver,
  });
  const request = (body = {}, overrides = {}) => ({
    body: { code: '571188', label: 'Caisse principale', ...body }, params: {},
    user: { userId: 10, email: 'accountant@example.test', permissions: ['accounting.accounts.manage'] },
    headers: { 'x-enterprise-id': '7' }, ...overrides,
  });
  const response = () => ({ statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } });
  const create = async (body, overrides) => {
    const res = response();
    await controller.createAccount(request(body, overrides), res);
    return res;
  };
  return { rows, calls, create, controller, request, response };
};

test('la création sans type ni solde hérite du parent configuré et démarre à zéro', async () => {
  const { create, calls, rows } = fixture([{ code: '571', type: 'ASSET', enterpriseId: 7 }]);
  const original = { ...rows[0] };
  const res = await create();
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.type, 'asset');
  assert.equal(res.body.data.openingBalance, 0);
  assert.equal(res.body.data.currentBalance, 0);
  assert.equal(calls.creates[0].data.enterpriseId, 7);
  assert.equal(calls.creates[0].data.type, 'ASSET');
  assert.deepEqual(rows[0], original);
});

test('le préfixe le plus long précède un parent plus général même propre à l’entreprise', async () => {
  const { create } = fixture([
    { code: 'A', type: 'ASSET', enterpriseId: 7 },
    { code: 'AB', type: 'LIABILITY', enterpriseId: null },
  ]);
  const res = await create({ code: 'AB100' });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.type, 'liability');
});

test('à préfixe identique le plan de l’entreprise prévaut sur le plan global', async () => {
  const { create } = fixture([
    { code: 'A', type: 'ASSET', enterpriseId: null },
    { code: 'A', type: 'EXPENSE', enterpriseId: 7 },
  ]);
  assert.equal((await create({ code: 'A100' })).body.data.type, 'expense');
});

test('un modèle global exact peut fournir le type sans empêcher la création locale', async () => {
  const { create } = fixture([{ code: '411', type: 'ASSET', enterpriseId: null }]);
  const res = await create({ code: '411' });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.type, 'asset');
  assert.equal(res.body.data.isDynamic, true);
});

test('un compte inactif ou d’une autre entreprise ne fournit jamais le type', async () => {
  const { create, calls } = fixture([
    { code: 'AB', type: 'ASSET', enterpriseId: 8 },
    { code: 'A', type: 'ASSET', enterpriseId: 7, isActive: false },
    { code: 'AB', type: 'ASSET', enterpriseId: null, isActive: false },
  ]);
  assert.equal((await create({ code: 'AB100' })).statusCode, 400);
  assert.equal(calls.creates.length, 0);
  assert.deepEqual(calls.parents[0].where.OR, [{ enterpriseId: 7 }, { enterpriseId: null }]);
});

test('sans parent configuré un code absent du référentiel reste refusé', async () => {
  const { create, calls } = fixture();
  const res = await create({ code: 'UNKNOWN100' });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /compte parent actif/);
  assert.equal(calls.creates.length, 0);
});

test('sans parent configuré la création utilise SYSCOHADA et garde les soldes initiaux à zéro', async () => {
  for (const [code, type] of [
    ['57111', 'ASSET'], ['6011', 'EXPENSE'], ['707', 'REVENUE'],
    ['411', 'ASSET'], ['409', 'ASSET'], ['419', 'LIABILITY'], ['56', 'LIABILITY'],
  ]) {
    const { create, calls } = fixture();
    const res = await create({ code });
    assert.equal(res.statusCode, 201, code);
    assert.equal(res.body.data.type, type.toLowerCase(), code);
    assert.equal(res.body.data.openingBalance, 0, code);
    assert.equal(res.body.data.currentBalance, 0, code);
    assert.equal(calls.creates[0].data.type, type, code);
  }
});

test('le plan configuré prime sur SYSCOHADA même pour un classement personnalisé', async () => {
  const { create } = fixture([{ code: '571', type: 'EXPENSE', enterpriseId: 7 }]);
  const res = await create({ code: '57111' });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.type, 'expense');
});

test('les types explicites valides de l’API conservent leur priorité et leur solde fourni', async () => {
  const { create, calls } = fixture([{ code: '571', type: 'ASSET', enterpriseId: 7 }]);
  const res = await create({ type: 'expense', openingBalance: 125.5 });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.type, 'expense');
  assert.equal(res.body.data.openingBalance, 125.5);
  assert.equal(res.body.data.currentBalance, 125.5);
  assert.equal(calls.parents.length, 0);
});

test('un type explicite invalide et les champs obligatoires absents restent refusés', async () => {
  for (const body of [{ type: 'UNKNOWN' }, { type: null }, { type: '' }, { code: ' ' }, { label: '' }]) {
    const { create, calls } = fixture([{ code: '571', type: 'ASSET', enterpriseId: 7 }]);
    assert.equal((await create(body)).statusCode, 400);
    assert.equal(calls.creates.length, 0);
  }
});

test('un modèle global ambigu ne choisit pas un type selon l’ordre des lignes SQL', async () => {
  const { create, calls } = fixture([
    { code: '571', type: 'ASSET', enterpriseId: null },
    { code: '571', type: 'LIABILITY', enterpriseId: null },
  ]);
  assert.equal((await create()).statusCode, 400);
  assert.equal(calls.creates.length, 0);
});

test('un type configuré invalide ne déclenche pas le repli SYSCOHADA', async () => {
  const { create, calls } = fixture([{ code: '571', type: 'INVALID', enterpriseId: 7 }]);
  const res = await create({ code: '57111' });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /parent configuré/);
  assert.equal(calls.creates.length, 0);
  const prisma = { accountingAccount: { findMany: async () => [
    { code: '571', type: 'ASSET', enterpriseId: null, isActive: true },
    { code: '571', type: 'LIABILITY', enterpriseId: null, isActive: true },
  ] } };
  await assert.rejects(typeResolver.resolveNewAccountType(prisma, '57111', 7), {
    statusCode: 400, code: 'ACCOUNT_TYPE_AMBIGUOUS',
  });
});

test('les droits comptables sont vérifiés avant la résolution de périmètre et la base', async () => {
  const { create, calls } = fixture();
  const res = await create({}, { user: { permissions: ['accounting.read'] } });
  assert.equal(res.statusCode, 403);
  assert.equal(calls.context.length, 0);
  assert.equal(calls.duplicates.length, 0);
  assert.equal(calls.parents.length, 0);
  assert.equal(calls.creates.length, 0);
});

test('une entreprise refusée ou absente ne déclenche ni recherche globale ni création', async () => {
  const denied = fixture([], { scopeError: Object.assign(new Error('Entreprise interdite'), { statusCode: 403 }) });
  assert.equal((await denied.create({ enterpriseId: 8 })).statusCode, 403);
  assert.equal(denied.calls.context.length, 1);
  assert.equal(denied.calls.duplicates.length, 0);
  assert.equal(denied.calls.creates.length, 0);
  const missing = fixture([], { enterpriseId: null });
  assert.equal((await missing.create()).statusCode, 400);
  assert.equal(missing.calls.parents.length, 0);
  assert.equal(missing.calls.creates.length, 0);
});

test('les doublons de la société et conflits d’unicité concurrents retournent 409', async () => {
  const existing = fixture([{ code: '571188', type: 'ASSET', enterpriseId: 7 }]);
  assert.equal((await existing.create()).statusCode, 409);
  assert.equal(existing.calls.parents.length, 0);
  assert.equal(existing.calls.creates.length, 0);
  const raced = fixture([{ code: '571', type: 'ASSET', enterpriseId: 7 }], { createError: { code: 'P2002' } });
  assert.equal((await raced.create()).statusCode, 409);
});

test('les formules dynamiques gardent leurs codes exacts et ne sont pas héritées du parent', async () => {
  const { create, calls } = fixture([{ code: '411', type: 'ASSET', enterpriseId: null }]);
  const res = await create({ code: '411100' });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.isDynamic, false);
  assert.equal(calls.creates[0].data.formula, null);
});

test('modifier seulement un libellé ne recalcule ni type ni soldes d’un compte existant', async () => {
  const { controller, rows, calls, request, response } = fixture([
    { code: 'CUSTOM', type: 'EQUITY', enterpriseId: 7, openingBalance: 100, currentBalance: 150 },
  ], { journalLineCount: 2 });
  const req = request({}, { params: { id: rows[0].id }, body: { label: 'Libellé corrigé' } });
  const res = response();
  await controller.updateAccount(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(rows[0].type, 'EQUITY');
  assert.equal(rows[0].openingBalance, 100);
  assert.equal(rows[0].currentBalance, 150);
  assert.equal(calls.parents.length, 0);
  assert.equal(calls.journalCounts, 0);
  assert.equal(calls.scopes.length, 1);
});
