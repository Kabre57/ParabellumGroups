const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const servicePath = path.resolve('frontend/src/shared/api/procurement/procurement.service.ts');
const moduleDirectory = path.resolve('frontend/src/shared/api/procurement/procurement');
const expectedMethods = [
  'addOrderLine',
  'approveProforma',
  'approveRequest',
  'createOrder',
  'createOrderFromProforma',
  'createProforma',
  'createRequest',
  'createSupplier',
  'deleteOrder',
  'deleteRequest',
  'deleteSupplier',
  'generateOrderFromRequest',
  'getOrder',
  'getOrderValidationHistory',
  'getOrderValidationLogs',
  'getOrders',
  'getOrdersBySupplier',
  'getRequest',
  'getRequestApprovalHistory',
  'getRequests',
  'getRequestsStats',
  'getStats',
  'getStock',
  'getStockMovements',
  'getSupplier',
  'getSupplierStats',
  'getSuppliers',
  'importSuppliers',
  'recommendProforma',
  'rejectProforma',
  'rejectRequest',
  'saveProformaCommitteeEvaluation',
  'submitProforma',
  'submitRequest',
  'updateOrder',
  'updateOrderStatus',
  'updateRequest',
  'updateSupplier',
  'updateSupplierRating',
];

test('le service public achats conserve les méthodes des cinq domaines', () => {
  const facade = fs.readFileSync(servicePath, 'utf8');
  const methodModules = [...facade.matchAll(/import \{ (\w+)Methods \} from ['"]\.\/procurement\/(.+?)['"]/g)];
  const spreads = [...facade.matchAll(/\.\.\.(\w+)Methods/g)].map((match) => match[1]);
  const methodNames = methodModules.flatMap(([, moduleName, filename]) => {
    const source = fs.readFileSync(path.join(moduleDirectory, `${filename}.ts`), 'utf8');
    assert.ok(source.includes(`export const ${moduleName}Methods = {`));
    return [...source.matchAll(/^  async (\w+)\s*\(/gm)].map((match) => match[1]);
  });

  assert.deepEqual(spreads, methodModules.map(([, moduleName]) => moduleName));
  assert.deepEqual(methodNames.sort(), [...expectedMethods].sort());
  assert.match(facade, /export type \{ ListResponse, DetailResponse \} from '\.\/shared'/);
  assert.match(facade, /export \* from '\.\/types'/);
});

test('les méthodes achats restent sous 500 lignes et importent des helpers exportés', () => {
  const sharedPath = path.resolve('frontend/src/shared/api/procurement/shared.ts');
  const sharedSource = fs.readFileSync(sharedPath, 'utf8');
  const helpers = new Set([...sharedSource.matchAll(/^export const (\w+)\s*=/gm)].map((match) => match[1]));

  for (const filename of fs.readdirSync(moduleDirectory)) {
    const source = fs.readFileSync(path.join(moduleDirectory, filename), 'utf8');
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${filename} doit rester sous 500 lignes`);
    const helperImport = source.match(/import \{([^}]+)\} from ['"]\.\.\/shared['"]/);
    for (const helper of (helperImport?.[1] || '').split(',').map((name) => name.trim()).filter(Boolean)) {
      assert.ok(helpers.has(helper), `${filename} importe ${helper}, absent des exports partagés`);
    }
  }
});
