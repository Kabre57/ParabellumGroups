// src/components/Modals/View/ViewCalendarEventModal.tsx
import React from 'react';
import { X, Calendar, Clock, MapPin, User, Users, Target } from 'lucide-react';

interface ViewCalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  type: 'events' | 'timeoff';
}

export const ViewCalendarEventModal: React.FC<ViewCalendarEventModalProps> = ({ isOpen, onClose, item, type }) => {
  if (!isOpen || !item) return null;

  const formatDateTime = (dateString: string, timeString?: string) => {
    const date = new Date(dateString);
    if (timeString) {
      return `${date.toLocaleDateString('fr-FR')} ${timeString}`;
    }
    return date.toLocaleDateString('fr-FR');
  };

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

  const getStatusBadge = (status: string) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors]}`}>
        {statusLabels[status as keyof typeof statusLabels]}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            {type === 'events' ? 'Détails de l\'Événement' : 'Détails de la Demande'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {type === 'events' ? (
            <>
              {/* Titre et type */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{item.title}</h2>
                <p className="text-sm text-gray-500">
                  {eventTypeLabels[item.type as keyof typeof eventTypeLabels]}
                </p>
              </div>

              {/* Dates et heures */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>
                    {formatDateTime(item.startTime)}
                    {item.endTime && ` - ${formatDateTime(item.endTime)}`}
                  </span>
                </div>
                {item.location && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{item.location}</span>
                  </div>
                )}
              </div>

              {/* Priorité */}
              {item.priority && (
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.priority === 'high' ? 'bg-red-100 text-red-800' :
                    item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    Priorité: {item.priority === 'high' ? 'Élevée' :
                              item.priority === 'medium' ? 'Moyenne' : 'Basse'}
                  </span>
                </div>
              )}

              {/* Description */}
              {item.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              )}

              {/* Propriétaire */}
              {item.calendar?.user && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Organisateur</h4>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {item.calendar.user.firstName} {item.calendar.user.lastName}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Type et statut */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {timeOffTypeLabels[item.type as keyof typeof timeOffTypeLabels]}
                  </h2>
                  <p className="text-sm text-gray-500">Demande de congé</p>
                </div>
                {getStatusBadge(item.status)}
              </div>

              {/* Période */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>
                    Du {formatDateTime(item.startDate)} au {formatDateTime(item.endDate)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Durée: {Math.ceil((new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} jour(s)
                </div>
              </div>

              {/* Raison */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Raison</h4>
                <p className="text-sm text-gray-600">{item.reason}</p>
              </div>

              {/* Notes */}
              {item.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600">{item.notes}</p>
                </div>
              )}

              {/* Employé */}
              {item.calendar?.user && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Employé</h4>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {item.calendar.user.firstName} {item.calendar.user.lastName}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 ml-6">
                    {item.calendar.user.position}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Bouton de fermeture */}
          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};