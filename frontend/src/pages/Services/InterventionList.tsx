import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Play, 
  Square, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Users,
  FileText,
  Package,
  Calendar,
  Timer
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateInterventionModal } from '../../components/Modals/Create/CreateInterventionModal';
import { InterventionDetailModal } from '../../components/Modals/InterventionDetailModal';
import { EditInterventionModal } from '../../components/Modals/EditInterventionModal';


const interventionService = createCrudService('interventions');

const statusConfig = {
  planifiee: { label: 'Planifiée', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  en_cours: { label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  terminee: { label: 'Terminée', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  annulee: { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: Square }
};

export const InterventionList: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [missionFilter, setMissionFilter] = useState('');
  
  // États pour les modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRapportModal, setShowRapportModal] = useState(false);
  const [showMaterielModal, setShowMaterielModal] = useState(false);
  
  const [selectedIntervention, setSelectedIntervention] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['interventions', page, search, statusFilter, missionFilter],
    queryFn: () => interventionService.getAll({ 
      page, 
      limit: 10, 
      search, 
      statut: statusFilter,
      missionId: missionFilter
    })
  });

  const startInterventionMutation = useMutation({
    mutationFn: (id: number) => 
      fetch(`/api/v1/interventions/${id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
    }
  });

  const endInterventionMutation = useMutation({
    mutationFn: ({ id, commentaire }: { id: number; commentaire?: string }) => 
      fetch(`/api/v1/interventions/${id}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ commentaire })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
    }
  });

  const deleteInterventionMutation = useMutation({
    mutationFn: (id: number) => interventionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
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
        Erreur lors du chargement des interventions
      </div>
    );
  }

  const interventions = data?.data?.interventions || [];
  const pagination = data?.data?.pagination;

  const handleStartIntervention = async (intervention: any) => {
    try {
      await startInterventionMutation.mutateAsync(intervention.id);
    } catch (error) {
      console.error('Erreur lors du démarrage:', error);
    }
  };

  const handleEndIntervention = async (intervention: any) => {
    const commentaire = prompt('Commentaire de fin d\'intervention (optionnel):');
    try {
      await endInterventionMutation.mutateAsync({ id: intervention.id, commentaire: commentaire || undefined });
    } catch (error) {
      console.error('Erreur lors de la fin:', error);
    }
  };

  const handleDeleteIntervention = async (intervention: any) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'intervention ${intervention.id} ?`)) {
      try {
        await deleteInterventionMutation.mutateAsync(intervention.id);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const handleViewDetails = (intervention: any) => {
    setSelectedIntervention(intervention);
    setShowDetailModal(true);
  };

  const handleEditIntervention = (intervention: any) => {
    setSelectedIntervention(intervention);
    setShowEditModal(true);
  };

  const handleAssignTechnicien = (intervention: any) => {
    setSelectedIntervention(intervention);
    setShowAssignModal(true);
  };

  const handleCreateRapport = (intervention: any) => {
    setSelectedIntervention(intervention);
    setShowRapportModal(true);
  };

  const handleSortieMateriel = (intervention: any) => {
    setSelectedIntervention(intervention);
    setShowMaterielModal(true);
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const closeAllModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDetailModal(false);
    setShowAssignModal(false);
    setShowRapportModal(false);
    setShowMaterielModal(false);
    setSelectedIntervention(null);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Interventions</h1>
          <p className="text-gray-600">Planifiez et suivez les interventions techniques</p>
        </div>
        {hasPermission('interventions.create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvelle Intervention</span>
          </button>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Interventions</div>
              <div className="text-2xl font-bold text-gray-900">
                {interventions.length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">En Cours</div>
              <div className="text-2xl font-bold text-gray-900">
                {interventions.filter((i: any) => i.statut === 'en_cours').length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Terminées</div>
              <div className="text-2xl font-bold text-gray-900">
                {interventions.filter((i: any) => i.statut === 'terminee').length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Timer className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Temps Moyen</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatDuration(
                  interventions
                    .filter((i: any) => i.duree)
                    .reduce((sum: number, i: any) => sum + i.duree, 0) / 
                  interventions.filter((i: any) => i.duree).length || 0
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher une intervention..."
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
          <input
            type="text"
            placeholder="N° Mission"
            value={missionFilter}
            onChange={(e) => setMissionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Liste des interventions */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Intervention
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mission
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Techniciens
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Période
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Durée
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {interventions.map((intervention: any) => {
              const statusInfo = statusConfig[intervention.statut as keyof typeof statusConfig] || statusConfig.planifiee;
              const StatusIcon = statusInfo.icon;
              
              return (
                <tr key={intervention.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <Calendar className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          Intervention #{intervention.id}
                        </div>
                        <div className="text-sm text-gray-500">
                          {intervention.commentaire && intervention.commentaire.substring(0, 50)}
                          {intervention.commentaire && intervention.commentaire.length > 50 && '...'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {intervention.mission.numIntervention}
                      </div>
                      <div className="text-sm text-gray-500">
                        {intervention.mission.client.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {intervention.mission.natureIntervention}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {intervention.techniciens.length}
                      </span>
                      {intervention.techniciens.length > 0 && (
                        <div className="ml-2">
                          {intervention.techniciens.slice(0, 2).map((tech: any, index: number) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mr-1">
                              {tech.technicien.prenom} {tech.technicien.nom}
                            </span>
                          ))}
                          {intervention.techniciens.length > 2 && (
                            <span className="text-xs text-gray-500">+{intervention.techniciens.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>Début: {new Date(intervention.dateHeureDebut).toLocaleString()}</div>
                      {intervention.dateHeureFin && (
                        <div>Fin: {new Date(intervention.dateHeureFin).toLocaleString()}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatDuration(intervention.duree)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {hasPermission('interventions.read') && (
                        <button 
                          onClick={() => handleViewDetails(intervention)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir détails"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      
                      {/* Actions selon le statut */}
                      {hasPermission('interventions.update') && intervention.statut === 'planifiee' && (
                        <button 
                          onClick={() => handleStartIntervention(intervention)}
                          className="text-green-600 hover:text-green-900"
                          title="Démarrer"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      
                      {hasPermission('interventions.update') && intervention.statut === 'en_cours' && (
                        <button 
                          onClick={() => handleEndIntervention(intervention)}
                          className="text-red-600 hover:text-red-900"
                          title="Terminer"
                        >
                          <Square className="h-4 w-4" />
                        </button>
                      )}
                      
                      {hasPermission('rapports.create') && (
                        <button 
                          onClick={() => handleCreateRapport(intervention)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Créer rapport"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      )}
                      
                      {hasPermission('materiels.update') && (
                        <button 
                          onClick={() => handleSortieMateriel(intervention)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Sortie matériel"
                        >
                          <Package className="h-4 w-4" />
                        </button>
                      )}
                      
                      {hasPermission('interventions.update') && (
                        <button 
                          onClick={() => handleEditIntervention(intervention)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      
                      {hasPermission('interventions.update') && (
                        <button 
                          onClick={() => handleAssignTechnicien(intervention)}
                          className="text-teal-600 hover:text-teal-900"
                          title="Assigner technicien"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                      )}
                      
                      {hasPermission('interventions.delete') && intervention.statut === 'planifiee' && (
                        <button 
                          onClick={() => handleDeleteIntervention(intervention)}
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

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Affichage de{' '}
                  <span className="font-medium">{(page - 1) * 10 + 1}</span>
                  {' '}à{' '}
                  <span className="font-medium">
                    {Math.min(page * 10, pagination.total)}
                  </span>
                  {' '}sur{' '}
                  <span className="font-medium">{pagination.total}</span>
                  {' '}résultats
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      <CreateInterventionModal 
        isOpen={showCreateModal} 
        onClose={closeAllModals} 
      />
      
      <EditInterventionModal
        isOpen={showEditModal}
        onClose={closeAllModals}
        intervention={selectedIntervention}
      />
      
      <InterventionDetailModal
        isOpen={showDetailModal}
        onClose={closeAllModals}
        intervention={selectedIntervention}
      />
      
    </div>
  );
};