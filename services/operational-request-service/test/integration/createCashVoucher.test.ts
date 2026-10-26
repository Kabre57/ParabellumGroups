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

type CreateResponse = {
  success: boolean;
  message?: string;
  data?: { id: string; status: string; cashVoucherId: string | null };
};

type SetupOptions = Omit<BillingStubOptions, 'vouchers'> & {
  voucherExists: boolean;
  initialStatus?: 'APPROVED' | 'IN_FINANCIAL_PROCESS';
  voucherStatus?: BillingVoucher['status'];
};

const TREASURY_ACCOUNT_ID = randomUUID();

// Séquentiel : les clients de production lisent les URL inter-services dans process.env.
// Seules les frontières HTTP Auth/Billing sont des stubs ; routes, permissions,
// contrôleur, transactions Prisma, logs et outbox s'exécutent tels quels.
async function setup(t: TestContext, options: SetupOptions) {
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
      status: options.initialStatus ?? 'APPROVED',
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
    status: options.voucherStatus ?? 'BROUILLON',
    sourceType: 'OPERATIONAL_REQUEST',
    sourceId: request.id,
    enterpriseId: request.enterpriseId,
    amountTTC: request.amountApproved?.toString(),
  };
  const { voucherExists, initialStatus: _initial, voucherStatus: _status, ...stubOptions } = options;
  const billing = await startBillingStub({ ...stubOptions, vouchers: voucherExists ? [voucher] : [] });
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
  app.use(express.json());
  app.get('/api/enterprises', (_req, res) => res.json({
    success: true,
    data: [{ id: request.enterpriseId, name: request.enterpriseName, isActive: true }],
  }));
  app.use('/api/operational-requests', routerModule.createOperationalRequestRouter(prisma));
  const service = await startHttpServer(app);
  t.after(service.close);
  process.env.AUTH_SERVICE_URL = service.baseUrl;
  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Enterprise-Id': String(request.enterpriseId),
    'Content-Type': 'application/json',
  };
  const create = () => fetch(`${service.baseUrl}/api/operational-requests/${request.id}/create-cash-voucher`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ paymentMethod: 'ESPECES', treasuryAccountId: TREASURY_ACCOUNT_ID }),
    signal: AbortSignal.timeout(10_000),
  });
  return { prisma, request, voucher, billing, create };
}

type TestPrisma = Awaited<ReturnType<typeof createTestPrisma>>;

async function assertUntouched(prisma: TestPrisma, request: OperationalRequest) {
  const persisted = await prisma.operationalRequest.findUniqueOrThrow({ where: { id: request.id } });
  assert.equal(persisted.status, request.status);
  assert.equal(persisted.cashVoucherId, null);
  assert.equal(persisted.cashVoucherNumber, null);
  assert.equal(persisted.updatedAt.getTime(), request.updatedAt.getTime());
  assert.equal(await prisma.operationalRequestLog.count({ where: { requestId: request.id } }), 0);
  assert.equal(await prisma.operationalRequestOutboxEvent.count(), 0);
}

async function logsOf(prisma: TestPrisma, request: OperationalRequest) {
  return prisma.operationalRequestLog.findMany({ where: { requestId: request.id }, orderBy: { createdAt: 'asc' } });
}

test('Test 1 — Billing 200 : 200, transitions APPROVED → IN_FINANCIAL_PROCESS → CASH_VOUCHER_CREATED, 2 logs, bon lié', { concurrency: false }, async (t) => {
  const { prisma, request, voucher, billing, create } = await setup(t, { creationStatus: 200, voucherExists: true });
  const response = await create();
  const body: CreateResponse = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.data?.status, 'CASH_VOUCHER_CREATED');
  assert.equal(body.data?.cashVoucherId, voucher.id);

  const persisted = await prisma.operationalRequest.findUniqueOrThrow({ where: { id: request.id } });
  assert.equal(persisted.status, 'CASH_VOUCHER_CREATED');
  assert.equal(persisted.cashVoucherId, voucher.id);
  assert.equal(persisted.cashVoucherNumber, voucher.voucherNumber);

  const logs = await logsOf(prisma, request);
  assert.deepEqual(logs.map((log) => [log.action, log.fromStatus, log.toStatus]).sort(), [
    ['CASH_VOUCHER_LINKED', 'IN_FINANCIAL_PROCESS', 'CASH_VOUCHER_CREATED'],
    ['FINANCIAL_PROCESSING_STARTED', 'APPROVED', 'IN_FINANCIAL_PROCESS'],
  ]);
  assert.equal(await prisma.operationalRequestOutboxEvent.count(), 1);

  // Seul le POST est nécessaire : le bon retourné par Billing est lié directement.
  assert.deepEqual(billing.calls.map((call) => call.method), ['POST']);
  const sent = billing.calls[0].body as Record<string, unknown>;
  assert.equal(sent.sourceId, request.id);
  assert.equal(sent.sourceType, 'OPERATIONAL_REQUEST');
  assert.equal(sent.paymentMethod, 'ESPECES');
  assert.equal(sent.treasuryAccountId, TREASURY_ACCOUNT_ID);
  assert.equal(sent.amountTTC, 25000);
  assert.equal(sent.status, 'BROUILLON');
});

test('Test 2 — Billing 409 + GET trouve un bon : 200, CASH_VOUCHER_CREATED, 2 logs', { concurrency: false }, async (t) => {
  const { prisma, request, voucher, billing, create } = await setup(t, {
    creationStatus: 409, voucherExists: true, message: 'Un bon existe déjà pour cette source.',
  });
  const response = await create();
  const body: CreateResponse = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.data?.cashVoucherId, voucher.id);
  const persisted = await prisma.operationalRequest.findUniqueOrThrow({ where: { id: request.id } });
  assert.equal(persisted.status, 'CASH_VOUCHER_CREATED');
  assert.equal(persisted.cashVoucherId, voucher.id);
  const logs = await logsOf(prisma, request);
  assert.deepEqual(logs.map((log) => log.action).sort(), ['CASH_VOUCHER_LINKED', 'FINANCIAL_PROCESSING_STARTED']);
  assert.deepEqual(billing.calls.map((call) => call.method), ['POST', 'GET']);
  assert.deepEqual(billing.calls[1].query, {
    enterpriseId: String(request.enterpriseId), sourceId: request.id, sourceType: 'OPERATIONAL_REQUEST',
  });
});

test('Test 2 bis — Billing 409 + bon décaissé, demande déjà IN_FINANCIAL_PROCESS : DISBURSED, seul CASH_VOUCHER_LINKED', { concurrency: false }, async (t) => {
  const { prisma, request, voucher, create } = await setup(t, {
    creationStatus: 409, voucherExists: true, initialStatus: 'IN_FINANCIAL_PROCESS', voucherStatus: 'DECAISSE',
  });
  const response = await create();
  assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
  const persisted = await prisma.operationalRequest.findUniqueOrThrow({ where: { id: request.id } });
  assert.equal(persisted.status, 'DISBURSED');
  assert.equal(persisted.cashVoucherId, voucher.id);
  assert.notEqual(persisted.disbursedAt, null);
  const logs = await logsOf(prisma, request);
  assert.deepEqual(logs.map((log) => [log.action, log.fromStatus, log.toStatus]), [
    ['CASH_VOUCHER_LINKED', 'IN_FINANCIAL_PROCESS', 'DISBURSED'],
  ]);
});

test('Test 3 — Billing 409 + GET vide : 502 avec le message Billing original, aucune écriture', { concurrency: false }, async (t) => {
  const message = 'Un bon de caisse existe déjà pour cette demande.';
  const { prisma, request, billing, create } = await setup(t, { creationStatus: 409, voucherExists: false, message });
  const response = await create();
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { success: false, message });
  await assertUntouched(prisma, request);
  assert.deepEqual(billing.calls.map((call) => call.method), ['POST', 'GET']);
});

test('Test 4 — Billing 500 : 502 avec le message Billing original, demande APPROVED, aucune écriture', { concurrency: false }, async (t) => {
  const message = 'Billing temporairement indisponible.';
  const { prisma, request, billing, create } = await setup(t, { creationStatus: 500, voucherExists: true, message });
  const response = await create();
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { success: false, message });
  await assertUntouched(prisma, request);
  assert.equal(request.status, 'APPROVED');
  // Pas de reprise par GET hors 409.
  assert.deepEqual(billing.calls.map((call) => call.method), ['POST']);
});
