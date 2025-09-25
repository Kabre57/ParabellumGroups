// src/pages/Calendar/CalendarManagement.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Filter, Calendar, User, Clock, MapPin, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateCalendarEventModal } from '../../components/Modals/Create/CreateCalendarEventModal';
import { CreateTimeOffRequestModal } from '../../components/Modals/Create/CreateTimeOffRequestModal';
import { ViewCalendarEventModal } from '../../components/Modals/View/ViewCalendarEventModal';

const calendarService = createCrudService('calendar');
const employeeService = createCrudService('employees');

const eventTypeLabels = {
  MEETING: 'Réunion',
  TASK: 'Tâche',
  REMINDER: 'Rappel',
  EVENT: 'Événement',
  DEADLINE: 'Échéance'
};

const timeOffTypeLabels = {
  VACATION: 'Congés payés',
  SICK: 'Maladie',
  PERSONAL: 'Personnel',
  MATERNITY: 'Maternité',
  PATERNITY: 'Paternité',
  BEREAVEMENT: 'Deuil'
};

const statusLabels = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  CANCELLED: 'Annulé'
};

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800'
};

export const CalendarManagement: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'events' | 'timeoff'>('events');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showCreateTimeOffModal, setShowCreateTimeOffModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const { data: calendarData, isLoading, error } = useQuery({
    queryKey: ['calendar', activeTab, startDate, endDate, typeFilter],
    queryFn: () => calendarService.getAll({ 
      type: activeTab,
      startDate,
      endDate,
      eventType: typeFilter
    })
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

  const items = calendarData?.data?.items || [];
  const events = activeTab === 'events' ? items : [];
  const timeOffRequests = activeTab === 'timeoff' ? items : [];

  const handleViewItem = (item: any) => {
    setSelectedItem(item);
    setShowViewModal(true);
  };

  const handleCloseModals = () => {
    setShowViewModal(false);
    setSelectedItem(null);
  };

  const getStatusBadge = (status: string) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors]}`}>
        {statusLabels[status as keyof typeof statusLabels]}
      </span>
    );
  };

  const formatDateTime = (dateString: string, timeString?: string) => {
    const date = new Date(dateString);
    if (timeString) {
      return `${date.toLocaleDateString('fr-FR')} ${timeString}`;
    }
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion du Calendrier</h1>
          <p className="text-gray-600">Événements et demandes de congés</p>
        </div>
        <div className="flex items-center space-x-2">
          {hasPermission('calendar.events.create') && activeTab === 'events' && (
            <button
              onClick={() => setShowCreateEventModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvel Événement</span>
            </button>
          )}
          {hasPermission('calendar.timeoff.create') && activeTab === 'timeoff' && (
            <button
              onClick={() => setShowCreateTimeOffModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
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
        <div className="flex items-center space-x-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous les types</option>
                {Object.entries(eventTypeLabels).map(([type, label]) => (
                  <option key={type} value={type}>{label}</option>
                ))}
              </select>
            </div>
          )}
          {activeTab === 'timeoff' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous les types</option>
                {Object.entries(timeOffTypeLabels).map(([type, label]) => (
                  <option key={type} value={type}>{label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      {activeTab === 'events' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event: any) => (
            <div key={event.id} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {event.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {eventTypeLabels[event.type as keyof typeof eventTypeLabels]}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 bg-blue-100 rounded-full">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDateTime(event.startTime)}
                    {event.endTime && ` - ${formatDateTime(event.endTime)}`}
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

                {event.description && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {event.description}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between">
                  {event.priority && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      event.priority === 'high' ? 'bg-red-100 text-red-800' :
                      event.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {event.priority === 'high' ? 'Élevée' :
                       event.priority === 'medium' ? 'Moyenne' : 'Basse'}
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
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Période
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Raison
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timeOffRequests.map((request: any) => (
                <tr key={request.id} className="hover:bg-gray-50">
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
                    {timeOffTypeLabels[request.type as keyof typeof timeOffTypeLabels]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDateTime(request.startDate)} - {formatDateTime(request.endDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {request.reason}
                  </td>
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
      {items.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {activeTab === 'events' ? 'Aucun événement trouvé' : 'Aucune demande de congé trouvée'}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {activeTab === 'events' 
              ? 'Commencez par créer un événement calendrier.'
              : 'Commencez par créer une demande de congé.'
            }
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