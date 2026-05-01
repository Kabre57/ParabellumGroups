import { Request, Response } from 'express';
import prisma from '../prisma';
import nodemailer from 'nodemailer';
import notificationEmitter from '../emitter';

type MailTransporter = ReturnType<typeof nodemailer.createTransport>;

const isNotificationStorageUnavailable = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;

  const maybeError = error as { name?: string; message?: string; code?: string };
  const message = maybeError.message || '';
  const name = maybeError.name || '';

  return (
    name.includes('PrismaClientInitializationError') ||
    name.includes('PrismaClientKnownRequestError') ||
    message.includes('does not exist on the database server') ||
    message.includes("Can't reach database server") ||
    message.includes('ECONNREFUSED')
  );
};

const isSmtpEnabled = () => {
  const enabled = String(process.env.SMTP_ENABLED || '').trim().toLowerCase();
  if (['false', '0', 'no', 'off'].includes(enabled)) return false;
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && getSmtpPassword());
};

const getSmtpPassword = () => process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';

const getSmtpPort = () => parseInt(process.env.SMTP_PORT || '587', 10);

const isSecureSmtp = () => {
  const secureFlag = String(process.env.SMTP_SECURE || '').trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(secureFlag)) return true;
  if (['false', '0', 'no', 'off'].includes(secureFlag)) return false;
  return getSmtpPort() === 465;
};

const createMailTransporter = (): MailTransporter | null => {
  if (!isSmtpEnabled()) {
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: getSmtpPort(),
    secure: isSecureSmtp(),
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 5000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 5000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 8000),
    auth: {
      user: process.env.SMTP_USER,
      pass: getSmtpPassword(),
    },
  });

  (transporter as any).on?.('error', (error: Error) => {
    console.error('SMTP transporter error:', error.message);
  });

  return transporter;
};

const transporter = createMailTransporter();

const sendEmailNotification = async (email: string, title: string, message: string) => {
  if (!transporter) {
    console.warn('SMTP disabled or incomplete configuration; email notification skipped.');
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@parabellumgroups.com',
      to: email,
      subject: title,
      html: `
        <h2>${title}</h2>
        <p>${message}</p>
      `,
    });
  } catch (emailError) {
    console.error('Email sending error:', emailError);
  }
};

export const sendNotification = async (req: Request, res: Response) => {
  try {
    const { userId, type, title, message, email } = req.body;

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
      },
    });

    // Push to SSE listeners
    notificationEmitter.emit('notification', { userId, notification });

    if (email) {
      await sendEmailNotification(email, title, message);
    }

    res.status(201).json(notification);
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { isRead } = req.query;

    const where: any = { userId };
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: 50, // Limiter à 50 notifications
      }),
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
    ]);

    const payload = {
      success: true,
      data: notifications.map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        read: n.isRead,
        createdAt: n.createdAt,
        link: (n.data as any)?.link || undefined,
      })),
      unreadCount,
    };

    // Emit state sync (non-blocking) for SSE subscribers
    notificationEmitter.emit('notification', {
      userId,
      notification: { type: 'STATE_SYNC', unreadCount, items: payload.data },
    });

    res.json(payload);
  } catch (error) {
    console.error('Get notifications error:', error);
    if (isNotificationStorageUnavailable(error)) {
      return res.json({
        success: true,
        data: [],
        unreadCount: 0,
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    notificationEmitter.emit('notification', { userId: notification.userId, notification });

    res.json(notification);
  } catch (error) {
    console.error('Mark as read error:', error);
    if (isNotificationStorageUnavailable(error)) {
      return res.json({ message: 'Notification storage unavailable, operation skipped' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    notificationEmitter.emit('notification', {
      userId,
      notification: { type: 'ALL_READ' },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    if (isNotificationStorageUnavailable(error)) {
      return res.json({ message: 'Notification storage unavailable, operation skipped' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
