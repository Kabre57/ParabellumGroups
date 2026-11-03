'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { adminRolesService } from '@/shared/api/admin';
import { useEnterprise } from '@/shared/providers/EnterpriseProvider';

const createRoleSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caracteres'),
  enterpriseId: z.string().min(1, 'Sélectionnez une entreprise'),
  description: z.string().max(500, 'La description ne peut pas depasser 500 caracteres').optional(),
});

type CreateRoleForm = z.infer<typeof createRoleSchema>;

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateRoleModal({ isOpen, onClose, onSuccess }: CreateRoleModalProps) {
  const { enterprises } = useEnterprise();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateRoleForm>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { name: '', enterpriseId: '', description: '' },
  });

  const onSubmit = async (data: CreateRoleForm) => {
    try {
      await adminRolesService.createRole({
        name: data.name,
        description: data.description,
        enterpriseId: Number(data.enterpriseId),
      });
      
      toast.success('Role cree avec succes');
      reset();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la creation du role');
    }
  };

  if (!isOpen) return null;

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
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Creer un Role
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
            <div className="rounded-md border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-100">
              Les rôles système restent communs. Choisissez l’entreprise à laquelle rattacher ce profil d’accès.
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Entreprise *</label>
              <select
                {...register('enterpriseId')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                defaultValue=""
              >
                <option value="">Sélectionner une entreprise</option>
                {enterprises.map((enterprise) => (
                  <option key={enterprise.id} value={enterprise.id}>{enterprise.name}</option>
                ))}
              </select>
              {errors.enterpriseId && <p className="mt-1 text-sm text-red-600">{errors.enterpriseId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom du role *
              </label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="Responsable Logistique"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.name.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Le code technique sera généré automatiquement.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="Description du role et de ses responsabilites..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting || enterprises.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creation...' : 'Creer le role'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
