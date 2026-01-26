'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users as UsersIcon,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { CreateServiceModal } from '@/components/Services/CreateServiceModal';
import { EditServiceModal } from '@/components/Services/EditServiceModal';

interface Service {
  id: number;
  name: string;
  code?: string;
  description?: string;
  parentId?: number;
  managerId?: number;
  isActive: boolean;
  parent?: {
    id: number;
    name: string;
  };
  manager?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    members: number;
  };
}

interface ServicesResponse {
  success: boolean;
  data: Service[];
}

export default function ServicesManagementPage() {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const queryClient = useQueryClient();

  // Fetch services
  const { data: servicesData, isLoading } = useQuery<ServicesResponse>({
    queryKey: ['services'],
    queryFn: async () => {
      // TODO: Remplacer par l'appel API réel
      // return apiClient.get('/api/v1/services');
      
      // Données mockées temporaires
      const mockServices: Service[] = [
        {
          id: 1,
          name: 'Direction Générale',
          code: 'DG',
          description: 'Direction générale de l\'entreprise',
          isActive: true,
          _count: { members: 5 },
        },
        {
          id: 2,
          name: 'Direction Commerciale',
          code: 'COMM',
          description: 'Service commercial et ventes',
          parentId: 1,
          parent: { id: 1, name: 'Direction Générale' },
          managerId: 2,
          manager: {
            id: 2,
            firstName: 'Jean',
            lastName: 'Dupont',
            email: 'jean.dupont@parabellum.fr',
          },
          isActive: true,
          _count: { members: 12 },
        },
        {
          id: 3,
          name: 'Direction Technique',
          code: 'TECH',
          description: 'Service technique et interventions',
          parentId: 1,
          parent: { id: 1, name: 'Direction Générale' },
          isActive: true,
          _count: { members: 8 },
        },
      ];

      return {
        success: true,
        data: mockServices,
      };
    }
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      // TODO: Remplacer par l'appel API réel
      // return apiClient.delete(`/api/v1/services/${serviceId}`);
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression du service');
    }
  });

  const handleDeleteService = (service: Service) => {
    if (service._count && service._count.members > 0) {
      toast.error(`Impossible de supprimer : ${service._count.members} membre(s) assigné(s)`);
      return;
    }

    if (confirm(`Êtes-vous sûr de vouloir supprimer le service "${service.name}" ?`)) {
      deleteServiceMutation.mutate(service.id);
    }
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setShowEditModal(true);
  };

  const handleCreateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['services'] });
    setShowCreateModal(false);
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['services'] });
    setShowEditModal(false);
  };

  const services = servicesData?.data || [];
  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Services</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gérez les services et départements de l'entreprise
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Service
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Rechercher un service (nom, code...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Service
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Responsable
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Membres
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
                </td>
              </tr>
            ) : filteredServices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucun service</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Commencez par créer un service</p>
                </td>
              </tr>
            ) : (
              filteredServices.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        {service.parent && (
                          <>
                            <span className="text-gray-400 text-xs mr-1">{service.parent.name}</span>
                            <ChevronRight className="h-3 w-3 text-gray-400 mr-1" />
                          </>
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {service.name}
                        </span>
                        {service.code && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                            {service.code}
                          </span>
                        )}
                      </div>
                      {service.description && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {service.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {service.manager ? (
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {service.manager.firstName} {service.manager.lastName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {service.manager.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <UsersIcon className="h-4 w-4 mr-1" />
                      {service._count?.members || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      service.isActive 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                    }`}>
                      {service.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleEditService(service)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteService(service)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
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

      {/* Modales */}
      <CreateServiceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
        services={services}
        users={[]} // TODO: Charger la liste des utilisateurs
      />

      <EditServiceModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        service={selectedService}
        onSuccess={handleEditSuccess}
        services={services}
        users={[]} // TODO: Charger la liste des utilisateurs
      />
    </div>
  );
}
