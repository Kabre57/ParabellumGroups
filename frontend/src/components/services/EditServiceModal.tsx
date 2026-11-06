'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { adminServicesService, adminUsersService, type Service } from '@/shared/api/admin';
import { useAuth } from '@/shared/hooks/useAuth';
import { isAdminRole } from '@/shared/permissions';

const editServiceSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  description: z.string().max(500, 'La description ne peut pas dépasser 500 caractères').optional(),
  parentId: z.string().optional(),
  managerId: z.string().optional(),
  isActive: z.boolean().default(true),
});

type EditServiceForm = z.infer<typeof editServiceSchema>;

interface EditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  service: Service | null;
}

export function EditServiceModal({ isOpen, onClose, onSuccess, service }: EditServiceModalProps) {
  const { user: currentUser } = useAuth();
  const canListAllUsers = isAdminRole(currentUser);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<EditServiceForm>({ resolver: zodResolver(editServiceSchema) });

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['admin-services', 'all'],
    queryFn: () => adminServicesService.getServices(true),
    enabled: isOpen,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-list', canListAllUsers ? 'all' : currentUser?.enterpriseId],
    queryFn: async () => {
      const filters = canListAllUsers
        ? { scope: 'all' as const }
        : { enterpriseId: Number(currentUser?.enterpriseId) };
      const firstPage = await adminUsersService.getUsers({ ...filters, limit: 100, page: 1 });
      const pageCount = firstPage.pagination?.totalPages || 1;
      const remainingPages = await Promise.all(
        Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
          adminUsersService.getUsers({ ...filters, limit: 100, page: index + 2 })
        )
      );
      return [...firstPage.data, ...remainingPages.flatMap((response) => response.data)];
    },
    enabled: isOpen && (canListAllUsers || Boolean(currentUser?.enterpriseId)),
  });

  const services = Array.isArray(servicesData?.data) ? servicesData.data : [];
  const users = Array.isArray(usersData) ? usersData : [];
  const managerId = watch('managerId');
  const selectedManager = users.find((user) => String(user.id) === managerId);

  const isDescendantOfCurrentService = (candidate: Service) => {
    let current = candidate;
    const visited = new Set<number>();
    while (current.parentId) {
      if (current.parentId === service?.id) return true;
      if (visited.has(current.parentId)) return true;
      visited.add(current.parentId);
      const parent = services.find((item) => item.id === current.parentId);
      if (!parent) return false;
      current = parent;
    }
    return false;
  };

  const availableParentServices = services.filter((candidate) =>
    (candidate.isActive || candidate.id === service?.parentId) &&
    candidate.id !== service?.id &&
    !isDescendantOfCurrentService(candidate)
  );
  const availableUsers = users.filter((user) => user.isActive || user.id === service?.managerId);

  useEffect(() => {
    if (service) {
      reset({
        name: service.name,
        description: service.description || '',
        parentId: service.parentId?.toString() || '',
        managerId: service.managerId?.toString() || '',
        isActive: service.isActive,
      });
    }
  }, [service, reset]);

  const onSubmit = async (data: EditServiceForm) => {
    if (!service) return;

    try {
      await adminServicesService.updateService(service.id, {
        name: data.name,
        description: data.description,
        parentId: data.parentId ? Number(data.parentId) : null,
        managerId: data.managerId ? Number(data.managerId) : null,
        isActive: data.isActive,
      });

      toast.success('Service modifié avec succès');
      reset();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la modification du service');
    }
  };

  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Modifier le service</h2>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
            <p className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
              Ce service et sa hiérarchie sont communs à toutes les entreprises.
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nom du service *</label>
              <input
                {...register('name')}
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Direction Commerciale"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                {...register('description')}
                rows={2}
                maxLength={500}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Description du service..."
              />
              {errors.description && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Service parent</label>
                <select
                  {...register('parentId')}
                  disabled={servicesLoading}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Aucun (service racine)</option>
                  {availableParentServices.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.parent?.name ? `${candidate.parent.name} › ` : ''}{candidate.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Choisissez un service parent du catalogue global.</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Responsable</label>
                <select
                  {...register('managerId')}
                  disabled={usersLoading}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Aucun</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} — {user.enterprise?.name || 'Sans entreprise'} ({user.email})
                      {!user.isActive ? ' — inactif' : ''}
                    </option>
                  ))}
                </select>
                {selectedManager && selectedManager.role?.code !== 'SERVICE_MANAGER' && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    Cette personne est désignée responsable. Pour gérer les membres, son rôle doit aussi être « Responsable de service ».
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input {...register('isActive')} type="checkbox" id="isActive" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">Service actif</label>
            </div>

            <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <button type="button" onClick={onClose} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                Annuler
              </button>
              <button type="submit" disabled={isSubmitting} className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
