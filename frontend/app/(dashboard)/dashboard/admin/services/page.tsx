'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { CreateServiceModal } from '@/components/services/CreateServiceModal';
import { EditServiceModal } from '@/components/services/EditServiceModal';
import { adminServicesService, type Service } from '@/shared/api/admin';

export default function ServicesManagementPage() {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const queryClient = useQueryClient();

  const { data: servicesData, isLoading, error } = useQuery({
    queryKey: ['admin-services'],
    queryFn: () => adminServicesService.getServices(true),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (serviceId: number) => adminServicesService.deleteService(serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      toast.success('Service supprime avec succes');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression');
    }
  });

  const handleDeleteService = (service: Service) => {
    if (confirm(`Supprimer le service "${service.name}" ?`)) {
      deleteServiceMutation.mutate(service.id);
    }
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setShowEditModal(true);
  };

  const handleCreateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    setShowCreateModal(false);
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    setShowEditModal(false);
  };

  const services = servicesData?.data || [];
  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase())
  );

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Erreur lors du chargement des services</p>
        <p className="text-sm text-red-600 mt-1">{(error as any)?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Services</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerez les services et departements de l'entreprise
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Service
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Rechercher un service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsable</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-500">Chargement...</p>
                </td>
              </tr>
            ) : filteredServices.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun service</h3>
                  <p className="mt-1 text-sm text-gray-500">Commencez par creer un service</p>
                </td>
              </tr>
            ) : (
              filteredServices.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        {service.parent && (
                          <>
                            <span className="text-gray-400 text-xs mr-1">{service.parent.name}</span>
                            <ChevronRight className="h-3 w-3 text-gray-400 mr-1" />
                          </>
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {service.name}
                        </span>
                        {service.code && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {service.code}
                          </span>
                        )}
                      </div>
                      {service.description && (
                        <span className="text-sm text-gray-500 mt-1">
                          {service.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {service.manager ? (
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {service.manager.firstName} {service.manager.lastName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {service.manager.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      service.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {service.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
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
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateServiceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditServiceModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        service={selectedService}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
