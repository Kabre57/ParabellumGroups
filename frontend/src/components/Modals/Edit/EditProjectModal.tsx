// components/Modals/Edit/EditProjectModal.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, FolderKanban, Calendar, User, DollarSign, Target, Save } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const projectService = createCrudService('projects');
const customerService = createCrudService('customers');
const userService = createCrudService('users');

const editProjectSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  customerId: z.number().min(1, 'Client requis'),
  startDate: z.string().min(1, 'Date de début requise'),
  endDate: z.string().optional(),
  budget: z.number().min(0).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
  managerId: z.number().min(1, 'Responsable requis')
});

type EditProjectFormData = z.infer<typeof editProjectSchema>;

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({ isOpen, onClose, project }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getAll({ limit: 100 })
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getAll({ limit: 100 })
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch
  } = useForm<EditProjectFormData>({
    resolver: zodResolver(editProjectSchema)
  });

  useEffect(() => {
    if (project) {
      setValue('name', project.name || '');
      setValue('description', project.description || '');
      setValue('customerId', project.customerId);
      setValue('startDate', project.startDate?.split('T')[0] || '');
      setValue('endDate', project.endDate?.split('T')[0] || '');
      setValue('budget', project.budget || 0);
      setValue('priority', project.priority || 'medium');
      setValue('status', project.status || 'PLANNED');
      setValue('managerId', project.managerId);
    }
  }, [project, setValue]);

  const updateProjectMutation = useMutation({
    mutationFn: (data: EditProjectFormData) => projectService.update(project.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    }
  });

  const onSubmit = async (data: EditProjectFormData) => {
    setIsLoading(true);
    try {
      await updateProjectMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !project) return null;

  const customers = customersData?.data?.customers || [];
  const users = usersData?.data?.users || [];
  const status = watch('status');

  const getStatusColor = (status: string) => {
    const colors = {
      'PLANNED': 'bg-blue-100 text-blue-800',
      'IN_PROGRESS': 'bg-yellow-100 text-yellow-800',
      'ON_HOLD': 'bg-orange-100 text-orange-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'PLANNED': 'Planifié',
      'IN_PROGRESS': 'En cours',
      'ON_HOLD': 'En attente',
      'COMPLETED': 'Terminé',
      'CANCELLED': 'Annulé'
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FolderKanban className="h-5 w-5 mr-2" />
            Modifier le Projet {project.name}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Informations de base */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du projet *</label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Client et responsable */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <select
                {...register('customerId', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un client</option>
                {customers.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {errors.customerId && <p className="mt-1 text-sm text-red-600">{errors.customerId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsable *</label>
              <select
                {...register('managerId', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un responsable</option>
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
              {errors.managerId && <p className="mt-1 text-sm text-red-600">{errors.managerId.message}</p>}
            </div>
          </div>

          {/* Dates et budget */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de début *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('startDate')}
                  type="date"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('endDate')}
                  type="date"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget (FCFA)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('budget', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Statut et priorité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut *</label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="PLANNED">Planifié</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="ON_HOLD">En attente</option>
                <option value="COMPLETED">Terminé</option>
                <option value="CANCELLED">Annulé</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
          </div>

          {/* Indicateur de statut */}
          <div className={`p-3 rounded-lg border ${getStatusColor(status)}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Statut actuel: {getStatusLabel(status)}</div>
                <div className="text-sm opacity-75">
                  {status === 'PLANNED' && 'Le projet est en phase de planification'}
                  {status === 'IN_PROGRESS' && 'Le projet est en cours de réalisation'}
                  {status === 'ON_HOLD' && 'Le projet est temporairement suspendu'}
                  {status === 'COMPLETED' && 'Le projet est terminé avec succès'}
                  {status === 'CANCELLED' && 'Le projet a été annulé'}
                </div>
              </div>
              <Target className="h-8 w-8 opacity-50" />
            </div>
          </div>

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading || !isDirty}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};