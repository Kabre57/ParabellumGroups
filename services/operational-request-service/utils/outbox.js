const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const getRecipients = async (req, enterpriseId, permission) => {
  const baseUrl = String(process.env.AUTH_SERVICE_URL || 'http://localhost:4001').replace(/\/$/, '');
  const response = await fetch(
    `${baseUrl}/api/operational-requests/recipients?enterpriseId=${encodeURIComponent(
      enterpriseId
    )}&permission=${encodeURIComponent(permission)}`,
    {
      headers: { Authorization: `Bearer ${req.token}` },
    }
  );
  if (!response.ok) {
    throw Object.assign(new Error('Impossible de trouver les intervenants autorisés.'), { statusCode: 503 });
  }
  const payload = await response.json();
  return Array.isArray(payload?.data) ? payload.data.map((item) => String(item.id)) : [];
};

const enqueueNotifications = async (tx, { request, recipients, title, message, action }) => {
  const data = [...new Set(recipients.filter(Boolean).map(String))].map((userId) => ({
    userId,
    idempotencyKey: `${request.id}:${action}:${userId}:${crypto.randomUUID()}`,
    payload: {
      userId,
      title,
      message,
      type: 'INFO',
      data: { link: `/dashboard/demandes-operationnelles?request=${request.id}` },
    },
  }));
  if (data.length) {
    // Each key already contains a fresh UUID; skipDuplicates is unnecessary and
    // unsupported by SQLite, used by the real-database integration harness.
    await tx.operationalRequestOutboxEvent.createMany({ data });
  }
};

const dispatchOutbox = async (prisma) => {
  const events = await prisma.operationalRequestOutboxEvent.findMany({
    where: { deliveredAt: null, nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  for (const event of events) {
    try {
      const token = jwt.sign(
        {
          userId: 'operational-request-service',
          role: 'SERVICE',
          roleCode: 'SERVICE',
          serviceName: 'operational-request-service',
        },
        process.env.JWT_SECRET,
        { issuer: 'parabellum-operational-request-service', expiresIn: '2m' }
      );
      const response = await fetch(
        `${String(process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:4012').replace(/\/$/, '')}/internal/notifications`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...event.payload, idempotencyKey: event.idempotencyKey }),
        }
      );
      if (!response.ok) throw new Error(`notifications-service returned ${response.status}`);
      await prisma.operationalRequestOutboxEvent.update({
        where: { id: event.id },
        data: { deliveredAt: new Date(), lastError: null, attempts: { increment: 1 } },
      });
    } catch (error) {
      const attempts = event.attempts + 1;
      const delaySeconds = Math.min(3600, 5 * (2 ** Math.min(attempts, 9)));
      await prisma.operationalRequestOutboxEvent.update({
        where: { id: event.id },
        data: {
          attempts,
          lastError: String(error.message || error).slice(0, 500),
          nextAttemptAt: new Date(Date.now() + delaySeconds * 1000),
        },
      });
    }
  }
};

module.exports = {
  getRecipients,
  enqueueNotifications,
  dispatchOutbox,
};
