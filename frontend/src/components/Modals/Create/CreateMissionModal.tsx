import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, FileText, Calendar, User, Target, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const missionService = createCrudService('missions');
const customerService = createCrudService('customers');

const createMissionSchema = z.object({
  natureIntervention: z.string().min(1, 'Nature d\'intervention requise'),
  objectifDuContrat: z.string().min(1, 'Objectif du contrat requis'),
  description: z.string().optional(),
  priorite: z.enum(['basse', 'normale', 'haute', 'urgente']).default('normale'),
  dateSortieFicheIntervention: z.string().min(1, 'Date de sortie requise'),
  clientId: z.number().min(1, 'Client requis')
});

type CreateMissionFormData = z.infer<typeof createMissionSchema>;

interface CreateMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateMissionModal: React.FC<CreateMissionModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getAll({ limit: 100 })
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CreateMissionFormData>({
    resolver: zodResolver(createMissionSchema),
    defaultValues: {
      priorite: 'normale',
      dateSortieFicheIntervention: new Date().toISOString().split('T')[0]
    }
  });

  const createMissionMutation = useMutation({
    mutationFn: (data: CreateMissionFormData) => missionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateMissionFormData) => {
    setIsLoading(true);
    try {
      await createMissionMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const customersList = customers?.data?.customers || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Créer une Mission
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                {...register('clientId', { valueAsNumber: true })}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un client</option>
                {customersList.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.customerNumber})
                  </option>
                ))}
              </select>
            </div>
            {errors.clientId && <p className="mt-1 text-sm text-red-600">{errors.clientId.message}</p>}
          </div>

          {/* Nature et objectif */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nature de l'intervention</label>
              <select
                {...register('natureIntervention')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner</option>
                <option value="Installation">Installation</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Réparation">Réparation</option>
                <option value="Dépannage">Dépannage</option>
                <option value="Contrôle">Contrôle</option>
                <option value="Formation">Formation</option>
              </select>
              {errors.natureIntervention && <p className="mt-1 text-sm text-red-600">{errors.natureIntervention.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
              <div className="relative">
                <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  {...register('priorite')}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="basse">Basse</option>
                  <option value="normale">Normale</option>
                  <option value="haute">Haute</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objectif du contrat</label>
            <div className="relative">
              <Target className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
              <textarea
                {...register('objectifDuContrat')}
                rows={3}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Objectif principal de cette mission..."
              />
            </div>
            {errors.objectifDuContrat && <p className="mt-1 text-sm text-red-600">{errors.objectifDuContrat.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description détaillée</label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Description détaillée de la mission, contexte, contraintes..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de sortie de la fiche d'intervention</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                {...register('dateSortieFicheIntervention')}
                type="date"
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {errors.dateSortieFicheIntervention && <p className="mt-1 text-sm text-red-600">{errors.dateSortieFicheIntervention.message}</p>}
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
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Création...' : 'Créer la mission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};