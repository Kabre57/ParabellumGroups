'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { adminPermissionsService, type Permission } from '@/shared/api/admin/admin.service';

const editPermissionSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caracteres'),
  code: z.string().min(2, 'Le code doit contenir au moins 2 caracteres'),
  category: z.string().min(1, 'La categorie est requise'),
  description: z.string().optional(),
});

type EditPermissionFormData = z.infer<typeof editPermissionSchema>;

interface EditPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  permission: Permission | null;
}

export const EditPermissionModal: React.FC<EditPermissionModalProps> = ({ isOpen, onClose, onSuccess, permission }) => {
  const { data: categoriesData } = useQuery({
    queryKey: ['admin-permission-categories'],
    queryFn: () => adminPermissionsService.getPermissionCategories(),
    enabled: isOpen,
  });

  const categories = Array.isArray(categoriesData?.data) ? categoriesData.data : [];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue
  } = useForm<EditPermissionFormData>({
    resolver: zodResolver(editPermissionSchema),
  });

  const [customCategory, setCustomCategory] = React.useState(false);

  useEffect(() => {
    if (permission && isOpen) {
      reset({
        name: permission.name,
        code: (permission as any).code || '',
        category: permission.category,
        description: permission.description || '',
      });
      setCustomCategory(false);
    }
  }, [permission, isOpen, reset]);

  const onSubmit = async (data: EditPermissionFormData) => {
    if (!permission) return;
    try {
      await adminPermissionsService.updatePermission(permission.id, data);
      toast.success('Permission mise a jour avec succes');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Erreur mise a jour permission:', error);
      toast.error(error?.message || 'Erreur lors de la mise a jour');
    }
  };

  if (!isOpen || !permission) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Shield className="h-5 w-5 mr-2 text-blue-600" />
            Modifier la Permission
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" type="button">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom *
            </label>
            <input
              {...register('name')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Gestion des utilisateurs"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Code *
            </label>
            <input
              {...register('code')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="users.manage"
            />
            <p className="mt-1 text-xs text-gray-500">Format recommande: module.action (ex: users.read, invoices.create)</p>
            {errors.code && (
              <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Categorie *
            </label>
            {!customCategory ? (
              <div className="space-y-2">
                <select
                  {...register('category')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Selectionner une categorie</option>
                  {categories.map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setCustomCategory(true)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Creer une nouvelle categorie
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  {...register('category')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Nouvelle categorie"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomCategory(false);
                    setValue('category', permission.category);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Choisir une categorie existante
                </button>
              </div>
            )}
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Description de la permission..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Mise a jour...' : 'Mettre a jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
