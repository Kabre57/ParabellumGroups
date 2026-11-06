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

interface ServicesTableProps {
  title: string;
  emptyMessage: string;
  services: Service[];
  isLoading: boolean;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

function ServicesTable({ title, emptyMessage, services, isLoading, onEdit, onDelete }: ServicesTableProps) {
  return (
    <section className="overflow-hidden rounded-lg bg-white shadow">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{services.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Service</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Responsable</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Statut</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">Chargement...</td>
              </tr>
            ) : services.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center">
                  <Building2 className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">{emptyMessage}</p>
                </td>
              </tr>
            ) : services.map((service) => (
              <tr key={service.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      {service.parent && (
                        <>
                          <span className="mr-1 text-xs text-gray-400">{service.parent.name}</span>
                          <ChevronRight className="mr-1 h-3 w-3 text-gray-400" />
                        </>
                      )}
                      <span className="text-sm font-medium text-gray-900">{service.name}</span>
                    </div>
                    {service.description && <span className="mt-1 text-sm text-gray-500">{service.description}</span>}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {service.manager ? (
                    <div className="flex flex-col">
                      <span className="font-medium">{service.manager.firstName} {service.manager.lastName}</span>
                      <span className="text-xs text-gray-500">{service.manager.email}</span>
                    </div>
                  ) : <span className="text-gray-400">-</span>}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    service.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {service.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => onEdit(service)} className="text-indigo-600 hover:text-indigo-900" title="Modifier">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(service)} className="text-red-600 hover:text-red-900" title="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ServicesManagementPage() {
  const [search, setSearch] = useState('');
  const [createMode, setCreateMode] = useState<'parent' | 'child' | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const queryClient = useQueryClient();

  const { data: servicesData, isLoading, error } = useQuery({
    queryKey: ['admin-services', 'all'],
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
    setCreateMode(null);
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    setShowEditModal(false);
  };

  const services = Array.isArray(servicesData?.data) ? servicesData.data : [];
  const filteredServices = services.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase())
  );
  const parentServices = filteredServices.filter((service) => !service.parentId);
  const childServices = filteredServices.filter((service) => Boolean(service.parentId));

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Services</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez le catalogue de services commun à toutes les entreprises.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCreateMode('parent')}
            className="inline-flex items-center rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouveau service parent
          </button>
          <button
            onClick={() => setCreateMode('child')}
            disabled={!services.some((service) => service.isActive)}
            title={!services.some((service) => service.isActive) ? 'Créez d’abord un service parent' : undefined}
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouveau service
          </button>
        </div>
      </div>
      {!isLoading && !services.some((service) => service.isActive) && (
        <p className="text-sm text-gray-500">Créez d’abord un service parent pour pouvoir ajouter des services rattachés.</p>
      )}

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

      <ServicesTable
        title="Services parents"
        emptyMessage="Aucun service parent. Créez d’abord un service parent."
        services={parentServices}
        isLoading={isLoading}
        onEdit={handleEditService}
        onDelete={handleDeleteService}
      />

      <ServicesTable
        title="Services rattachés"
        emptyMessage="Aucun service rattaché à un parent."
        services={childServices}
        isLoading={isLoading}
        onEdit={handleEditService}
        onDelete={handleDeleteService}
      />

      <CreateServiceModal
        isOpen={createMode !== null}
        mode={createMode || 'parent'}
        onClose={() => setCreateMode(null)}
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
