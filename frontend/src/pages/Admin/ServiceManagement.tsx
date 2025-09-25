import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Eye, Building2, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateServiceModal } from '../../components/Modals/Create/CreateServiceModal';
import { EditServiceModal } from '../../components/Modals/Edit/EditServiceModal';
import { ViewServiceModal } from '../../components/Modals/View/ViewServiceModal';

const serviceService = createCrudService('services');

export const ServiceManagement: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false); // Ajouté
  const [selectedService, setSelectedService] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['services', search],
    queryFn: () => serviceService.getAll({ search })
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: number) => serviceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
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
        Erreur lors du chargement des services
      </div>
    );
  }

  const services = data?.data?.services || [];

  const handleViewService = (service: any) => {
    setSelectedService(service);
    setShowViewModal(true);
  };

  const handleEditService = (service: any) => {
    setSelectedService(service);
    setShowEditModal(true);
  };

  const handleCloseModals = () => {
    setShowEditModal(false);
    setShowViewModal(false); // Ajouté
    setSelectedService(null);
  };

  const handleDeleteService = async (service: any) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le service ${service.name} ?`)) {
      try {
        await deleteServiceMutation.mutateAsync(service.id);
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
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Services</h1>
          <p className="text-gray-600">Organisez votre entreprise en services</p>
        </div>
        {hasPermission('admin.system_settings') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau Service</span>
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
              placeholder="Rechercher un service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Grille des services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service: any) => (
          <div key={service.id} className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{service.name}</h3>
                  <p className="text-sm text-gray-500">{service.description}</p>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{service._count?.users || 0} utilisateurs</span>
                </div>
                <div className="flex items-center space-x-2">
                  {hasPermission('admin.system_settings') && (
                    <>
                      <button 
                        onClick={() => handleViewService(service)} // Corrigé
                        className="text-blue-600 hover:text-blue-900"
                        title="Voir"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleEditService(service)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteService(service)}
                        className="text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message si aucun service */}
      {services.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun service trouvé</h3>
          <p className="mt-2 text-sm text-gray-500">
            Commencez par créer un service pour organiser votre entreprise.
          </p>
          {hasPermission('admin.system_settings') && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Créer un service
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      <CreateServiceModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
      
      <EditServiceModal 
        isOpen={showEditModal} 
        onClose={handleCloseModals}
        service={selectedService}
      />
      
      <ViewServiceModal 
        isOpen={showViewModal} 
        onClose={handleCloseModals}
        service={selectedService}
      />
    </div>
  );
};