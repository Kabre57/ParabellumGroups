import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import type { OperationalRequest } from '@prisma/client';
import routerModule from '../../routes/operationalRequest.routes.js';
import { createTestPrisma } from '../helpers/testPrisma.ts';
import { startBillingStub, startHttpServer } from '../helpers/billingStub.ts';
import type { BillingStubOptions, BillingVoucher } from '../helpers/billingStub.ts';
import { loadWebCashVoucherFlow } from '../helpers/webCashVoucherFlow.ts';

type LinkResponse = {
  success: boolean;
  message?: string;
  data: { id: string; cashVoucherId: string };
};

// Sequential because production clients use process.env for inter-service URLs.
// Only Auth/Billing HTTP boundaries are stubs: routing, permissions, lookup,
// controller, transactions, logs and notifications outbox all run unchanged.
async function setup(t: TestContext, options: Omit<BillingStubOptions, 'vouchers'> & { voucherExists: boolean }) {
  const previous = {
    BILLING_SERVICE_URL: process.env.BILLING_SERVICE_URL,
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
  };
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const prisma = await createTestPrisma();
  t.after(() => prisma.$disconnect());
  assert.equal(await prisma.operationalRequest.count(), 0, 'Each test needs its own empty database.');
  const request = await prisma.operationalRequest.create({
    data: {
      requestNumber: `DO-2026-${randomUUID()}`,
      type: 'FUEL',
      status: 'APPROVED',
      enterpriseId: 1,
      enterpriseName: 'Parabellum Group',
      requesterId: randomUUID(),
      requesterName: 'Awa Kone',
      requesterEmail: 'awa.kone@example.test',
      beneficiaryName: 'Awa Kone',
      reason: 'Carburant pour la visite du chantier de Yopougon',
      amountRequested: '25000.00',
      amountApproved: '25000.00',
      currency: 'XOF',
      approvedAt: new Date('2026-10-25T10:00:00Z'),
      details: { vehicleRegistration: 'AB-123-CD', destination: 'Yopougon' },
    },
  });
  const voucher: BillingVoucher = {
    id: randomUUID(),
    voucherNumber: `BC-2026-${request.id.slice(0, 8)}`,
    status: 'BROUILLON',
    sourceType: 'OPERATIONAL_REQUEST',
    sourceId: request.id,
    enterpriseId: request.enterpriseId,
    amountTTC: request.amountApproved?.toString(),
  };
  const billing = await startBillingStub({ ...options, vouchers: options.voucherExists ? [voucher] : [] });
  t.after(billing.close);
  process.env.BILLING_SERVICE_URL = billing.baseUrl;
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  const token = jwt.sign({
    userId: randomUUID(),
    firstName: 'Mariam',
    lastName: 'Diallo',
    role: 'COMPTABLE',
    enterpriseId: request.enterpriseId,
    permissions: ['operational_requests.finance'],
  }, process.env.JWT_SECRET, { issuer: 'parabellum-auth-service', expiresIn: '5m' });
  const app = express();
  const calls: { method: string; path: string; status: number }[] = [];
  app.use((req, res, next) => {
    const { method, path } = req;
    res.on('finish', () => calls.push({ method, path, status: res.statusCode }));
    next();
  });
  app.use(express.json());
  // Gateway HTTP boundary: forward the web's Billing route over a real socket.
  app.post('/api/billing/cash-vouchers', async (req, res, next) => {
    try {
      const response = await fetch(`${billing.baseUrl}/api/cash-vouchers`, {
        method: 'POST',
        headers: {
          Authorization: req.get('Authorization') ?? '',
          'X-Enterprise-Id': req.get('X-Enterprise-Id') ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(10_000),
      });
      res.status(response.status).json(await response.json());
    } catch (error: unknown) {
      next(error);
    }
  });
  app.get('/api/enterprises', (_req, res) => res.json({
    success: true,
    data: [{ id: request.enterpriseId, name: request.enterpriseName, isActive: true }],
  }));
  app.use('/api/operational-requests', routerModule.createOperationalRequestRouter(prisma));
  const service = await startHttpServer(app);
  t.after(service.close);
  process.env.AUTH_SERVICE_URL = service.baseUrl;
  const headers = { Authorization: `Bearer ${token}`, 'X-Enterprise-Id': String(request.enterpriseId) };
  const link = () => fetch(`${service.baseUrl}/api/operational-requests/${request.id}/cash-voucher`, {
    method: 'POST', headers, signal: AbortSignal.timeout(10_000),
  });
  const web = async () => loadWebCashVoucherFlow({
    baseUrl: `${service.baseUrl}/api`, token, enterpriseId: request.enterpriseId,
  });
  return { prisma, request, voucher, billing, headers, link, calls, web };
}

async function assertUnlinked(prisma: Awaited<ReturnType<typeof createTestPrisma>>, request: OperationalRequest) {
  const persisted = await prisma.operationalRequest.findUniqueOrThrow({ where: { id: request.id } });
  assert.equal(persisted.status, request.status);
  assert.equal(persisted.cashVoucherId, null);
  assert.equal(persisted.cashVoucherNumber, null);
  assert.equal(persisted.updatedAt.getTime(), request.updatedAt.getTime());
  assert.equal(await prisma.operationalRequestLog.count({ where: { requestId: request.id } }), 0);
  assert.equal(await prisma.operationalRequestOutboxEvent.count(), 0);
}

test('Billing GET 200 + un bon : liaison et log CASH_VOUCHER_LINKED persistés', { concurrency: false }, async (t) => {
  const { prisma, request, voucher, billing, headers, link } = await setup(t, {
    creationStatus: 200, voucherExists: true,
  });
  const response = await link();
  const body: LinkResponse = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);
  assert.equal(body.data.id, request.id);
  assert.equal(body.data.cashVoucherId, voucher.id);
  const persisted = await prisma.operationalRequest.findUniqueOrThrow({ where: { id: request.id } });
  assert.equal(persisted.cashVoucherId, voucher.id);
  assert.equal(persisted.cashVoucherNumber, voucher.voucherNumber);
  assert.equal(persisted.status, 'CASH_VOUCHER_CREATED');
  const logs = await prisma.operationalRequestLog.findMany({ where: { requestId: request.id } });
  assert.deepEqual(logs.map((log) => log.action).sort(), ['CASH_VOUCHER_LINKED', 'FINANCIAL_PROCESSING_STARTED']);
  const linked = logs.find((log) => log.action === 'CASH_VOUCHER_LINKED');
  assert.equal(linked?.fromStatus, 'APPROVED');
  assert.equal(linked?.toStatus, 'CASH_VOUCHER_CREATED');
  assert.equal(linked?.actorName, 'Mariam Diallo');
  const notifications = await prisma.operationalRequestOutboxEvent.findMany();
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].userId, request.requesterId);
  assert.equal(billing.calls.length, 1);
  assert.deepEqual(billing.calls[0].query, {
    enterpriseId: String(request.enterpriseId), sourceId: request.id, sourceType: 'OPERATIONAL_REQUEST',
  });
  assert.equal(billing.calls[0].method, 'GET');
  assert.equal(billing.calls[0].authorization, headers.Authorization);
  assert.equal(billing.calls[0].enterpriseId, headers['X-Enterprise-Id']);
  // Repeating a real link must not duplicate logs or outbox events.
  const repeated = await link();
  assert.equal(repeated.status, 200);
  const repeatedBody: LinkResponse = await repeated.json();
  assert.equal(repeatedBody.data.cashVoucherId, voucher.id);
  assert.equal(await prisma.operationalRequestLog.count({ where: { requestId: request.id } }), 2);
  assert.equal(await prisma.operationalRequestOutboxEvent.count(), 1);
});

test('Billing GET 500 : erreur de dépendance, aucune liaison ni écriture métier', { concurrency: false }, async (t) => {
  const { prisma, request, link } = await setup(t, {
    creationStatus: 500, lookupStatus: 500, voucherExists: true,
    message: 'Billing temporairement indisponible.',
  });
  const response = await link();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    success: false, message: 'Impossible de vérifier le bon de caisse dans Billing.',
  });
  await assertUnlinked(prisma, request);
});

const webScenarios = [
  { label: 'Billing POST 200 puis liaison', creationStatus: 200, voucherExists: true, links: true },
  { label: 'Billing POST 409 + un bon : reprise idempotente', creationStatus: 409, voucherExists: true, links: true },
  { label: 'Billing POST 409 + aucun bon : message Billing original', creationStatus: 409, voucherExists: false, links: false },
  { label: 'Billing POST 500 : erreur propagée, aucune liaison', creationStatus: 500, voucherExists: true, links: false },
] as const;

for (const scenario of webScenarios) {
  test(`Parcours web réel — ${scenario.label}`, { concurrency: false }, async (t) => {
    const message = scenario.creationStatus === 409
      ? 'Billing : période comptable fermée pour ce règlement.'
      : 'Billing temporairement indisponible.';
    const { prisma, request, voucher, billing, headers, calls, web } = await setup(t, { ...scenario, message });
    const flow = await web();
    t.after(flow.close);
    // Use the real detail endpoint: no fabricated frontend request/ORM response.
    const current = await flow.get(request.id);
    assert.equal(current.status, 'APPROVED');
    const selection = {
      paymentMethod: 'ESPECES' as const,
      treasuryAccountId: randomUUID(),
      counterpartAccountId: randomUUID(),
    };
    const run = () => flow.run({ request: current, selection });
    if (scenario.links) {
      assert.deepEqual(await run(), { success: true });
    } else {
      await assert.rejects(run, (error: unknown) => {
        assert.ok(error && typeof error === 'object' && 'status' in error && 'message' in error);
        assert.equal(error.status, scenario.creationStatus);
        if (scenario.creationStatus === 409) {
          assert.equal(error.message, message);
          assert.doesNotMatch(String(error.message), /introuvable|Ressource non trouvée/i);
        }
        return true;
      });
    }
    const persisted = await prisma.operationalRequest.findUniqueOrThrow({ where: { id: request.id } });
    assert.equal(persisted.status, scenario.links ? 'CASH_VOUCHER_CREATED' : 'IN_FINANCIAL_PROCESS');
    assert.equal(persisted.cashVoucherId, scenario.links ? voucher.id : null);
    assert.equal(persisted.cashVoucherNumber, scenario.links ? voucher.voucherNumber : null);
    const logs = await prisma.operationalRequestLog.findMany({ where: { requestId: request.id } });
    assert.equal(logs.filter((log) => log.action === 'FINANCIAL_PROCESSING_STARTED').length, 1);
    assert.equal(logs.filter((log) => log.action === 'CASH_VOUCHER_LINKED').length, scenario.links ? 1 : 0);
    assert.equal(await prisma.operationalRequestOutboxEvent.count(), scenario.links ? 1 : 0);
    assert.deepEqual(billing.calls.map((call) => call.method), scenario.creationStatus === 500 ? ['POST'] : ['POST', 'GET']);
    assert.equal(billing.calls[0].path, '/api/cash-vouchers');
    assert.equal(billing.calls[0].authorization, headers.Authorization);
    assert.equal(billing.calls[0].enterpriseId, headers['X-Enterprise-Id']);
    const sent = billing.calls[0].body as Record<string, unknown>;
    assert.equal(sent.sourceType, 'OPERATIONAL_REQUEST');
    assert.equal(sent.sourceId, request.id);
    assert.equal(sent.sourceNumber, request.requestNumber);
    assert.equal(sent.enterpriseId, request.enterpriseId);
    assert.equal(sent.amountTTC, Number(request.amountApproved));
    assert.equal(sent.treasuryAccountId, selection.treasuryAccountId);
    assert.equal(sent.counterpartAccountId, selection.counterpartAccountId);
    if (billing.calls.length === 2) {
      assert.deepEqual(billing.calls[1].query, {
        enterpriseId: String(request.enterpriseId), sourceId: request.id, sourceType: 'OPERATIONAL_REQUEST',
      });
    }
    const transitions = calls.filter((call) => call.method === 'POST' && call.path.startsWith('/api/operational-requests/'));
    assert.deepEqual(transitions.map((call) => [call.path, call.status]), [
      [`/api/operational-requests/${request.id}/financial-processing`, 200],
      ...(scenario.creationStatus === 500 ? [] : [
        [`/api/operational-requests/${request.id}/cash-voucher`, scenario.links ? 200 : 404],
      ]),
    ]);
  });
}
