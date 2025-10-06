import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

// Types pour le backend
type CalendarEventType = 
  | 'MEETING' 
  | 'INTERVENTION' 
  | 'MISSION' 
  | 'APPOINTMENT' 
  | 'REMINDER' 
  | 'TASK' 
  | 'TIMEOFF' 
  | 'OTHER';

type TimeOffType = 
  | 'VACATION' 
  | 'SICK_LEAVE' 
  | 'PERSONAL_DAY' 
  | 'MATERNITY_LEAVE' 
  | 'PATERNITY_LEAVE' 
  | 'BEREAVEMENT' 
  | 'OTHER';

type TimeOffStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'CANCELLED';

interface UnifiedEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  type: CalendarEventType;
  priority?: 'high' | 'medium' | 'low';
  isAllDay: boolean;
  location?: string;
  reminder?: string;
  source: 'CALENDAR_EVENT' | 'TIMEOFF' | 'INTERVENTION' | 'MISSION';
  originalData?: any;
  calendarId?: number;
  userId?: number;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  interventionData?: {
    missionId: string;
    statut: string;
    techniciens?: Array<{
      id: number;
      nom: string;
      prenom: string;
    }>;
  };
  timeOffData?: {
    type: TimeOffType;
    status: TimeOffStatus;
    reason?: string;
  };
}

/**
 * Récupère tous les événements unifiés pour une période
 */
export const getUnifiedCalendarEvents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      types,
      userIds,
      includeTimeOffs = 'true',
      includeInterventions = 'true',
      status
    } = req.query;

    // Validation des dates
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Les paramètres startDate et endDate sont requis'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    end.setDate(end.getDate() + 1); // Inclusivité

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Format de date invalide'
      });
    }

    // Construction des requêtes avec RBAC
    const promises = [];

    // Événements calendrier avec RBAC
    const calendarEventWhere: any = {
      startTime: { gte: start, lte: end },
      ...buildRBACWhere(req, userIds as string)
    };

    if (types) {
      calendarEventWhere.type = { in: types as any };
    }

    promises.push(
      prisma.calendarEvent.findMany({
        where: calendarEventWhere,
        include: {
          calendar: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  serviceId: true
                }
              }
            }
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { startTime: 'asc' }
      })
    );

    // Congés avec RBAC
    if (includeTimeOffs === 'true') {
      const timeOffWhere: any = {
        startDate: { gte: start, lte: end },
        calendar: buildRBACWhere(req, userIds as string)
      };

      if (status) {
        timeOffWhere.status = { in: status as any };
      }

      promises.push(
        prisma.timeOffRequest.findMany({
          where: timeOffWhere,
          include: {
            calendar: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                    serviceId: true
                  }
                }
              }
            },
            approvedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            mission: {
              select: {
                numIntervention: true,
                natureIntervention: true
              }
            },
            intervention: {
              select: {
                id: true,
                mission: {
                  select: {
                    numIntervention: true,
                    natureIntervention: true
                  }
                }
              }
            }
          },
          orderBy: { startDate: 'asc' }
        })
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    // Interventions avec RBAC
    if (includeInterventions === 'true') {
      const interventionWhere: any = {
        dateHeureDebut: { gte: start, lte: end },
        ...buildInterventionRBACWhere(req, userIds as string)
      };

      if (status) {
        interventionWhere.statut = { in: status as string[] };
      }

      promises.push(
        prisma.intervention.findMany({
          where: interventionWhere,
          include: {
            mission: {
              select: {
                numIntervention: true,
                natureIntervention: true,
                objectifDuContrat: true,
                client: {
                  select: {
                    id: true,
                    name: true,
                    customerNumber: true
                  }
                }
              }
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                serviceId: true
              }
            },
            techniciens: {
              include: {
                technicien: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    specialite: {
                      select: {
                        libelle: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: { dateHeureDebut: 'asc' }
        })
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    // Exécution parallèle
    const [calendarEvents, timeOffs, interventions] = await Promise.all(promises);

    // Transformation en format unifié
    const unifiedEvents: UnifiedEvent[] = [];

    // Événements calendrier
    for (const event of calendarEvents) {
      unifiedEvents.push({
        id: `calendar-${event.id}`,
        title: event.title,
        description: event.description || undefined,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        type: event.type as CalendarEventType,
        priority: event.priority as 'high' | 'medium' | 'low',
        isAllDay: event.isAllDay,
        location: event.location || undefined,
        reminder: event.reminder?.toISOString(),
        source: 'CALENDAR_EVENT',
        originalData: event,
        calendarId: event.calendarId,
        userId: event.calendar.userId,
        user: event.calendar.user
      });
    }

    // Congés
    for (const timeOff of timeOffs) {
      const user = timeOff.calendar.user;
      const title = `Congé - ${getTimeOffTypeLabel(timeOff.type)} - ${user.firstName} ${user.lastName}`;
      
      unifiedEvents.push({
        id: `timeoff-${timeOff.id}`,
        title,
        description: timeOff.reason || undefined,
        startTime: timeOff.startDate.toISOString(),
        endTime: timeOff.endDate.toISOString(),
        type: 'TIMEOFF',
        priority: timeOff.status === 'APPROVED' ? 'medium' : 'low',
        isAllDay: true,
        source: 'TIMEOFF',
        originalData: timeOff,
        calendarId: timeOff.calendarId,
        userId: timeOff.calendar.userId,
        user,
        timeOffData: {
          type: timeOff.type as TimeOffType,
          status: timeOff.status as TimeOffStatus,
          reason: timeOff.reason || undefined
        }
      });
    }

    // Interventions
    for (const intervention of interventions) {
      const user = intervention.user;
      const mission = intervention.mission;
      const title = `Intervention - ${mission.natureIntervention}`;
      
      unifiedEvents.push({
        id: `intervention-${intervention.id}`,
        title,
        description: intervention.commentaire || mission.objectifDuContrat,
        startTime: intervention.dateHeureDebut.toISOString(),
        endTime: intervention.dateHeureFin?.toISOString() || intervention.dateHeureDebut.toISOString(),
        type: 'INTERVENTION',
        priority: 'high',
        isAllDay: false,
        source: 'INTERVENTION',
        originalData: intervention,
        userId: intervention.userId,
        user,
        interventionData: {
          missionId: mission.numIntervention,
          statut: intervention.statut,
          techniciens: intervention.techniciens.map((ti: any) => ({
            id: ti.technicien.id,
            nom: ti.technicien.nom,
            prenom: ti.technicien.prenom,
            specialite: ti.technicien.specialite.libelle
          }))
        }
      });
    }

    // Tri par date de début
    unifiedEvents.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Log pour débogage
    console.log('📅 Événements unifiés:', {
      total: unifiedEvents.length,
      calendarEvents: calendarEvents.length,
      timeOffs: timeOffs.length,
      interventions: interventions.length,
      user: req.user?.userId,
      role: req.user?.role
    });

    res.json({
      success: true,
      data: {
        events: unifiedEvents,
        metadata: {
          total: unifiedEvents.length,
          calendarEvents: calendarEvents.length,
          timeOffs: timeOffs.length,
          interventions: interventions.length,
          period: { start, end },
          user: {
            id: req.user?.userId,
            role: req.user?.role,
            serviceId: req.user?.serviceId
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération du calendrier unifié:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Récupère les calendriers utilisateurs
 */
export const getUserCalendars = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.query;
    
    const whereClause = userId ? { userId: Number(userId) } : {};
    
    const calendars = await prisma.userCalendar.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
            department: true,
            avatarUrl: true
          }
        }
      },
      distinct: ['userId'],
      orderBy: {
        user: {
          firstName: 'asc'
        }
      }
    });

    res.json({
      success: true,
      data: calendars
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des calendriers:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Récupère les événements avec filtrage RBAC amélioré
 */
function buildRBACWhere(req: AuthenticatedRequest, userIds?: string) {
  const user = req.user;
  if (!user) {
    throw new Error('Utilisateur non authentifié');
  }

  // Si des userIds spécifiques sont demandés, on les utilise
  if (userIds) {
    return { userId: { in: userIds.split(',').map(Number) } };
  }

  const userRole = user.role;
  const userServiceId = user.serviceId;
  const currentUserId = user.userId;

  // ADMIN: voit tout
  if (userRole === 'ADMIN') {
    return {};
  }

  // DIRECTEUR GÉNÉRAL: voit tout son service + ses propres événements
  if (userRole === 'GENERAL_DIRECTOR' && userServiceId) {
    return {
      OR: [
        { user: { serviceId: userServiceId } },
        { userId: currentUserId }
      ]
    };
  }

  // MANAGER DE SERVICE: voit son service + ses événements
  if (userRole === 'SERVICE_MANAGER' && userServiceId) {
    return {
      OR: [
        { user: { serviceId: userServiceId } },
        { userId: currentUserId }
      ]
    };
  }

  // EMPLOYÉ: voit seulement ses propres événements
  if (userRole === 'EMPLOYEE') {
    return { userId: currentUserId };
  }

  // COMPTABLE: voit les événements financiers + ses propres événements
  if (userRole === 'ACCOUNTANT') {
    return {
      OR: [
        { userId: currentUserId },
        // Ajouter ici les critères pour les événements financiers si nécessaire
      ]
    };
  }

  // Par défaut: seulement ses propres événements
  return { userId: currentUserId };
}

/**
 * Récupère les interventions avec filtrage RBAC
 */
function buildInterventionRBACWhere(req: AuthenticatedRequest, userIds?: string) {
  const user = req.user;
  if (!user) {
    throw new Error('Utilisateur non authentifié');
  }

  // Si des userIds spécifiques sont demandés, on les utilise
  if (userIds) {
    return { userId: { in: userIds.split(',').map(Number) } };
  }

  const userRole = user.role;
  const userServiceId = user.serviceId;
  const currentUserId = user.userId;

  // ADMIN: voit tout
  if (userRole === 'ADMIN') {
    return {};
  }

  // DIRECTEUR GÉNÉRAL/MANAGER: voit les interventions de leur service
  if ((userRole === 'GENERAL_DIRECTOR' || userRole === 'SERVICE_MANAGER') && userServiceId) {
    return {
      OR: [
        { user: { serviceId: userServiceId } },
        { userId: currentUserId }
      ]
    };
  }

  // EMPLOYÉ: voit seulement ses propres interventions
  if (userRole === 'EMPLOYEE') {
    return { userId: currentUserId };
  }

  // Par défaut: seulement ses propres interventions
  return { userId: currentUserId };
}

// Helper function
function getTimeOffTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'VACATION': 'Congés payés',
    'SICK_LEAVE': 'Arrêt maladie',
    'PERSONAL_DAY': 'Jour personnel',
    'MATERNITY_LEAVE': 'Congé maternité',
    'PATERNITY_LEAVE': 'Congé paternité',
    'BEREAVEMENT': 'Congé décès',
    'OTHER': 'Autre'
  };
  return labels[type] || type;
}

// Export des fonctions existantes pour compatibilité
export {
  getCalendarWithTimeOffs,
  getEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  validateEvent
} from './calendarController';