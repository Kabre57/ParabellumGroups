import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Eye, Wrench, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateSpecialiteModal } from '../../components/Modals/Create/CreateSpecialiteModal';

const specialiteService = createCrudService('specialites');

export const SpecialiteList: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSpecialite, setSelectedSpecialite] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['specialites', search],
    queryFn: () => specialiteService.getAll({ search })
  });

  const deleteSpecialiteMutation = useMutation({
    mutationFn: (id: number) => specialiteService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialites'] });
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
        Erreur lors du chargement des spécialités
      </div>
    );
  }

  const specialites = data?.data?.specialites || [];

  const handleDeleteSpecialite = async (specialite: any) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la spécialité ${specialite.libelle} ?`)) {
      try {
        await deleteSpecialiteMutation.mutateAsync(specialite.id);
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
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Spécialités</h1>
          <p className="text-gray-600">Gérez les spécialités techniques de vos techniciens</p>
        </div>
        {hasPermission('specialites.create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvelle Spécialité</span>
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
              placeholder="Rechercher une spécialité..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Grille des spécialités */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {specialites.map((specialite: any) => (
          <div key={specialite.id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Wrench className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{specialite.libelle}</h3>
                  {specialite.description && (
                    <p className="text-sm text-gray-500 mt-1">{specialite.description}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{specialite._count?.techniciens || 0} techniciens</span>
                </div>
                <div className="flex items-center space-x-2">
                  {hasPermission('specialites.read') && (
                    <button 
                      onClick={() => setSelectedSpecialite(specialite)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Voir détails"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  {hasPermission('specialites.update') && (
                    <button className="text-indigo-600 hover:text-indigo-900" title="Modifier">
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                  {hasPermission('specialites.delete') && (
                    <button 
                      onClick={() => handleDeleteSpecialite(specialite)}
                      className="text-red-600 hover:text-red-900"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message si aucune spécialité */}
      {specialites.length === 0 && (
        <div className="text-center py-12">
          <Wrench className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Aucune spécialité trouvée</h3>
          <p className="mt-2 text-sm text-gray-500">
            Commencez par créer des spécialités pour organiser vos techniciens.
          </p>
          {hasPermission('specialites.create') && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Créer une spécialité
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      <CreateSpecialiteModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
    </div>
  );
};