'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleApi, Role } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

const roleSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  description: z.string().optional(),
});

type RoleFormData = z.infer<typeof roleSchema>;

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['roles', page],
    queryFn: () => roleApi.getAll({ page, limit: 10 }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
  });

  const createMutation = useMutation({
    mutationFn: roleApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rôle créé avec succès');
      setIsModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la création');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, actif }: { id: string; actif: boolean }) =>
      roleApi.updateStatus(id, actif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Statut mis à jour');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: roleApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rôle supprimé');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  const onSubmit = async (formData: RoleFormData) => {
    if (editingRole) {
      toast.info('Mise à jour à implémenter');
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleToggleStatus = (role: Role) => {
    const currentStatus = role.actif ?? role.isActive ?? false;
    updateStatusMutation.mutate({ id: role.id, actif: !currentStatus });
  };

  const handleDelete = (roleId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rôle ?')) {
      deleteMutation.mutate(roleId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Erreur lors du chargement des rôles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rôles</h1>
          <p className="text-gray-600 mt-1">Gérez les rôles et permissions du système</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          Nouveau rôle
        </Button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(data?.data || []).map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{role.nom || role.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">{role.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (role.actif ?? role.isActive)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {(role.actif ?? role.isActive) ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {role.permissions?.length || role._count?.rolePermissions || 0} permission(s)
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleToggleStatus(role)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {(role.actif ?? role.isActive) ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      onClick={() => handleDelete(role.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {data?.page} sur {data?.pages} ({data?.total} rôles)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page === data?.pages}
            >
              Suivant
            </Button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Nouveau rôle</h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  reset();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du rôle
                </label>
                <Input {...register('nom')} placeholder="Ex: Administrateur" />
                {errors.nom && (
                  <p className="mt-1 text-sm text-red-500">{errors.nom.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  placeholder="Description du rôle..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    reset();
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Création...' : 'Créer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
