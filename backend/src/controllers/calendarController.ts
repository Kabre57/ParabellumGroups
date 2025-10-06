import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

/* =========================================================
   Helpers génériques
   ========================================================= */

// Parse une fenêtre [startDate, endDate] depuis la query.
// end est rendu inclusif en ajoutant +1 jour pour couvrir toute la journée.
function parseWindow(req: AuthenticatedRequest) {
  const startDateRaw = req.query.startDate as string | undefined;
  const endDateRaw = req.query.endDate as string | undefined;

  if (!startDateRaw || !endDateRaw) {
    return { ok: false as const, message: 'startDate et endDate sont requis (format ISO: YYYY-MM-DD)' };
  }
  const start = new Date(startDateRaw);
  const end = new Date(endDateRaw);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false as const, message: 'startDate ou endDate invalide' };
  }
  if (start > end) {
    return { ok: false as const, message: 'startDate doit être antérieure ou égale à endDate' };
  }
  const endInclusive = new Date(end);
  endInclusive.setDate(endInclusive.getDate() + 1);

  return { ok: true as const, start, end: endInclusive };
}

// Normalise l’id user depuis req.user (tes types exposent `userId`)
function getUserId(req: AuthenticatedRequest) {
  const uid = (req.user as any)?.userId ?? (req.user as any)?.id;
  if (!uid || typeof uid !== 'number') return null;
  return uid as number;
}

/* =========================================================
   RBAC: construction d’une clause where basée sur le rôle
   IMPORTANT: on NE référence PAS "intervention" (qui n'existe pas
   dans CalendarEvent), on filtre via le calendrier relié et/ou createdBy.
   - EMPLOYEE: voit ses events (calendar.userId = userId) + events qu’il a créés
   - SERVICE_MANAGER / GENERAL_DIRECTOR: events des users de son service (si serviceId disponible)
   - ADMIN: pas de filtre (retourne objet vide)
   NOTE: nécessite que UserCalendar possède bien "userId" et que la relation
   user -> serviceId existe (sinon retirer la branche service).
   ========================================================= */
function buildCalendarRoleWhere(req: AuthenticatedRequest) {
  const role = (req.user as any)?.role as string | undefined;
  const userId = getUserId(req);
  const serviceId = (req.user as any)?.serviceId as number | undefined;

  // Admin => pas de restriction
  if (role === 'ADMIN') return {};

  // Employé => ses événements (calendrier lui appartenant) OU qu’il a créés
  if (role === 'EMPLOYEE' && userId) {
    return {
      OR: [
        { calendar: { is: { userId } } }, // UserCalendar.userId == userId
        { createdBy: userId }
      ]
    };
  }

  // Manager / DG => événements des users de son service (si serviceId existe)
  if ((role === 'SERVICE_MANAGER' || role === 'GENERAL_DIRECTOR') && serviceId) {
    return {
      OR: [
        { calendar: { is: { user: { serviceId } } } },
        // Bonus: inclure en plus ses propres events s’il a aussi un calendrier
        userId ? { createdBy: userId } : undefined
      ].filter(Boolean)
    };
  }

  // Par défaut, si on a un userId, on limite au calendrier + createdBy (comportement sûr)
  if (userId) {
    return {
      OR: [
        { calendar: { is: { userId } } },
        { createdBy: userId }
      ]
    };
  }

  // Fallback: aucune info d’auth claire — on renvoie un where vide (les middlewares auth doivent protéger)
  return {};
}

// Construit la partie "chevauchement de dates" pour CalendarEvent
function buildDateOverlapWhere(start: Date, end: Date) {
  return {
    OR: [
      { startTime: { gte: start, lte: end } },                                  // commence dans la fenêtre
      { endTime: {   gte: start, lte: end } },                                  // finit dans la fenêtre
      { AND: [{ startTime: { lte: start } }, { endTime: { gte: end } }] }       // couvre entièrement la fenêtre
    ]
  };
}

/* =========================================================
   CONTROLLERS
   ========================================================= */

export const getCalendarWithTimeOffs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Récup id utilisateur authentifié
    const authUserId = getUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Fenêtre de dates
    const win = parseWindow(req);
    if (!win.ok) {
      return res.status(400).json({ success: false, message: win.message });
    }
    const { start, end } = win;

    // Filtre RBAC (selon rôle)
    const roleWhere = buildCalendarRoleWhere(req);

    // Filtre spécifique via query ?userId=... (permet d’inspecter un calendrier précis si le rôle l’autorise)
    const queryUserId = req.query.userId ? Number(req.query.userId) : undefined;
    const explicitUserWhere = queryUserId
      ? { calendar: { is: { userId: queryUserId } } }
      : {};

    // Filtre date (chevauchement)
    const dateWhere = buildDateOverlapWhere(start, end);

    // includeTimeOffs (true par défaut)
    const includeTimeOffs = String(req.query.includeTimeOffs ?? 'true') !== 'false';

    // Requêtes parallèles
    const [events, timeOffs] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          AND: [
            roleWhere,
            explicitUserWhere,
            dateWhere
          ]
        },
        include: {
          calendar: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          creator:  { select: { id: true, firstName: true, lastName: true } }
        },
        orderBy: { startTime: 'asc' }
      }),

      includeTimeOffs
        ? prisma.timeOffRequest.findMany({
            where: {
              // si on demande un userId précis, limiter ses demandes
              ...(queryUserId ? { calendar: { is: { userId: queryUserId } } } : {}),
              OR: [
                { startDate: { gte: start, lte: end } },
                { endDate:   { gte: start, lte: end } },
                { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] }
              ]
            },
            include: {
              calendar: {
                include: {
                  user: { select: { id: true, firstName: true, lastName: true } }
                }
              }
            },
            orderBy: { startDate: 'asc' }
          })
        : []
    ]);

    // On expose les time-off sous forme d’événements (si demandé), pour unifier l’affichage côté front
    const timeOffEvents = (includeTimeOffs ? timeOffs : []).map((timeOff) => ({
      id: `timeoff-${timeOff.id}`,
      title: `Time Off - ${timeOff.type}`,
      description: timeOff.reason ?? null,
      startTime: timeOff.startDate,
      endTime: timeOff.endDate,
      type: 'TIMEOFF' as const,
      priority: timeOff.status === 'APPROVED' ? 'high' : 'medium',
      isAllDay: true,
      location: null as string | null,
      reminder: null as Date | null,
      calendarId: timeOff.calendarId,
      createdBy: null as number | null,
      createdAt: timeOff.createdAt,
      updatedAt: timeOff.updatedAt,
      calendar: timeOff.calendar,
      creator: null,
      timeOffData: timeOff,
      isTimeOff: true
    }));

    const allEvents = [...events, ...timeOffEvents];

    return res.json({
      success: true,
      data: {
        events: allEvents,
        timeOffs: includeTimeOffs ? timeOffs : []
      }
    });
  } catch (error) {
    console.error('Erreur lors de la recuperation du calendrier:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

export const createEvent = async (req: AuthenticatedRequest, res: Response) => {
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
      title,
      description,
      startTime,
      endTime,
      type,
      priority,
      isAllDay,
      location,
      reminder,
      calendarId
    } = req.body;

    // Vérifier que le calendrier existe
    const calendar = await prisma.userCalendar.findUnique({ where: { id: Number(calendarId) } });
    if (!calendar) {
      return res.status(404).json({ success: false, message: 'Calendrier non trouvé' });
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        type,
        priority: priority || 'medium',
        isAllDay: isAllDay || false,
        location,
        reminder: reminder ? new Date(reminder) : null,
        calendarId: Number(calendarId),
        createdBy: getUserId(req) ?? null
      },
      include: {
        calendar: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } }
          }
        },
        creator: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    return res.status(201).json({
      success: true,
      data: event,
      message: 'Événement créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

export const getEvents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Fenêtre optionnelle
    let dateWhere: any = undefined;
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      const endInclusive = new Date(end);
      endInclusive.setDate(endInclusive.getDate() + 1);
      dateWhere = buildDateOverlapWhere(start, endInclusive);
    }

    // RBAC
    const roleWhere = buildCalendarRoleWhere(req);

    // Type
    const typeWhere = type ? { type } : {};

    const whereClause = {
      AND: [
        roleWhere,
        dateWhere,
        typeWhere
      ].filter(Boolean)
    };

    const [events, total] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: whereClause,
        include: {
          calendar: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          creator:  { select: { id: true, firstName: true, lastName: true } }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { startTime: 'asc' }
      }),
      prisma.calendarEvent.count({ where: whereClause })
    ]);

    return res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

export const getEventById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.calendarEvent.findUnique({
      where: { id: Number(id) },
      include: {
        calendar: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        },
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    return res.json({ success: true, data: event });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

export const updateEvent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const existingEvent = await prisma.calendarEvent.findUnique({ where: { id: Number(id) } });
    if (!existingEvent) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    const {
      title,
      description,
      startTime,
      endTime,
      type,
      priority,
      isAllDay,
      location,
      reminder
    } = req.body;

    const event = await prisma.calendarEvent.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        type,
        priority,
        isAllDay,
        location,
        reminder: reminder ? new Date(reminder) : null
      },
      include: {
        calendar: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }
      }
    });

    return res.json({
      success: true,
      data: event,
      message: 'Événement mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

export const deleteEvent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingEvent = await prisma.calendarEvent.findUnique({ where: { id: Number(id) } });
    if (!existingEvent) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    await prisma.calendarEvent.delete({ where: { id: Number(id) } });

    return res.json({ success: true, message: 'Événement supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/* =========================================================
   Validation (create / update)
   ========================================================= */
export const validateEvent = [
  body('title').notEmpty().withMessage('Titre requis'),
  body('startTime').isISO8601().withMessage('Date de début invalide'),
  body('endTime').isISO8601().withMessage('Date de fin invalide'),
  body('calendarId').isInt({ min: 1 }).withMessage('Calendrier requis'),
  body('type')
    .isIn(['MEETING', 'TASK', 'APPOINTMENT', 'REMINDER', 'OTHER', 'MISSION', 'INTERVENTION', 'TIMEOFF'])
    .withMessage('Type d\'événement invalide')
];
