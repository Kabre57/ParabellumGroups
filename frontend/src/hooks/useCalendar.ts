import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WeeklyEvent, CalendarFilters } from '../types/calendar';
import { unifiedCalendarService } from '../services/calendarService';

export const useCalendar = (initialFilters?: Partial<CalendarFilters>) => {
  const [filters, setFilters] = useState<CalendarFilters>({
    startDate: initialFilters?.startDate || new Date().toISOString().split('T')[0],
    endDate: initialFilters?.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    includeTimeOffs: initialFilters?.includeTimeOffs ?? true,
    includeInterventions: initialFilters?.includeInterventions ?? true,
    ...initialFilters
  });

  const queryClient = useQueryClient();

  // Query pour les événements
  const {
    data: events = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['calendar', 'unified', filters],
    queryFn: () => unifiedCalendarService.getWeeklyEvents(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query pour les calendriers utilisateurs
  const {
    data: userCalendars = [],
    isLoading: isLoadingCalendars
  } = useQuery({
    queryKey: ['calendar', 'user-calendars'],
    queryFn: () => unifiedCalendarService.getUserCalendars(),
    enabled: true
  });

  // Mutation pour créer un événement
  const createEventMutation = useMutation({
    mutationFn: unifiedCalendarService.createCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    }
  });

  // Mutation pour créer un congé
  const createTimeOffMutation = useMutation({
    mutationFn: unifiedCalendarService.createTimeOffRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    }
  });

  // Mutation pour mettre à jour un congé
  const updateTimeOffStatusMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & any) => 
      unifiedCalendarService.updateTimeOffStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    }
  });

  // Filtrage des événements
  const filteredEvents = useCallback((additionalFilters?: Partial<CalendarFilters>) => {
    const combinedFilters = { ...filters, ...additionalFilters };
    
    return events.filter(event => {
      if (combinedFilters.types && !combinedFilters.types.includes(event.type)) {
        return false;
      }
      
      if (combinedFilters.userIds && event.userId && !combinedFilters.userIds.includes(event.userId)) {
        return false;
      }
      
      if (combinedFilters.status) {
        if (event.source === 'TIMEOFF' && event.timeOffData) {
          if (!combinedFilters.status.includes(event.timeOffData.status)) {
            return false;
          }
        }
        if (event.source === 'INTERVENTION' && event.interventionData) {
          if (!combinedFilters.status.includes(event.interventionData.statut)) {
            return false;
          }
        }
      }
      
      return true;
    });
  }, [events, filters]);

  // Statistiques
  const stats = {
    total: events.length,
    calendarEvents: events.filter(e => e.source === 'CALENDAR_EVENT').length,
    timeOffs: events.filter(e => e.source === 'TIMEOFF').length,
    interventions: events.filter(e => e.source === 'INTERVENTION').length,
    byType: events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  return {
    // État
    events,
    userCalendars,
    filters,
    isLoading: isLoading || isLoadingCalendars,
    error,
    
    // Actions
    setFilters,
    refetch,
    filteredEvents,
    
    // Mutations
    createEvent: createEventMutation.mutateAsync,
    createTimeOff: createTimeOffMutation.mutateAsync,
    updateTimeOffStatus: updateTimeOffStatusMutation.mutateAsync,
    
    // Statistiques
    stats,
    
    // États de mutation
    isCreatingEvent: createEventMutation.isPending,
    isCreatingTimeOff: createTimeOffMutation.isPending,
    isUpdatingTimeOff: updateTimeOffStatusMutation.isPending
  };
};