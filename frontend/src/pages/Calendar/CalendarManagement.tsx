// src/pages/Calendar/CalendarManagement.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Calendar, User, Clock, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateCalendarEventModal } from '../../components/Modals/Create/CreateCalendarEventModal';
import { CreateTimeOffRequestModal } from '../../components/Modals/Create/CreateTimeOffRequestModal';
import { ViewCalendarEventModal } from '../../components/Modals/View/ViewCalendarEventModal';

// Services pour les appels API
const calendarService = createCrudService('calendar');

// Configuration des libellés pour les types d'événements
const eventTypeLabels = {
  MEETING: 'Réunion',
  TASK: 'Tâche',
  REMINDER: 'Rappel',
  EVENT: 'Événement',
  DEADLINE: 'Échéance'
};

// Configuration des libellés pour les types de congés
const timeOffTypeLabels = {
  VACATION: 'Congés payés',
  SICK: 'Maladie',
  PERSONAL: 'Personnel',
  MATERNITY: 'Maternité',
  PATERNITY: 'Paternité',
  BEREAVEMENT: 'Deuil'
};

// Configuration des libellés pour les statuts
const statusLabels = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  CANCELLED: 'Annulé'
};

// Configuration des couleurs pour les statuts
const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800'
};

/**
 * Composant principal de gestion du calendrier
 * Affiche les événements et demandes de congés avec système d'onglets
 */
export const CalendarManagement: React.FC = () => {
  // Hooks d'authentification et de gestion d'état
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  
  // États pour la gestion des onglets et filtres
  const [activeTab, setActiveTab] = useState<'events' | 'timeoff'>('events');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState('');
  
  // États pour la gestion des modales
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showCreateTimeOffModal, setShowCreateTimeOffModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Mutation pour l'approbation des congés
  const approveTimeOffMutation = useMutation({
    mutationFn: (requestId: number) => 
      calendarService.update(requestId, { status: 'APPROVED' }),
    onSuccess: () => {
      // Recharger les données après approbation
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    }
  });

  // Mutation pour le rejet des congés
  const rejectTimeOffMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: number; reason: string }) =>
      calendarService.update(requestId, { status: 'REJECTED', comments: reason }),
    onSuccess: () => {
      // Recharger les données après rejet
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    }
  });

  // Récupération des données du calendrier
  const { data: calendarData, isLoading, error } = useQuery({
    queryKey: ['calendar', activeTab, startDate, endDate, typeFilter],
    queryFn: () => calendarService.getAll({ 
      startDate,
      endDate,
      eventType: typeFilter || undefined
    })
  });

  // Gestion du chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Gestion des erreurs
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Erreur lors du chargement du calendrier
      </div>
    );
  }

  // Extraction et typage des données
  const responseData = calendarData as any;
  const items = responseData?.data?.items || responseData?.data?.events || responseData?.data?.timeOffs || [];
  
  // Filtrage des données selon l'onglet actif
  const events = activeTab === 'events' ? items : [];
  const timeOffRequests = activeTab === 'timeoff' ? items : [];

  /**
   * Gestion de la visualisation d'un élément
   * @param item - Élément à visualiser (événement ou demande de congé)
   */
  const handleViewItem = (item: any) => {
    setSelectedItem(item);
    setShowViewModal(true);
  };

  /**
   * Gestion de l'approbation d'une demande de congé
   * @param requestId - ID de la demande à approuver
   */
  const handleApproveTimeOff = (requestId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir approuver cette demande de congé ?')) {
      approveTimeOffMutation.mutate(requestId);
    }
  };

  /**
   * Gestion du rejet d'une demande de congé
   * @param requestId - ID de la demande à rejeter
   */
  const handleRejectTimeOff = (requestId: number) => {
    const reason = prompt('Veuillez saisir la raison du rejet :');
    if (reason) {
      rejectTimeOffMutation.mutate({ requestId, reason });
    }
  };

  /**
   * Fermeture de toutes les modales
   */
  const handleCloseModals = () => {
    setShowViewModal(false);
    setSelectedItem(null);
  };

  /**
   * Génère un badge coloré pour le statut
   * @param status - Statut à afficher
   * @returns Composant badge avec couleur appropriée
   */
  const getStatusBadge = (status: string) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
      }`}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  /**
   * Formate une date pour l'affichage
   * @param dateString - Date à formater
   * @param timeString - Heure optionnelle à ajouter
   * @returns Date formatée en français
   */
  const formatDateTime = (dateString: string, timeString?: string) => {
    try {
      const date = new Date(dateString);
      if (timeString) {
        return `${date.toLocaleDateString('fr-FR')} ${timeString}`;
      }
      return date.toLocaleDateString('fr-FR');
    } catch (error) {
      return 'Date invalide';
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion du Calendrier</h1>
          <p className="text-gray-600">Événements et demandes de congés</p>
        </div>
        
        {/* Boutons d'action selon les permissions */}
        <div className="flex items-center space-x-2">
          {hasPermission('calendar.events.create') && activeTab === 'events' && (
            <button
              onClick={() => setShowCreateEventModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvel Événement</span>
            </button>
          )}
          {hasPermission('calendar.timeoff.create') && activeTab === 'timeoff' && (
            <button
              onClick={() => setShowCreateTimeOffModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvelle Demande</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('events')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'events'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Événements
          </button>
          <button
            onClick={() => setActiveTab('timeoff')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'timeoff'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Demandes de Congés
          </button>
        </nav>
      </div>

      {/* Section des filtres */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          {/* Filtre par date de début */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Du</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          
          {/* Filtre par date de fin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Au</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          
          {/* Filtre par type (selon l'onglet actif) */}
          {activeTab === 'events' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type d'événement</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de congé</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
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

      {/* Contenu principal selon l'onglet actif */}
      {activeTab === 'events' ? (
        // Affichage des événements en grille
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event: any) => (
            <div key={event.id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* En-tête de l'événement */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {event.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {eventTypeLabels[event.type as keyof typeof eventTypeLabels] || event.type}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 bg-blue-100 rounded-full">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Détails de l'événement */}
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

                {/* Description de l'événement */}
                {event.description && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {event.description}
                    </p>
                  </div>
                )}

                {/* Pied de carte avec priorité et actions */}
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
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Voir les détails"
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
        // Affichage des demandes de congés en tableau
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
                <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                  {/* Colonne Employé */}
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
                          {request.calendar?.user?.position || 'Non spécifié'}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Colonne Type de congé */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {timeOffTypeLabels[request.type as keyof typeof timeOffTypeLabels] || request.type}
                  </td>
                  
                  {/* Colonne Période */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDateTime(request.startDate)} - {formatDateTime(request.endDate)}
                  </td>
                  
                  {/* Colonne Statut */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                  
                  {/* Colonne Raison */}
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {request.reason || 'Aucune raison spécifiée'}
                  </td>
                  
                  {/* Colonne Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Bouton Voir */}
                      {hasPermission('calendar.timeoff.read') && (
                        <button 
                          onClick={() => handleViewItem(request)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Voir les détails"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      
                      {/* Boutons d'approbation/rejet pour les responsables */}
                      {hasPermission('calendar.timeoff.approve') && request.status === 'PENDING' && (
                        <>
                          <button 
                            onClick={() => handleApproveTimeOff(request.id)}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Approuver la demande"
                          >
                            ✓
                          </button>
                          <button 
                            onClick={() => handleRejectTimeOff(request.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Rejeter la demande"
                          >
                            ✗
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Message si aucun élément trouvé */}
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