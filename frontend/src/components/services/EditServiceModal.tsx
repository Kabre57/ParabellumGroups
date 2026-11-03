'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { adminServicesService, adminUsersService, type Service } from '@/shared/api/admin';
import { useEnterprise } from '@/shared/providers/EnterpriseProvider';

const editServiceSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caracteres'),
  description: z.string().max(500, 'La description ne peut pas depasser 500 caracteres').optional(),
  enterpriseId: z.string().optional(),
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

export function EditServiceModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  service
}: EditServiceModalProps) {
  const { enterprises, selectedEnterprise } = useEnterprise();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<EditServiceForm>({
    resolver: zodResolver(editServiceSchema),
  });
  const selectedEnterpriseId = watch('enterpriseId') || '';

  const { data: servicesData } = useQuery({
    queryKey: ['admin-services-list', 'all'],
    queryFn: () => adminServicesService.getServices(true, true),
    enabled: isOpen,
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-list', selectedEnterpriseId],
    queryFn: async () => {
      const filters = selectedEnterpriseId
        ? { enterpriseId: Number(selectedEnterpriseId) }
        : { scope: 'all' as const };
      const firstPage = await adminUsersService.getUsers({ ...filters, limit: 100, page: 1 });
      const pageCount = firstPage.pagination?.totalPages || 1;
      const remainingPages = await Promise.all(
        Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
          adminUsersService.getUsers({ ...filters, limit: 100, page: index + 2 })
        )
      );
      return {
        ...firstPage,
        data: [...firstPage.data, ...remainingPages.flatMap((response) => response.data)],
      };
    },
    enabled: isOpen,
  });

  const services = Array.isArray(servicesData?.data) ? servicesData.data : [];
  const users = (Array.isArray(usersData?.data) ? usersData.data : [])
    .filter((user) =>
      user.isActive &&
      (!selectedEnterpriseId || String(user.enterpriseId ?? '') === selectedEnterpriseId)
    );
  const selectedManager = users.find((user) => String(user.id) === watch('managerId'));

  const availableParentServices = services.filter((candidate) => {
    if (candidate.id === service?.id) return false;
    if (!selectedEnterpriseId) return true;
    return String(candidate.enterpriseId ?? candidate.enterprise?.id ?? '') === selectedEnterpriseId;
  });

  const handleParentSelection = (value: string) => {
    setValue('parentId', value);
    if (selectedEnterpriseId || !value) return;
    const selectedParent = availableParentServices.find((candidate) => String(candidate.id) === value);
    const parentEnterpriseId = selectedParent?.enterpriseId ?? selectedParent?.enterprise?.id;
    if (parentEnterpriseId) {
      setValue('enterpriseId', String(parentEnterpriseId));
      setValue('managerId', '');
    }
  };

  const handleManagerSelection = (value: string) => {
    setValue('managerId', value);
    if (selectedEnterpriseId || !value) return;
    const selectedManager = users.find((candidate) => String(candidate.id) === value);
    if (selectedManager?.enterpriseId) {
      setValue('enterpriseId', String(selectedManager.enterpriseId));
      setValue('parentId', '');
    }
  };

  useEffect(() => {
    if (service) {
      reset({
        name: service.name,
        description: service.description || '',
        enterpriseId: service.enterpriseId || service.enterprise?.id
          ? String(service.enterpriseId || service.enterprise?.id)
          : selectedEnterprise ? String(selectedEnterprise.id) : '',
        parentId: service.parentId?.toString() || '',
        managerId: service.managerId?.toString() || '',
        isActive: service.isActive,
      });
    }
  }, [service, reset, selectedEnterprise?.id]);

  const onSubmit = async (data: EditServiceForm) => {
    if (!service) return;

    try {
      await adminServicesService.updateService(service.id, {
        name: data.name,
        description: data.description,
        enterpriseId: data.enterpriseId ? Number(data.enterpriseId) : null,
        parentId: data.parentId ? parseInt(data.parentId) : null,
        managerId: data.managerId ? parseInt(data.managerId) : null,
        isActive: data.isActive,
      });

      toast.success('Service modifie avec succes');
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Modifier le Service
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Entreprise de rattachement
              </label>
              {(() => {
                const enterpriseField = register('enterpriseId');
                return (
                  <select
                    {...enterpriseField}
                    onChange={(event) => {
                      enterpriseField.onChange(event);
                      setValue('parentId', '');
                      setValue('managerId', '');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Aucune entreprise</option>
                    {enterprises.map((enterprise) => (
                      <option key={enterprise.id} value={String(enterprise.id)}>{enterprise.name}</option>
                    ))}
                  </select>
                );
              })()}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Choisissez l’entreprise de ce service. Si aucune n’est choisie, le service reste sans entreprise.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom du service *
              </label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Direction Commerciale"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Description du service..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Service parent
                </label>
                <select
                  {...register('parentId')}
                  onChange={(event) => handleParentSelection(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Aucun (Service racine)</option>
                  {availableParentServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {selectedEnterpriseId ? s.name : `${s.enterprise?.name || 'Sans entreprise'} — ${s.name}`}
                    </option>
                  ))}
                </select>
                {!selectedEnterpriseId && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Choisir un service rattaché sélectionnera aussi son entreprise.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Responsable
                </label>
                <select
                  {...register('managerId')}
                  onChange={(event) => handleManagerSelection(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Aucun</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {selectedEnterpriseId
                        ? `${user.firstName} ${user.lastName} (${user.email})`
                        : `${user.firstName} ${user.lastName} — ${user.enterprise?.name || `Entreprise #${user.enterpriseId}`} (${user.email})`}
                    </option>
                  ))}
                </select>
                {selectedManager && selectedManager.role?.code !== 'SERVICE_MANAGER' && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    Cette personne sera désignée responsable. Pour gérer les membres du service, son profil doit aussi être « Responsable de service ».
                  </p>
                )}
                {!selectedEnterpriseId && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Choisir un responsable rattache aussi le service à son entreprise.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                {...register('isActive')}
                type="checkbox"
                id="isActive"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Service actif
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
