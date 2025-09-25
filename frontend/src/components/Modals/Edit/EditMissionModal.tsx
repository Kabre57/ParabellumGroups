import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, FileText, Calendar, User, Target, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const missionService = createCrudService('missions');
const customerService = createCrudService('customers');

const editMissionSchema = z.object({
  natureIntervention: z.string().min(1, 'Nature d\'intervention requise'),
  objectifDuContrat: z.string().min(1, 'Objectif du contrat requis'),
  description: z.string().optional(),
  priorite: z.enum(['basse', 'normale', 'haute', 'urgente']).default('normale'),
  dateSortieFicheIntervention: z.string().min(1, 'Date de sortie requise'),
  clientId: z.number().min(1, 'Client requis')
});

type EditMissionFormData = z.infer<typeof editMissionSchema>;

interface EditMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mission: any;
}

const prioriteLabels = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
  urgente: 'Urgente'
};

const prioriteColors = {
  basse: 'text-green-600',
  normale: 'text-blue-600',
  haute: 'text-orange-600',
  urgente: 'text-red-600'
};

export const EditMissionModal: React.FC<EditMissionModalProps> = ({ isOpen, onClose, mission }) => {
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
    reset,
    watch
  } = useForm<EditMissionFormData>({
    resolver: zodResolver(editMissionSchema),
    defaultValues: {
      natureIntervention: mission?.natureIntervention || '',
      objectifDuContrat: mission?.objectifDuContrat || '',
      description: mission?.description || '',
      priorite: mission?.priorite || 'normale',
      dateSortieFicheIntervention: mission?.dateSortieFicheIntervention ? 
        new Date(mission.dateSortieFicheIntervention).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0],
      clientId: mission?.clientId || 0
    }
  });

  const selectedPriorite = watch('priorite');

  const updateMissionMutation = useMutation({
    mutationFn: (data: EditMissionFormData) => missionService.update(mission.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: EditMissionFormData) => {
    setIsLoading(true);
    try {
      await updateMissionMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !mission) return null;

  const customersList = customers?.data?.customers || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Modifier la Mission {mission.missionNumber}
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
                  <option key={customer.id} value={customer.id} selected={customer.id === mission.clientId}>
                    {customer.name} ({customer.customerNumber})
                  </option>
                ))}
              </select>
            </div>
            {errors.clientId && <p className="mt-1 text-sm text-red-600">{errors.clientId.message}</p>}
          </div>

          {/* Nature d'intervention */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nature d'intervention</label>
            <div className="relative">
              <Target className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
              <textarea
                {...register('natureIntervention')}
                rows={3}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Décrivez la nature de l'intervention..."
              />
            </div>
            {errors.natureIntervention && <p className="mt-1 text-sm text-red-600">{errors.natureIntervention.message}</p>}
          </div>

          {/* Objectif du contrat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objectif du contrat</label>
            <textarea
              {...register('objectifDuContrat')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Définissez l'objectif du contrat..."
            />
            {errors.objectifDuContrat && <p className="mt-1 text-sm text-red-600">{errors.objectifDuContrat.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description complémentaire</label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Informations complémentaires sur la mission..."
            />
          </div>

          {/* Priorité et Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
              <div className="relative">
                <AlertCircle className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${prioriteColors[selectedPriorite as keyof typeof prioriteColors]}`} />
                <select
                  {...register('priorite')}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(prioriteLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de sortie fiche intervention</label>
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
          </div>

          {/* Indicateur de priorité */}
          <div className={`p-3 rounded-lg border-l-4 ${
            selectedPriorite === 'urgente' ? 'bg-red-50 border-red-400' :
            selectedPriorite === 'haute' ? 'bg-orange-50 border-orange-400' :
            selectedPriorite === 'normale' ? 'bg-blue-50 border-blue-400' :
            'bg-green-50 border-green-400'
          }`}>
            <div className="flex items-center">
              <AlertCircle className={`h-5 w-5 mr-2 ${prioriteColors[selectedPriorite as keyof typeof prioriteColors]}`} />
              <span className={`text-sm font-medium ${prioriteColors[selectedPriorite as keyof typeof prioriteColors]}`}>
                Priorité: {prioriteLabels[selectedPriorite as keyof typeof prioriteLabels]}
              </span>
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
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Modification...' : 'Modifier la mission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

