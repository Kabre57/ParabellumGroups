import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Eye, FileText, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateMissionModal } from '../../components/Modals/Create/CreateMissionModal';
import { EditMissionModal } from '../../components/Modals/Edit/EditMissionModal';
import { ViewMissionModal } from '../../components/Modals/View/ViewMissionModal';

const missionService = createCrudService('missions');

const statusConfig = {
  planifiee: { label: 'Planifiée', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  en_cours: { label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  terminee: { label: 'Terminée', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  annulee: { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: Clock }
};

const prioriteConfig = {
  basse: { label: 'Basse', color: 'bg-gray-100 text-gray-800' },
  normale: { label: 'Normale', color: 'bg-blue-100 text-blue-800' },
  haute: { label: 'Haute', color: 'bg-orange-100 text-orange-800' },
  urgente: { label: 'Urgente', color: 'bg-red-100 text-red-800' }
};

export const MissionList: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [prioriteFilter, setPrioriteFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['missions', page, search, statusFilter, prioriteFilter],
    queryFn: () => missionService.getAll({ 
      page, 
      limit: 10, 
      search, 
      statut: statusFilter,
      priorite: prioriteFilter 
    })
  });

  const deleteMissionMutation = useMutation({
    mutationFn: (numIntervention: string) => missionService.delete(numIntervention),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    }
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
        Erreur lors du chargement des missions
      </div>
    );
  }

  const missions = data?.data?.missions || [];

  const handleViewMission = (mission: any) => {
    setSelectedMission(mission);
    setShowViewModal(true);
  };

  const handleEditMission = (mission: any) => {
    setSelectedMission(mission);
    setShowEditModal(true);
  };

  const handleCloseModals = () => {
    setShowEditModal(false);
    setShowViewModal(false);
    setSelectedMission(null);
  };
  const pagination = data?.data?.pagination;

  const handleDeleteMission = async (mission: any) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la mission ${mission.numIntervention} ?`)) {
      try {
        await deleteMissionMutation.mutateAsync(mission.numIntervention);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Missions</h1>
          <p className="text-gray-600">Planifiez et suivez les missions techniques</p>
        </div>
        {hasPermission('missions.create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvelle Mission</span>
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher une mission..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(statusConfig).map(([status, config]) => (
              <option key={status} value={status}>{config.label}</option>
            ))}
          </select>
          <select
            value={prioriteFilter}
            onChange={(e) => setPrioriteFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Toutes les priorités</option>
            {Object.entries(prioriteConfig).map(([priorite, config]) => (
              <option key={priorite} value={priorite}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des missions */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mission
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nature
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priorité
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {missions.map((mission: any) => {
              const statusInfo = statusConfig[mission.statut as keyof typeof statusConfig] || statusConfig.planifiee;
              const prioriteInfo = prioriteConfig[mission.priorite as keyof typeof prioriteConfig] || prioriteConfig.normale;
              const StatusIcon = statusInfo.icon;
              
              return (
                <tr key={mission.numIntervention} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <FileText className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {mission.numIntervention}
                        </div>
                        <div className="text-sm text-gray-500">
                          {mission.objectifDuContrat}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {mission.client?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {mission.client?.customerNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {mission.natureIntervention}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${prioriteInfo.color}`}>
                      {prioriteInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(mission.dateSortieFicheIntervention).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {hasPermission('missions.read') && (
                        <button className="text-blue-600 hover:text-blue-900" title="Voir détails">
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('interventions.read') && (
                        <button className="text-purple-600 hover:text-purple-900" title="Interventions">
                          <Calendar className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('missions.update') && (
                        <button className="text-indigo-600 hover:text-indigo-900" title="Modifier">
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('missions.delete') && (
                        <button 
                          onClick={() => handleDeleteMission(mission)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modales */}
      <CreateMissionModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
    </div>
  );
};