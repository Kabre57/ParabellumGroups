import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Eye, Package, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateMaterielModal } from '../../components/Modals/Create/CreateMaterielModal';

const materielService = createCrudService('materiels');

const statutConfig = {
  actif: { label: 'Actif', color: 'bg-green-100 text-green-800' },
  maintenance: { label: 'En maintenance', color: 'bg-yellow-100 text-yellow-800' },
  hors_service: { label: 'Hors service', color: 'bg-red-100 text-red-800' },
  retire: { label: 'Retiré', color: 'bg-gray-100 text-gray-800' }
};

export const MaterielList: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categorieFilter, setCategorieFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['materiels', page, search, categorieFilter],
    queryFn: () => materielService.getAll({ page, limit: 10, search, categorie: categorieFilter })
  });

  const deleteMaterielMutation = useMutation({
    mutationFn: (id: number) => materielService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiels'] });
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
        Erreur lors du chargement du matériel
      </div>
    );
  }

  const materiels = data?.data?.materiels || [];
  const pagination = data?.data?.pagination;

  const handleDeleteMateriel = async (materiel: any) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le matériel ${materiel.designation} ?`)) {
      try {
        await deleteMaterielMutation.mutateAsync(materiel.id);
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
          <h1 className="text-2xl font-bold text-gray-900">Gestion du Matériel</h1>
          <p className="text-gray-600">Gérez l'inventaire et les mouvements de matériel</p>
        </div>
        {hasPermission('materiels.create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau Matériel</span>
          </button>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Articles</div>
              <div className="text-2xl font-bold text-gray-900">
                {materiels.length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Disponible</div>
              <div className="text-2xl font-bold text-gray-900">
                {materiels.reduce((sum: number, m: any) => sum + m.quantiteDisponible, 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">En Sortie</div>
              <div className="text-2xl font-bold text-gray-900">
                {materiels.reduce((sum: number, m: any) => sum + (m.quantiteTotale - m.quantiteDisponible), 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Alertes Stock</div>
              <div className="text-2xl font-bold text-gray-900">
                {materiels.filter((m: any) => m.quantiteDisponible <= m.seuilAlerte).length}
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
              placeholder="Rechercher du matériel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={categorieFilter}
            onChange={(e) => setCategorieFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Toutes les catégories</option>
            <option value="Outillage">Outillage</option>
            <option value="Électrique">Électrique</option>
            <option value="Plomberie">Plomberie</option>
            <option value="Climatisation">Climatisation</option>
            <option value="Informatique">Informatique</option>
          </select>
        </div>
      </div>

      {/* Liste du matériel */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Matériel
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Catégorie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Emplacement
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prix unitaire
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
            {materiels.map((materiel: any) => {
              const isLowStock = materiel.quantiteDisponible <= materiel.seuilAlerte;
              const statutInfo = statutConfig[materiel.statut as keyof typeof statutConfig] || statutConfig.actif;
              
              return (
                <tr key={materiel.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {materiel.designation}
                        </div>
                        <div className="text-sm text-gray-500">
                          Réf: {materiel.reference}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      {materiel.categorie}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className={`font-medium ${isLowStock ? 'text-red-600' : ''}`}>
                        {materiel.quantiteDisponible} / {materiel.quantiteTotale}
                      </div>
                      {isLowStock && (
                        <div className="flex items-center text-xs text-red-500">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Stock faible
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {materiel.emplacement || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {materiel.prixUnitaire ? 
                      new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'XOF'
                      }).format(materiel.prixUnitaire) : 'N/A'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statutInfo.color}`}>
                      {statutInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {hasPermission('materiels.read') && (
                        <button className="text-blue-600 hover:text-blue-900" title="Voir détails">
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('materiels.update') && (
                        <button className="text-indigo-600 hover:text-indigo-900" title="Modifier">
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('materiels.delete') && (
                        <button 
                          onClick={() => handleDeleteMateriel(materiel)}
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
      <CreateMaterielModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
    </div>
  );
};