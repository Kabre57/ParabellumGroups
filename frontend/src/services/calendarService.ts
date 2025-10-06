import { WeeklyEvent, CalendarFilters, CalendarEventType, TimeOffType, TimeOffStatus } from '../types/calendar';
import { api } from './api';

export const unifiedCalendarService = {
  /**
   * Récupère tous les événements unifiés pour une période
   */
  getWeeklyEvents: async (filters: CalendarFilters): Promise<WeeklyEvent[]> => {
    const response = await api.get('/calendar/unified', { params: filters });
    return response.data.data.events;
  },

  /**
   * Crée un nouvel événement calendrier
   */
  createCalendarEvent: async (eventData: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    type: CalendarEventType;
    priority?: 'high' | 'medium' | 'low';
    isAllDay?: boolean;
    location?: string;
    reminder?: string;
    calendarId: number;
  }) => {
    const response = await api.post('/calendar/events', eventData);
    return response.data.data;
  },

  /**
   * Crée une demande de congé
   */
  createTimeOffRequest: async (timeOffData: {
    type: TimeOffType;
    startDate: string;
    endDate: string;
    reason?: string;
    calendarId: number;
    missionId?: string;
    interventionId?: number;
  }) => {
    const response = await api.post('/time-off', timeOffData);
    return response.data.data;
  },

  /**
   * Met à jour le statut d'un congé
   */
  updateTimeOffStatus: async (
    timeOffId: number, 
    statusData: { 
      status: TimeOffStatus; 
      comments?: string;
      approvedById?: number;
    }
  ) => {
    const response = await api.patch(`/time-off/${timeOffId}/status`, statusData);
    return response.data.data;
  },

  /**
   * Récupère les calendriers utilisateurs disponibles
   */
  getUserCalendars: async (userId?: number) => {
    const params = userId ? { userId } : {};
    const response = await api.get('/calendar/user-calendars', { params });
    return response.data.data;
  }
};