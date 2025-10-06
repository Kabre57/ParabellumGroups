export interface WeeklyEvent {
  id: string | number;
  title: string;
  description?: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  type: CalendarEventType;
  priority?: 'high' | 'medium' | 'low';
  isAllDay: boolean;
  location?: string;
  reminder?: string;
  
  // Métadonnées pour l'affichage
  source: 'CALENDAR_EVENT' | 'TIMEOFF' | 'INTERVENTION' | 'MISSION';
  originalData: any;
  
  // Relations
  calendarId?: number;
  userId?: number;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  
  // Spécifique aux interventions
  interventionData?: {
    missionId: string;
    statut: string;
    techniciens?: Array<{
      id: number;
      nom: string;
      prenom: string;
    }>;
  };
  
  // Spécifique aux congés
  timeOffData?: {
    type: TimeOffType;
    status: TimeOffStatus;
    reason?: string;
  };
}

export type CalendarEventType = 
  | 'MEETING' 
  | 'INTERVENTION' 
  | 'MISSION' 
  | 'APPOINTMENT' 
  | 'REMINDER' 
  | 'TASK' 
  | 'TIMEOFF' 
  | 'OTHER';

export type TimeOffType = 
  | 'VACATION' 
  | 'SICK_LEAVE' 
  | 'PERSONAL_DAY' 
  | 'MATERNITY_LEAVE' 
  | 'PATERNITY_LEAVE' 
  | 'BEREAVEMENT' 
  | 'OTHER';

export type TimeOffStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'CANCELLED';