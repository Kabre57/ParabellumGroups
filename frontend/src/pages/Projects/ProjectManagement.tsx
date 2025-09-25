// pages/Projects/ProjectManagement.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Folder, Calendar, Users, Target, Edit, Trash2, Eye, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateProjectModal } from '../../components/Modals/Create/CreateProjectModal';
import { ViewProjectModal } from '../../components/Modals/View/ViewProjectModal';

const projectService = createCrudService('projects');

const statusConfig = {
  PLANNED: { label: 'Planifié', icon: Clock, color: 'bg-blue-100 text-blue-800' },
  IN_PROGRESS: { label: 'En cours', icon: Target, color: 'bg-yellow-100 text-yellow-800' },
  ON_HOLD: { label: 'En attente', icon: Clock, color: 'bg-orange-100 text-orange-800' },
  COMPLETED: { label: 'Terminé', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Annulé', icon: 'XCircle', color: 'bg-red-100 text-red-800' }
};

export const ProjectManagement: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', page, search, statusFilter],
    queryFn: () => projectService.getAll({ 
      page, 
      limit: 10, 
      search, 
      status: statusFilter 
    })
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: number) => projectService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
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
        Erreur lors du chargement des projets
      </div>
    );
  }

  const projects = data?.data?.projects || [];
  const pagination = data?.data?.pagination;

  const handleViewProject = (project: any) => {
    setSelectedProject(project);
    setShowViewModal(true);
  };

  const handleDeleteProject = async (project: any) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le projet ${project.name} ?`)) {
      try {
        await deleteProjectMutation.mutateAsync(project.id);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  const calculateProgress = (project: any) => {
    if (!project.tasks || project.tasks.length === 0) return 0;
    const completedTasks = project.tasks.filter((task: any) => task.status === 'DONE').length;
    return Math.round((completedTasks / project.tasks.length) * 100);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Projets Clients</h1>
          <p className="text-gray-600">Suivez l'avancement de vos projets</p>
        </div>
        {hasPermission('projects.create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau Projet</span>
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
              placeholder="Rechercher un projet..."
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
            <option value="PLANNED">Planifié</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="ON_HOLD">En attente</option>
            <option value="COMPLETED">Terminé</option>
          </select>
        </div>
      </div>

      {/* Modales */}
      <CreateProjectModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
      
      <ViewProjectModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        project={selectedProject}
      />

      {/* Liste des projets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project: any) => {
          const statusInfo = statusConfig[project.status as keyof typeof statusConfig];
          const progress = calculateProgress(project);
          
          return (
            <div key={project.id} className="bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* En-tête du projet */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Folder className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500">{project.customer?.name}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${statusInfo?.color}`}>
                    {statusInfo?.label}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {project.description}
                </p>

                {/* Métriques */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-2" />
                    {new Date(project.startDate).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="h-4 w-4 mr-2" />
                    {project.tasks?.length || 0} tâches
                  </div>
                </div>

                {/* Budget */}
                {project.budget && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700">Budget</div>
                    <div className="text-lg font-semibold text-blue-600">
                      {formatCurrency(project.budget)}
                    </div>
                  </div>
                )}

                {/* Barre de progression */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progression</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex space-x-2">
                    {hasPermission('projects.read') && (
                      <button 
                        onClick={() => handleViewProject(project)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Voir les détails"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {hasPermission('projects.update') && (
                      <button 
                        onClick={() => {/* TODO: Edit modal */}}
                        className="text-indigo-600 hover:text-indigo-900 p-1"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {hasPermission('projects.delete') && (
                    <button 
                      onClick={() => handleDeleteProject(project)}
                      className="text-red-600 hover:text-red-900 p-1"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 rounded-lg">
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
  );
};