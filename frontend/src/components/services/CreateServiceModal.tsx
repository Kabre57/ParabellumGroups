'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { adminServicesService, adminUsersService } from '@/shared/api/admin';

const createServiceSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  description: z.string().max(500, 'La description ne peut pas dépasser 500 caractères').optional(),
  parentId: z.string().optional(),
  managerId: z.string().optional(),
});

type CreateServiceForm = z.infer<typeof createServiceSchema>;

interface CreateServiceModalProps {
  isOpen: boolean;
  mode: 'parent' | 'child';
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateServiceModal({ isOpen, mode, onClose, onSuccess }: CreateServiceModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<CreateServiceForm>({ resolver: zodResolver(createServiceSchema) });

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['admin-services', 'active'],
    queryFn: () => adminServicesService.getServices(),
    enabled: isOpen,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-list', 'all-active'],
    queryFn: async () => {
      const firstPage = await adminUsersService.getUsers({ scope: 'all', limit: 100, page: 1 });
      const pageCount = firstPage.pagination?.totalPages || 1;
      const remainingPages = await Promise.all(
        Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
          adminUsersService.getUsers({ scope: 'all', limit: 100, page: index + 2 })
        )
      );
      return [...firstPage.data, ...remainingPages.flatMap((response) => response.data)];
    },
    enabled: isOpen,
  });

  const services = Array.isArray(servicesData?.data) ? servicesData.data : [];
  const users = (usersData || []).filter((user) => user.isActive);
  const selectedManager = users.find((user) => String(user.id) === (watch('managerId') || ''));

  useEffect(() => {
    if (isOpen) reset({ name: '', description: '', parentId: '', managerId: '' });
  }, [isOpen, mode, reset]);

  const onSubmit = async (data: CreateServiceForm) => {
    if (mode === 'child' && !data.parentId) {
      toast.error('Sélectionnez le service parent de ce service.');
      return;
    }

    try {
      await adminServicesService.createService({
        name: data.name,
        description: data.description,
        parentId: mode === 'child' ? Number(data.parentId) : undefined,
        managerId: data.managerId ? Number(data.managerId) : undefined,
      });

      toast.success(mode === 'parent'
        ? 'Service parent créé dans le catalogue global.'
        : 'Service créé et rattaché à son parent.');
      reset();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création du service');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {mode === 'parent' ? 'Créer un service parent' : 'Créer un service'}
              </h2>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
            <p className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
              {mode === 'parent'
                ? 'Ce service sera créé à la racine. Vous pourrez ensuite créer des services rattachés.'
                : 'Ce service sera disponible dans tout le système et rattaché au parent choisi.'}
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
              {mode === 'child' ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Service parent *</label>
                  <select
                    {...register('parentId')}
                    required
                    disabled={servicesLoading}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Sélectionner un service parent</option>
                    {services.filter((service) => service.isActive).map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.parent?.name ? `${service.parent.name} › ` : ''}{service.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">La hiérarchie est commune à toutes les entreprises.</p>
                </div>
              ) : (
                <div className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
                  Service parent racine — aucun parent à sélectionner.
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Responsable</label>
                <select
                  {...register('managerId')}
                  disabled={usersLoading}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Aucun</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} — {user.enterprise?.name || 'Sans entreprise'} ({user.email})
                    </option>
                  ))}
                </select>
                {selectedManager && selectedManager.role?.code !== 'SERVICE_MANAGER' && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    Pour gérer les membres du service, son rôle doit aussi être « Responsable de service ».
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <button type="button" onClick={onClose} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                Annuler
              </button>
              <button type="submit" disabled={isSubmitting} className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                {isSubmitting ? 'Création…' : mode === 'parent' ? 'Créer le service parent' : 'Créer le service'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
