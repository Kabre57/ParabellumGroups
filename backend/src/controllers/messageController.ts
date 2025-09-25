import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, status, priority, type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {
      OR: [
        { senderId: req.user!.userId },
        { recipientId: req.user!.userId }
      ]
    };

    if (search) {
      whereClause.AND = [
        whereClause.OR ? { OR: whereClause.OR } : {},
        {
          OR: [
            { subject: { contains: search as string, mode: 'insensitive' } },
            { content: { contains: search as string, mode: 'insensitive' } }
          ]
        }
      ];
      delete whereClause.OR;
    }

    if (status) {
      whereClause.status = status;
    }

    if (priority) {
      whereClause.priority = priority;
    }

    if (type) {
      whereClause.type = type;
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: whereClause,
        include: {
          sender: {
            select: { firstName: true, lastName: true, email: true, service: true }
          },
          recipient: {
            select: { firstName: true, lastName: true, email: true, service: true }
          },
          attachments: true,
          _count: {
            select: { replies: true }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.message.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getMessageById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const message = await prisma.message.findUnique({
      where: { id: Number(id) },
      include: {
        sender: {
          select: { firstName: true, lastName: true, email: true, service: true }
        },
        recipient: {
          select: { firstName: true, lastName: true, email: true, service: true }
        },
        attachments: true,
        replies: {
          include: {
            sender: {
              select: { firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        parentMessage: {
          select: { id: true, subject: true }
        }
      }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    // Vérifier que l'utilisateur peut accéder à ce message
    if (message.senderId !== req.user!.userId && message.recipientId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce message'
      });
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const {
      recipientId,
      subject,
      content,
      priority,
      type,
      attachments
    } = req.body;

    // Vérifier que le destinataire existe
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId }
    });

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Destinataire non trouvé'
      });
    }

    const message = await prisma.message.create({
      data: {
        senderId: req.user!.userId,
        recipientId,
        subject,
        content,
        priority: priority || 'normal',
        type: type || 'internal',
        attachments: attachments ? {
          create: attachments.map((att: any) => ({
            filename: att.filename,
            url: att.url,
            size: att.size,
            mimeType: att.mimeType
          }))
        } : undefined
      },
      include: {
        sender: {
          select: { firstName: true, lastName: true, email: true }
        },
        recipient: {
          select: { firstName: true, lastName: true, email: true }
        },
        attachments: true
      }
    });

    // Créer une notification pour le destinataire
    await prisma.notification.create({
      data: {
        type: 'message',
        message: `Nouveau message de ${req.user!.firstName} ${req.user!.lastName}: ${subject}`,
        data: JSON.stringify({ messageId: message.id, priority }),
        userId: recipientId
      }
    });

    res.status(201).json({
      success: true,
      data: message,
      message: 'Message envoyé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const message = await prisma.message.findUnique({
      where: { id: Number(id) }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    // Seul le destinataire peut marquer comme lu
    if (message.recipientId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        message: 'Seul le destinataire peut marquer ce message comme lu'
      });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: Number(id) },
      data: {
        status: 'read',
        readAt: new Date()
      }
    });

    res.json({
      success: true,
      data: updatedMessage,
      message: 'Message marqué comme lu'
    });
  } catch (error) {
    console.error('Erreur lors du marquage du message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const archiveMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const message = await prisma.message.findUnique({
      where: { id: Number(id) }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    // Vérifier les permissions
    if (message.senderId !== req.user!.userId && message.recipientId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: Number(id) },
      data: {
        status: 'archived',
        archivedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: updatedMessage,
      message: 'Message archivé'
    });
  } catch (error) {
    console.error('Erreur lors de l\'archivage du message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const replyToMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const originalMessage = await prisma.message.findUnique({
      where: { id: Number(id) },
      include: {
        sender: true
      }
    });

    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message original non trouvé'
      });
    }

    // Créer la réponse
    const reply = await prisma.message.create({
      data: {
        senderId: req.user!.userId,
        recipientId: originalMessage.senderId,
        subject: `Re: ${originalMessage.subject}`,
        content,
        priority: originalMessage.priority,
        type: originalMessage.type,
        parentMessageId: Number(id)
      },
      include: {
        sender: {
          select: { firstName: true, lastName: true }
        },
        recipient: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    // Marquer le message original comme répondu
    await prisma.message.update({
      where: { id: Number(id) },
      data: { status: 'replied' }
    });

    // Créer une notification
    await prisma.notification.create({
      data: {
        type: 'message_reply',
        message: `Réponse de ${req.user!.firstName} ${req.user!.lastName} à votre message`,
        data: JSON.stringify({ messageId: reply.id, originalMessageId: id }),
        userId: originalMessage.senderId
      }
    });

    res.status(201).json({
      success: true,
      data: reply,
      message: 'Réponse envoyée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la réponse au message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateMessage = [
  body('recipientId').isInt().withMessage('Destinataire requis'),
  body('subject').notEmpty().withMessage('Sujet requis'),
  body('content').notEmpty().withMessage('Contenu requis'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Priorité invalide'),
  body('type').optional().isIn(['internal', 'external', 'system']).withMessage('Type invalide')
];