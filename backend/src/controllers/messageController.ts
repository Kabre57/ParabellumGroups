// src/controllers/messageController.ts
import { Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

/**
 * ✅ Pour éviter les erreurs Prisma P2022/P2003 dues à des orderBy dynamiques :
 * On whiteliste les champs autorisés et on retombe sur un default sûr.
 */
const SORTABLE: Record<string, keyof Prisma.MessageOrderByWithRelationInput> = {
  sentAt: 'sentAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  subject: 'subject',
  isRead: 'isRead',
  status: 'status',
  priority: 'priority',
};

function buildOrderBy(query: any): Prisma.MessageOrderByWithRelationInput {
  const tri = typeof query.sort === 'string' ? query.sort : 'sentAt';
  const dir = query.dir === 'asc' ? 'asc' : 'desc';

  const key = SORTABLE[tri] ?? 'sentAt';
  return { [key]: dir } as Prisma.MessageOrderByWithRelationInput;
}

/**
 * Include commun pour tous les fetchs de messages.
 * ⚠️ Après migration Prisma, faire `npx prisma generate`.
 */
const baseInclude = {
  sender: { select: { id: true, firstName: true, lastName: true, email: true, service: true } },
  recipient: { select: { id: true, firstName: true, lastName: true, email: true, service: true } },
  attachments: true,
  _count: { select: { replies: true } },
} satisfies Prisma.MessageInclude;

/**
 * GET /messages
 * Liste paginée des messages où l’utilisateur est expéditeur OU destinataire,
 * avec recherche et filtres (status, priority, type) du nouveau schéma.
 */
export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    const offset = (page - 1) * limit;

    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const priority = typeof req.query.priority === 'string' ? req.query.priority : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;

    const whereBase: Prisma.MessageWhereInput = {
      OR: [{ senderId: req.user!.userId }, { recipientId: req.user!.userId }],
    };

    const andFilters: Prisma.MessageWhereInput[] = [];

    if (search) {
      andFilters.push({
        OR: [
          { subject: { contains: search, mode: 'insensitive' } },
          { body: { contains: search, mode: 'insensitive' } }, // ← corps du message
        ],
      });
    }

    if (status) andFilters.push({ status });
    if (priority) andFilters.push({ priority });
    if (type) andFilters.push({ type });

    const where: Prisma.MessageWhereInput =
      andFilters.length ? { AND: [whereBase, ...andFilters] } : whereBase;

    const orderBy = buildOrderBy(req.query);

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: baseInclude as any, // “as any” au cas où le client TS n'est pas régénéré
        skip: offset,
        take: limit,
        orderBy,
      }),
      prisma.message.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        messages,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des messages:', err);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * GET /messages/:id
 */
export const getMessageById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);

    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        ...baseInclude,
        replies: {
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        parentMessage: { select: { id: true, subject: true } },
      } as any,
    });

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message non trouvé' });
    }
    if (message.senderId !== req.user!.userId && message.recipientId !== req.user!.userId) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé à ce message' });
    }

    return res.json({ success: true, data: message });
  } catch (err) {
    console.error('Erreur lors de la récupération du message:', err);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * POST /messages
 */
export const createMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }

    const { recipientId, subject, body: contentBody, priority, type, attachments } = req.body as {
      recipientId: number; subject?: string | null; body: string; priority?: string; type?: string; attachments?: any[];
    };

    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Destinataire non trouvé' });
    }

    const created = await prisma.message.create({
      data: {
        senderId: req.user!.userId,
        recipientId,
        subject: subject ?? null,
        body: contentBody,
        priority: priority ?? 'normal',
        type: type ?? 'internal',
        ...(attachments?.length
          ? {
              attachments: {
                create: attachments.map((att) => ({
                  filename: att.filename,
                  url: att.url,
                  size: att.size ?? null,
                  mimeType: att.mimeType ?? null,
                })),
              },
            }
          : {}),
      },
      include: baseInclude as any,
    });

    // Notification
    const sender = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { firstName: true, lastName: true },
    });

    await prisma.notification.create({
      data: {
        type: 'message',
        message: `Nouveau message de ${sender?.firstName ?? ''} ${sender?.lastName ?? ''}: ${subject ?? ''}`.trim(),
        data: JSON.stringify({ messageId: created.id, priority: created.priority }),
        userId: recipientId,
      },
    });

    return res.status(201).json({ success: true, data: created, message: 'Message envoyé avec succès' });
  } catch (err) {
    console.error('Erreur lors de la création du message:', err);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * PATCH /messages/:id/read
 */
export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const msg = await prisma.message.findUnique({ where: { id } });
    if (!msg) return res.status(404).json({ success: false, message: 'Message non trouvé' });

    if (msg.recipientId !== req.user!.userId) {
      return res.status(403).json({ success: false, message: 'Seul le destinataire peut marquer comme lu' });
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { isRead: true, readAt: new Date(), status: 'read' },
    });

    return res.json({ success: true, data: updated, message: 'Message marqué comme lu' });
  } catch (err) {
    console.error('Erreur lors du marquage du message:', err);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * PATCH /messages/:id/archive
 */
export const archiveMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const msg = await prisma.message.findUnique({ where: { id } });
    if (!msg) return res.status(404).json({ success: false, message: 'Message non trouvé' });

    if (msg.senderId !== req.user!.userId && msg.recipientId !== req.user!.userId) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { status: 'archived', archivedAt: new Date() },
    });

    return res.json({ success: true, data: updated, message: 'Message archivé' });
  } catch (err) {
    console.error("Erreur lors de l'archivage du message:", err);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * POST /messages/:id/reply
 */
export const replyToMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { body: contentBody } = req.body as { body: string };

    const parent = await prisma.message.findUnique({
      where: { id },
      include: { sender: true },
    });
    if (!parent) return res.status(404).json({ success: false, message: 'Message original non trouvé' });

    const reply = await prisma.message.create({
      data: {
        senderId: req.user!.userId,
        recipientId: parent.senderId,
        subject: parent.subject ? `Re: ${parent.subject}` : null,
        body: contentBody,
        priority: parent.priority,
        type: parent.type,
        parentMessageId: id,
      },
      include: {
        sender: { select: { firstName: true, lastName: true } },
        recipient: { select: { firstName: true, lastName: true } },
        attachments: true,
      } as any,
    });

    await prisma.message.update({ where: { id }, data: { status: 'replied' } });

    const sender = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { firstName: true, lastName: true },
    });

    await prisma.notification.create({
      data: {
        type: 'message_reply',
        message: `Réponse de ${sender?.firstName ?? ''} ${sender?.lastName ?? ''} à votre message`,
        data: JSON.stringify({ messageId: reply.id, originalMessageId: id }),
        userId: parent.senderId,
      },
    });

    return res.status(201).json({ success: true, data: reply, message: 'Réponse envoyée avec succès' });
  } catch (err) {
    console.error('Erreur lors de la réponse au message:', err);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

// ── Validations ────────────────────────────────────────────────────────────────
export const validateMessage = [
  body('recipientId').isInt().withMessage('Destinataire requis'),
  body('body').notEmpty().withMessage('Contenu requis'),
  body('subject').optional().isString(),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Priorité invalide'),
  body('type').optional().isIn(['internal', 'external', 'system']).withMessage('Type invalide'),
];

export const validateReply = [body('body').notEmpty().withMessage('Contenu requis')];
