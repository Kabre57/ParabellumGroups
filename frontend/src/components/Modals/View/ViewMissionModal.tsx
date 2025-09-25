import React from 'react';
import { X, FileText, Calendar, User, Target, AlertCircle, Building2, Clock } from 'lucide-react';

interface ViewMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mission: any;
}

const prioriteLabels = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
  urgente: 'Urgente'
};

const prioriteColors = {
  basse: 'bg-green-100 text-green-800',
  normale: 'bg-blue-100 text-blue-800',
  haute: 'bg-orange-100 text-orange-800',
  urgente: 'bg-red-100 text-red-800'
};

const statusLabels = {
  DRAFT: 'Brouillon',
  ASSIGNED: 'Assignée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée'
};

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800'
};

export const ViewMissionModal: React.FC<ViewMissionModalProps> = ({ isOpen, onClose, mission }) => {
  if (!isOpen || !mission) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Mission {mission.missionNumber}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Statut et Priorité */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${
                  statusColors[mission.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                }`}>
                  {statusLabels[mission.status as keyof typeof statusLabels] || mission.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                <div className="flex items-center">
                  <AlertCircle className={`h-4 w-4 mr-2 ${
                    mission.priorite === 'urgente' ? 'text-red-600' :
                    mission.priorite === 'haute' ? 'text-orange-600' :
                    mission.priorite === 'normale' ? 'text-blue-600' :
                    'text-green-600'
                  }`} />
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                    prioriteColors[mission.priorite as keyof typeof prioriteColors] || 'bg-gray-100 text-gray-800'
                  }`}>
                    {prioriteLabels[mission.priorite as keyof typeof prioriteLabels] || mission.priorite}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              <div>Créée le: {formatDate(mission.createdAt)}</div>
              <div>Modifiée le: {formatDate(mission.updatedAt)}</div>
            </div>
          </div>

          {/* Client */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Client</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <Building2 className="h-5 w-5 text-gray-600 mr-2" />
                <span className="font-medium text-lg">
                  {mission.client?.name}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  ({mission.client?.customerNumber})
                </span>
              </div>
              {mission.client?.email && (
                <div className="mt-2 text-sm text-gray-600">
                  Email: {mission.client.email}
                </div>
              )}
              {mission.client?.phone && (
                <div className="text-sm text-gray-600">
                  Téléphone: {mission.client.phone}
                </div>
              )}
            </div>
          </div>

          {/* Nature d'intervention */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Nature d'Intervention
            </h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">{mission.natureIntervention}</p>
            </div>
          </div>

          {/* Objectif du contrat */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Objectif du Contrat</h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900">{mission.objectifDuContrat}</p>
            </div>
          </div>

          {/* Description */}
          {mission.description && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Description Complémentaire</h4>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4">{mission.description}</p>
            </div>
          )}

          {/* Dates importantes */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Dates Importantes
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de sortie fiche intervention</label>
                <div className="flex items-center">
                  <Calendar className="text-gray-400 h-4 w-4 mr-2" />
                  <span>{formatDate(mission.dateSortieFicheIntervention)}</span>
                </div>
              </div>
              {mission.dateDebutPrevue && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de début prévue</label>
                  <div className="flex items-center">
                    <Calendar className="text-gray-400 h-4 w-4 mr-2" />
                    <span>{formatDate(mission.dateDebutPrevue)}</span>
                  </div>
                </div>
              )}
              {mission.dateFinPrevue && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin prévue</label>
                  <div className="flex items-center">
                    <Calendar className="text-gray-400 h-4 w-4 mr-2" />
                    <span>{formatDate(mission.dateFinPrevue)}</span>
                  </div>
                </div>
              )}
              {mission.dateDebutReelle && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de début réelle</label>
                  <div className="flex items-center">
                    <Calendar className="text-green-400 h-4 w-4 mr-2" />
                    <span>{formatDate(mission.dateDebutReelle)}</span>
                  </div>
                </div>
              )}
              {mission.dateFinReelle && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin réelle</label>
                  <div className="flex items-center">
                    <Calendar className="text-green-400 h-4 w-4 mr-2" />
                    <span>{formatDate(mission.dateFinReelle)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Équipe assignée */}
          {mission.assignedTeam && mission.assignedTeam.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Équipe Assignée ({mission.assignedTeam.length})
              </h4>
              <div className="space-y-2">
                {mission.assignedTeam.map((member: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-600 mr-2" />
                      <div>
                        <span className="font-medium">
                          {member.firstName} {member.lastName}
                        </span>
                        <div className="text-sm text-gray-500">
                          {member.position} - {member.service?.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {member.role || 'Membre'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progression */}
          {mission.progress !== undefined && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Progression</h4>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-200 rounded-full h-3 mr-4">
                  <div 
                    className={`h-3 rounded-full ${
                      mission.progress >= 100 ? 'bg-green-600' :
                      mission.progress >= 75 ? 'bg-blue-600' :
                      mission.progress >= 50 ? 'bg-yellow-600' :
                      'bg-red-600'
                    }`}
                    style={{ width: `${Math.min(mission.progress, 100)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {mission.progress}%
                </span>
              </div>
            </div>
          )}

          {/* Budget */}
          {(mission.budgetEstime || mission.budgetReel) && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Budget</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mission.budgetEstime && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget estimé</label>
                    <span className="text-lg font-semibold">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'XOF'
                      }).format(mission.budgetEstime)}
                    </span>
                  </div>
                )}
                {mission.budgetReel && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget réel</label>
                    <span className="text-lg font-semibold">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'XOF'
                      }).format(mission.budgetReel)}
                    </span>
                  </div>
                )}
              </div>
            </div>
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

