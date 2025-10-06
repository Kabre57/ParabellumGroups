// frontend/src/pages/Calendar/CalendarManagement.tsx
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye, Calendar as CalIcon, User, Clock, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateCalendarEventModal } from '../../components/Modals/Create/CreateCalendarEventModal';
import { CreateTimeOffRequestModal } from '../../components/Modals/Create/CreateTimeOffRequestModal';
import { ViewCalendarEventModal } from '../../components/Modals/View/ViewCalendarEventModal';
import { WeeklyCalendar, type CalendarEvent as WeeklyCalEvent } from '../../components/calendar/WeeklyCalendar';

// ---- Services
const calendarService = createCrudService('calendar');

// ---- Types de données attendus par l'API calendrier
type ApiEvent = {
  id: number | string;
  title: string | null;
  description?: string | null;
  startTime: string;    // ISO
  endTime: string;      // ISO
  type?: string | null; // e.g. MEETING, INTERVENTION, ...
  priority?: 'high' | 'medium' | 'low' | null;
  isAllDay?: boolean | null;
  location?: string | null;
  calendar?: { user?: { firstName?: string; lastName?: string } };
};

type ApiTimeOff = {
  id: number | string;
  type: string;         // e.g. VACATION, SICK, ...
  reason?: string | null;
  startDate: string;    // ISO
  endDate: string;      // ISO
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  calendar?: { user?: { firstName?: string; lastName?: string; position?: string } };
};

type CalendarApiResponse = {
  success: boolean;
  data: {
    events: ApiEvent[];
    timeOffs: ApiTimeOff[];
  };
};

// ---- Libellés
const eventTypeLabels = {
  MEETING: 'Réunion',
  TASK: 'Tâche',
  REMINDER: 'Rappel',
  EVENT: 'Événement',
  DEADLINE: 'Échéance',
  INTERVENTION: 'Intervention',
  MISSION: 'Mission',
  TIMEOFF: 'Absence',
  OTHER: 'Autre',
} as const;

const timeOffTypeLabels = {
  VACATION: 'Congés payés',
  SICK: 'Maladie',
  PERSONAL: 'Personnel',
  MATERNITY: 'Maternité',
  PATERNITY: 'Paternité',
  BEREAVEMENT: 'Deuil',
} as const;

const statusLabels = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  CANCELLED: 'Annulé',
} as const;

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
} as const;

type Tab = 'events' | 'timeoff';
type ViewMode = 'grid' | 'cards';

export const CalendarManagement: React.FC = () => {
  const { hasPermission } = useAuth();

  // ---- STATE (ordre fixe)
  const [activeTab, setActiveTab] = useState<Tab>('events');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 semaine
  );
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showCreateTimeOffModal, setShowCreateTimeOffModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // ---- FETCH: typé avec la forme renvoyée par l’API
  const { data, isLoading, error } = useQuery<CalendarApiResponse>({
    queryKey: ['calendar', activeTab, startDate, endDate, typeFilter],
    queryFn: () =>
      calendarService.getAll({
        startDate,
        endDate,
        includeTimeOffs: true, // on récupère toujours congés + events
        ...(typeFilter ? { type: typeFilter } : {}),
      }),
  });

  // Sécurise l’accès aux tableaux
  const eventsRaw: ApiEvent[] = data?.data?.events ?? [];
  const timeOffsRaw: ApiTimeOff[] = data?.data?.timeOffs ?? [];

  // ---- MEMO (déclarés au top-level, jamais conditionnels)
  const weekStart = useMemo(() => {
    const d = new Date(startDate);
    d.setHours(0, 0, 0, 0);
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate]);

  // mappe un "time off" en événement all-day pour la grille hebdo
  const mapTimeOffToEvent = useMemo(
    () => (t: ApiTimeOff): WeeklyCalEvent => ({
      id: `timeoff-${t.id}`,
      title: `Absence — ${timeOffTypeLabels[t.type as keyof typeof timeOffTypeLabels] ?? t.type}`,
      description: t.reason ?? undefined,
      startTime: t.startDate,
      endTime: t.endDate,
      type: 'TIMEOFF',
      isAllDay: true,
    }),
    []
  );

  const mapEvent = useMemo(
    () => (ev: ApiEvent): WeeklyCalEvent => ({
      id: ev.id ?? String(Math.random()),
      title: ev.title ?? '(Sans titre)',
      description: ev.description ?? undefined,
      startTime: ev.startTime,
      endTime: ev.endTime,
      type: (ev.type as WeeklyCalEvent['type']) ?? 'OTHER',
      isAllDay: Boolean(ev.isAllDay),
    }),
    []
  );

  // fusion événements + absences pour la WeeklyCalendar
  const mergedWeeklyEvents: WeeklyCalEvent[] = useMemo(
    () => [...eventsRaw.map(mapEvent), ...timeOffsRaw.map(mapTimeOffToEvent)],
    [eventsRaw, timeOffsRaw, mapEvent, mapTimeOffToEvent]
  );

  // ---- HELPERS d’affichage
  const handleViewItem = (item: any) => {
    setSelectedItem(item);
    setShowViewModal(true);
  };
  const handleCloseModals = () => {
    setShowViewModal(false);
    setSelectedItem(null);
  };
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR');

  // ---- RENDER
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Erreur lors du chargement du calendrier
      </div>
    );
  }

  const itemsLength =
    activeTab === 'events' ? mergedWeeklyEvents.length : timeOffsRaw.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion du Calendrier</h1>
          <p className="text-gray-600">
            Événements (interventions, missions, réunions…) et congés
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'events' && (
            <div className="inline-flex rounded-md shadow-sm overflow-hidden border">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm ${
                  viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
                }`}
              >
                Planning
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 text-sm ${
                  viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
                }`}
              >
                Cartes
              </button>
            </div>
          )}

          {hasPermission('calendar.events.create') && activeTab === 'events' && (
            <button
              onClick={() => setShowCreateEventModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvel Événement</span>
            </button>
          )}
          {hasPermission('calendar.timeoff.create') && activeTab === 'timeoff' && (
            <button
              onClick={() => setShowCreateTimeOffModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvelle Demande</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('events')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'events'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Événements
          </button>
          <button
            onClick={() => setActiveTab('timeoff')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'timeoff'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Demandes de Congés
          </button>
        </nav>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Du</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Au</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {activeTab === 'events' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type d’événement
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous</option>
                {Object.entries(eventTypeLabels).map(([type, label]) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      {activeTab === 'events' ? (
        viewMode === 'grid' ? (
          // --- Vue planning hebdomadaire : événements + congés fusionnés
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <WeeklyCalendar
              events={mergedWeeklyEvents}
              weekStart={weekStart}
              hourStart={8}
              hourEnd={18}
              firstDayIsMonday
            />
          </div>
        ) : (
          // --- Vue cartes
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventsRaw.map((event: ApiEvent) => (
              <div key={String(event.id)} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{event.title ?? '(Sans titre)'}</h3>
                      <p className="text-sm text-gray-500">
                        {eventTypeLabels[(event.type ?? 'OTHER') as keyof typeof eventTypeLabels]}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-12 w-12 bg-blue-100 rounded-full">
                        <CalIcon className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatDate(event.startTime)}
                      {event.endTime && ` - ${formatDate(event.endTime)}`}
                    </div>
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="h-4 w-4 mr-1" />
                        {event.location}
                      </div>
                    )}
                    {event.calendar?.user && (
                      <div className="flex items-center text-sm text-gray-500">
                        <User className="h-4 w-4 mr-1" />
                        {event.calendar.user.firstName} {event.calendar.user.lastName}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    {event.priority && (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : event.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {event.priority === 'high'
                          ? 'Élevée'
                          : event.priority === 'medium'
                          ? 'Moyenne'
                          : 'Basse'}
                      </span>
                    )}
                    <div className="flex items-center space-x-2">
                      {hasPermission('calendar.events.read') && (
                        <button
                          onClick={() => handleViewItem(event)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // --- Tableau des demandes de congés
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employé</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Période</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raison</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timeOffsRaw.map((request: ApiTimeOff) => (
                <tr key={String(request.id)} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {request.calendar?.user?.firstName} {request.calendar?.user?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.calendar?.user?.position}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {timeOffTypeLabels[request.type as keyof typeof timeOffTypeLabels] ?? '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(request.startDate)} - {formatDate(request.endDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[request.status]
                      }`}
                    >
                      {statusLabels[request.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{request.reason}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {hasPermission('calendar.timeoff.read') && (
                        <button
                          onClick={() => handleViewItem(request)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Message si aucun élément */}
      {itemsLength === 0 && (
        <div className="text-center py-12">
          <CalIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {activeTab === 'events' ? 'Aucun événement trouvé' : 'Aucune demande de congé trouvée'}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {activeTab === 'events'
              ? 'Commencez par créer un événement calendrier.'
              : 'Commencez par créer une demande de congé.'}
          </p>
        </div>
      )}

      {/* Modales */}
      <CreateCalendarEventModal
        isOpen={showCreateEventModal}
        onClose={() => setShowCreateEventModal(false)}
      />
      <CreateTimeOffRequestModal
        isOpen={showCreateTimeOffModal}
        onClose={() => setShowCreateTimeOffModal(false)}
      />
      <ViewCalendarEventModal
        isOpen={showViewModal}
        onClose={handleCloseModals}
        item={selectedItem}
        type={activeTab}
      />
    </div>
  );
};
