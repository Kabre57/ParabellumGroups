const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const EVENT_SOURCE = 'procurement-service';
const DISPATCH_INTERVAL_MS = parseInt(process.env.PROCUREMENT_OUTBOX_INTERVAL_MS || '5000', 10);
const RETRY_BASE_DELAY_MS = parseInt(process.env.PROCUREMENT_OUTBOX_RETRY_MS || '15000', 10);
const BATCH_SIZE = parseInt(process.env.PROCUREMENT_OUTBOX_BATCH_SIZE || '20', 10);
const BILLING_EVENTS_URL = process.env.BILLING_EVENTS_URL || 'http://billing-service:4010/api/internal/procurement-events';
const EVENT_SECRET = process.env.PROCUREMENT_EVENT_SECRET || 'procurement-billing-shared-secret';

let dispatcherStarted = false;
let dispatcherHandle = null;

const buildEnvelope = (event) => ({
  eventId: event.id,
  eventType: event.eventType,
  occurredAt: event.createdAt,
  source: EVENT_SOURCE,
  version: 1,
  correlationId: event.correlationId || null,
  payload: event.payload,
});

const enqueueProcurementEvent = async (tx, params) =>
  tx.procurementOutboxEvent.create({
    data: {
      eventType: params.eventType,
      aggregateType: params.aggregateType,
      aggregateId: params.aggregateId,
      correlationId: params.correlationId || null,
      payload: params.payload,
    },
  });

const computeNextAttemptAt = (attempts) =>
  new Date(Date.now() + Math.max(1, attempts) * RETRY_BASE_DELAY_MS);

const dispatchEvent = async (event) => {
  const response = await fetch(BILLING_EVENTS_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-event-secret': EVENT_SECRET,
    },
    body: JSON.stringify(buildEnvelope(event)),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Billing event dispatch failed with status ${response.status}: ${body}`);
  }
};

const flushOutboxBatch = async () => {
  const now = new Date();
  const pending = await prisma.procurementOutboxEvent.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      nextAttemptAt: { lte: now },
    },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  });

  for (const event of pending) {
    const claimed = await prisma.procurementOutboxEvent.updateMany({
      where: {
        id: event.id,
        status: { in: ['PENDING', 'FAILED'] },
      },
      data: {
        status: 'PROCESSING',
      },
    });

    if (claimed.count === 0) {
      continue;
    }

    try {
      await dispatchEvent(event);

      await prisma.procurementOutboxEvent.update({
        where: { id: event.id },
        data: {
          status: 'SENT',
          publishedAt: new Date(),
          lastError: null,
        },
      });
    } catch (error) {
      await prisma.procurementOutboxEvent.update({
        where: { id: event.id },
        data: {
          status: 'FAILED',
          attempts: { increment: 1 },
          nextAttemptAt: computeNextAttemptAt((event.attempts || 0) + 1),
          lastError: error.message.slice(0, 2000),
        },
      });
    }
  }
};

const startOutboxDispatcher = () => {
  if (dispatcherStarted) {
    return dispatcherHandle;
  }

  dispatcherStarted = true;
  dispatcherHandle = setInterval(() => {
    flushOutboxBatch().catch((error) => {
      console.error('Procurement outbox dispatch error:', error.message);
    });
  }, DISPATCH_INTERVAL_MS);

  return dispatcherHandle;
};

module.exports = {
  enqueueProcurementEvent,
  startOutboxDispatcher,
  buildEnvelope,
};
