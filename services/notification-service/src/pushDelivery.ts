import { createHmac } from 'crypto';
import { sendExpoPushNotification } from './expoPush';

type PushToken = { token: string; platform: string };
type OperationalNotification = {
  userId: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
};

const createServiceToken = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required for internal auth-service calls.');
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    serviceName: 'notification-service',
    iss: 'parabellum-notification-service',
    iat: now,
    exp: now + 60,
  });
  const unsigned = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
};

export async function sendPushNotificationToUser(notification: OperationalNotification): Promise<void> {
  const userId = String(notification.userId || '').trim();
  const link = notification.data?.link;
  const enterpriseId = Number(notification.data?.enterpriseId);
  if (!userId || typeof link !== 'string' || !Number.isSafeInteger(enterpriseId) || enterpriseId <= 0) return;
  const authServiceUrl = String(process.env.AUTH_SERVICE_URL || 'http://auth-service:4001').replace(/\/$/, '');
  const response = await fetch(`${authServiceUrl}/api/internal/push-tokens/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${createServiceToken()}` },
  });
  if (!response.ok) throw new Error(`Auth service push-token lookup returned ${response.status}`);
  const payload = await response.json() as { data?: PushToken[] };
  const tokens = Array.isArray(payload.data) ? payload.data : [];

  await Promise.all(tokens.map(({ token }) => sendExpoPushNotification({
    to: token,
    title: notification.title,
    body: notification.message,
    sound: 'default',
    channelId: 'operational-requests',
    priority: 'high',
    data: { link, enterpriseId },
  })));
}
