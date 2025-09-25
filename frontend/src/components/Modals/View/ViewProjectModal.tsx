// components/Modals/View/ViewProjectModal.tsx
import React from 'react';
import { X, FolderKanban, Calendar, User, DollarSign, Target, Clock, Users, FileText } from 'lucide-react';

interface ViewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
}

export const ViewProjectModal: React.FC<ViewProjectModalProps> = ({ isOpen, onClose, project }) => {
  if (!isOpen || !project) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'PLANNED': 'bg-blue-100 text-blue-800',
      'IN_PROGRESS': 'bg-yellow-100 text-yellow-800',
      'ON_HOLD': 'bg-orange-100 text-orange-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'PLANNED': 'Planifié',
      'IN_PROGRESS': 'En cours',
      'ON_HOLD': 'En attente',
      'COMPLETED': 'Terminé',
      'CANCELLED': 'Annulé'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      'low': 'Basse',
      'medium': 'Moyenne',
      'high': 'Haute'
    };
    return labels[priority as keyof typeof labels] || priority;
  };

  const calculateProgress = () => {
    if (!project.tasks || project.tasks.length === 0) return 0;
    const completedTasks = project.tasks.filter((task: any) => task.status === 'DONE').length;
    return Math.round((completedTasks / project.tasks.length) * 100);
  };

  const progress = calculateProgress();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FolderKanban className="h-5 w-5 mr-2" />
            Détails du Projet {project.name}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* En-tête avec statut */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Target className="h-5 w-5 mr-2 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Statut</span>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                {getStatusLabel(project.status)}
              </span>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Clock className="h-5 w-5 mr-2 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Progression</span>
              </div>
              <div className="text-lg font-semibold">{progress}%</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Users className="h-5 w-5 mr-2 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Tâches</span>
              </div>
              <div className="text-lg font-semibold">{project.tasks?.length || 0}</div>
            </div>
          </div>

          {/* Barre de progression */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Avancement du projet</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Informations du projet</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Client:</span>
                  <span className="text-sm font-medium">{project.customer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Responsable:</span>
                  <span className="text-sm font-medium">
                    {project.manager?.firstName} {project.manager?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Priorité:</span>
                  <span className="text-sm font-medium capitalize">{getPriorityLabel(project.priority)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Dates</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Début:</span>
                  <span className="text-sm font-medium">{formatDate(project.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Fin prévue:</span>
                  <span className="text-sm font-medium">
                    {project.endDate ? formatDate(project.endDate) : 'Non définie'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Budget:</span>
                  <span className="text-sm font-medium">
                    {project.budget ? formatCurrency(project.budget) : 'Non défini'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-2">Description</h4>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{project.description}</p>
              </div>
            </div>
          )}

          {/* Statistiques des tâches */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Répartition des tâches</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{project.tasks?.length || 0}</div>
                <div className="text-xs text-blue-800">Total</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {project.tasks?.filter((t: any) => t.status === 'TODO').length || 0}
                </div>
                <div className="text-xs text-yellow-800">À faire</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {project.tasks?.filter((t: any) => t.status === 'IN_PROGRESS').length || 0}
                </div>
                <div className="text-xs text-orange-800">En cours</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {project.tasks?.filter((t: any) => t.status === 'DONE').length || 0}
                </div>
                <div className="text-xs text-green-800">Terminées</div>
              </div>
            </div>
          </div>

          {/* Informations système */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Informations système</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Créé le:</span>
                <span className="ml-2 font-medium">{formatDate(project.createdAt)}</span>
              </div>
              <div>
                <span className="text-gray-600">Modifié le:</span>
                <span className="ml-2 font-medium">{formatDate(project.updatedAt)}</span>
              </div>
              <div>
                <span className="text-gray-600">Créé par:</span>
                <span className="ml-2 font-medium">
                  {project.creator?.firstName} {project.creator?.lastName}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Service:</span>
                <span className="ml-2 font-medium">{project.service?.name}</span>
              </div>
            </div>
          </div>

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