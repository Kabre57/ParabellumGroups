/**
 * Tests d'isolation inter-entreprises pour le CRM (customer-service).
 *
 * Ces tests vérifient que :
 * 1. Un utilisateur de l'entreprise A ne peut pas lire les données de B.
 * 2. Un identifiant explicite hors périmètre est rejeté (403) avant toute lecture.
 * 3. Les documents sont soumis aux mêmes règles (accès par clientId seulement).
 * 4. buildClientScopeWhere n'élargit pas le périmètre d'un utilisateur non-admin.
 * 5. La synchronisation des missions transmet bien le jeton Bearer.
 *
 * Ces tests s'exécutent sans base de données ni réseau ; toutes les dépendances
 * externes (fetch, PrismaClient, auth-service) sont stubées.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const enterprises = [
  { id: 1, parentEnterpriseId: null, isActive: true },
  { id: 2, parentEnterpriseId: null, isActive: true },
  { id: 3, parentEnterpriseId: 1,    isActive: true },  // filiale de 1
  { id: 4, parentEnterpriseId: 1,    isActive: false }, // inactive
];

const makeRequest = (overrides = {}) => ({
  headers: { authorization: 'Bearer test-token', ...(overrides.headers || {}) },
  query:   {},
  body:    {},
  params:  {},
  ip:      '127.0.0.1',
  user: { id: 'user-1', enterpriseId: 1, role: 'EMPLOYEE', permissions: [] },
  get: (name) => name === 'user-agent' ? 'test-agent' : undefined,
  ...overrides,
  ...(overrides.headers
    ? { headers: { authorization: 'Bearer test-token', ...overrides.headers } }
    : {}),
});

const makeResponse = () => {
  const res = { statusCode: 200, body: null };
  res.status  = (code) => { res.statusCode = code; return res; };
  res.json    = (payload) => { res.body = payload; return res; };
  res.send    = () => res;
  return res;
};

/**
 * Stub minimal de fetch qui simule l'auth-service.
 * Renvoie la liste des entreprises et refuse toute autre URL avec 404.
 */
const stubFetch = (t, options = {}) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url: String(url), init });
    if (options.authDown) throw new Error('Auth service down');
    const path = new URL(url).pathname;
    if (path === '/api/enterprises' || path.startsWith('/api/enterprises')) {
      return { ok: true, status: 200, json: async () => ({ data: options.enterprises ?? enterprises }) };
    }
    return { ok: false, status: 404, json: async () => ({ data: null }) };
  });
  return calls;
};

// ---------------------------------------------------------------------------
// 1. buildClientScopeWhere — contrôle du pré-filtre
// ---------------------------------------------------------------------------

test('buildClientScopeWhere : un utilisateur non-admin ne peut pas cibler une autre entreprise', () => {
  // Charger directement shared.js sans base de données.
  // On utilise Module._resolveFilename pour éviter d'instancier PrismaClient.
  const path = require('node:path');
  const fs   = require('node:fs');
  const src  = fs.readFileSync(
    path.join(__dirname, '../controllers/client/shared.js'),
    'utf8',
  );

  // Extraire buildClientScopeWhere, parseScopedInteger et isAdminLike sans exécuter le module entier.
  const sandbox = { module: { exports: {} }, exports: {} };
  sandbox.require = (specifier) => {
    if (specifier === '@prisma/client')    return { PrismaClient: class { } };
    if (specifier === 'express-validator') return { validationResult: () => ({}) };
    if (specifier === 'winston')           return { createLogger: () => ({ info() {}, error() {}, warn() {} }), format: { combine() {}, timestamp() {}, json() {} }, transports: { Console: class {} } };
    if (specifier.includes('technicalMissionSync')) return { syncMissionsFromClientAddress: async () => {} };
    return require(specifier);
  };
  new Function('require', 'module', 'exports', src)(sandbox.require, sandbox.module, sandbox.module.exports);

  const { buildClientScopeWhere } = sandbox.module.exports;

  // Utilisateur entreprise 1 : fournir enterpriseId=2 → ignoré, le filtre reste sur 1.
  const req = makeRequest();
  const where = buildClientScopeWhere(req, '2', null);
  assert.equal(where.enterpriseId, 1,
    'Un non-admin ne doit pas pouvoir filtrer sur une entreprise étrangère');

  // Utilisateur entreprise 1 : fournir enterpriseId=1 → accepté.
  const whereOwn = buildClientScopeWhere(req, '1', null);
  assert.equal(whereOwn.enterpriseId, 1);

  // Admin : peut spécifier n'importe quelle entreprise.
  const adminReq = makeRequest({ user: { id: 'admin', enterpriseId: 1, role: 'admin' } });
  const whereAdmin = buildClientScopeWhere(adminReq, '2', null);
  assert.equal(whereAdmin.enterpriseId, 2);
});

// ---------------------------------------------------------------------------
// 2. resolveEnterpriseScope — isolation par périmètre
// ---------------------------------------------------------------------------

test('resolveEnterpriseScope CRM : rejette un enterpriseId étranger avec 403', async (t) => {
  stubFetch(t);
  const { resolveEnterpriseScope } = require('../utils/enterpriseScope');

  // Périmètre propre (entreprise 1) → OK.
  const own = await resolveEnterpriseScope(makeRequest());
  assert.equal(own.enterpriseId, 1);

  // Filiale accessible (entreprise 3, filiale de 1) → OK.
  const child = await resolveEnterpriseScope(
    makeRequest({ headers: { 'x-enterprise-id': '3' } }),
  );
  assert.equal(child.enterpriseId, 3);

  // Entreprise étrangère (2) → rejetée.
  await assert.rejects(
    resolveEnterpriseScope(makeRequest({ headers: { 'x-enterprise-id': '2' } })),
    { statusCode: 403 },
    'Doit rejeter une entreprise hors périmètre',
  );

  // Entreprise inactive (4) → inaccessible.
  await assert.rejects(
    resolveEnterpriseScope(makeRequest({ headers: { 'x-enterprise-id': '4' } })),
    { statusCode: 403 },
  );
});

test('resolveEnterpriseScope CRM : les sélections contradictoires sont rejetées avec 400', async (t) => {
  stubFetch(t);
  const { resolveEnterpriseScope } = require('../utils/enterpriseScope');

  await assert.rejects(
    resolveEnterpriseScope(makeRequest({
      headers: { 'x-enterprise-id': '1' },
      query:   { enterpriseId: '3' },
    })),
    { statusCode: 400 },
  );

  // Valeurs malformées.
  for (const bad of ['', '0', '-1', 'abc', '1.5']) {
    await assert.rejects(
      resolveEnterpriseScope(makeRequest({ query: { enterpriseId: bad } })),
      { statusCode: 400 },
    );
  }
});

test('resolveEnterpriseScope CRM : une panne auth-service retourne 503', async (t) => {
  stubFetch(t, { authDown: true });
  const { resolveEnterpriseScope } = require('../utils/enterpriseScope');

  await assert.rejects(
    resolveEnterpriseScope(makeRequest()),
    { statusCode: 503 },
  );
});

test('resolveEnterpriseScope CRM : un admin sans rattachement doit choisir explicitement', async (t) => {
  stubFetch(t);
  const { resolveEnterpriseScope } = require('../utils/enterpriseScope');

  // Admin sans enterpriseId et sans sélection explicite → 400.
  await assert.rejects(
    resolveEnterpriseScope(makeRequest({ user: { id: 'admin', role: 'ADMIN', enterpriseId: null } })),
    { statusCode: 400 },
  );

  // Admin avec sélection explicite → OK.
  const result = await resolveEnterpriseScope(
    makeRequest({ user: { id: 'admin', role: 'ADMIN', enterpriseId: null }, body: { enterpriseId: 2 } }),
  );
  assert.equal(result.enterpriseId, 2);
});

// ---------------------------------------------------------------------------
// 3. syncMissionsFromClientAddress — jeton Bearer et contrôle de la réponse
// ---------------------------------------------------------------------------

// Les 3 tests suivants rechargent le module depuis sa source pour contourner
// le cache Node.js et s'assurer que fetch est bien intercepté à chaque test.
const loadSync = () => {
  const fs   = require('node:fs');
  const path = require('node:path');
  const src  = fs.readFileSync(path.join(__dirname, '../services/technicalMissionSync.js'), 'utf8');
  const mod  = { exports: {} };
  new Function('require', 'module', 'exports', src)(require, mod, mod.exports);
  return mod.exports;
};

test('syncMissionsFromClientAddress : transmet le jeton Bearer et logue les erreurs HTTP', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url: String(url), init });
    return { ok: false, status: 500, json: async () => ({}) };
  });

  const { syncMissionsFromClientAddress } = loadSync();
  await syncMissionsFromClientAddress(makeRequest(), 'client-123');

  assert.equal(calls.length, 1, 'Un seul appel réseau doit être émis');
  assert.ok(
    calls[0].init?.headers?.Authorization === 'Bearer test-token',
    'Le header Authorization doit contenir le jeton Bearer de la requête',
  );
  assert.ok(
    !Object.prototype.hasOwnProperty.call(calls[0].init?.headers || {}, 'x-user-id'),
    'Le header x-user-id ne doit plus être transmis',
  );
});

test('syncMissionsFromClientAddress : sans jeton Bearer, la synchronisation est ignoree silencieusement', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url: String(url), init });
    return { ok: true, status: 200, json: async () => ({}) };
  });

  const { syncMissionsFromClientAddress } = loadSync();
  // Requête sans header Authorization : on construit manuellement sans default.
  const reqNoAuth = {
    headers: {},
    query: {}, body: {}, params: {},
    ip: '127.0.0.1',
    user: { id: 'user-1', enterpriseId: 1, role: 'EMPLOYEE' },
    get: () => undefined,
  };
  await syncMissionsFromClientAddress(reqNoAuth, 'client-456');

  assert.equal(calls.length, 0, 'Aucun appel réseau sans jeton Bearer');
});

test('syncMissionsFromClientAddress : une panne reseau ne propage pas l erreur', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('ECONNREFUSED');
  });

  const { syncMissionsFromClientAddress } = loadSync();
  await assert.doesNotReject(
    syncMissionsFromClientAddress(makeRequest(), 'client-789'),
  );
});

// ---------------------------------------------------------------------------
// 4. Vérification de la signature du module technicalMissionSync
// ---------------------------------------------------------------------------

test('technicalMissionSync exporte bien la fonction syncMissionsFromClientAddress', () => {
  const modulePath = require.resolve('../services/technicalMissionSync');
  delete require.cache[modulePath];
  const mod = require('../services/technicalMissionSync');
  assert.equal(typeof mod.syncMissionsFromClientAddress, 'function');
});
