// src/components/Modals/Create/CreateTimeOffRequestModal.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, Clock } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const calendarService = createCrudService('calendar');

const createTimeOffSchema = z.object({
  type: z.enum(['VACATION', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT']),
  startDate: z.string().min(1, 'Date de début requise'),
  endDate: z.string().min(1, 'Date de fin requise'),
  reason: z.string().min(1, 'Raison requise'),
  notes: z.string().optional()
});

type CreateTimeOffFormData = z.infer<typeof createTimeOffSchema>;

interface CreateTimeOffRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTimeOffRequestModal: React.FC<CreateTimeOffRequestModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<CreateTimeOffFormData>({
    resolver: zodResolver(createTimeOffSchema),
    defaultValues: {
      type: 'VACATION',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const createTimeOffMutation = useMutation({
    mutationFn: (data: CreateTimeOffFormData) => calendarService.create({
      ...data,
      type: 'TIMEOFF'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateTimeOffFormData) => {
    setIsLoading(true);
    try {
      await createTimeOffMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDuration = () => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Nouvelle Demande de Congé
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Type de congé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de congé *</label>
            <select
              {...register('type')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="VACATION">Congés payés</option>
              <option value="SICK">Maladie</option>
              <option value="PERSONAL">Personnel</option>
              <option value="MATERNITY">Maternité</option>
              <option value="PATERNITY">Paternité</option>
              <option value="BEREAVEMENT">Deuil</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('endDate')}
                  type="date"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
            </div>
          </div>

          {/* Durée */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
            <div className="bg-gray-50 p-3 rounded-md">
              <span className="text-lg font-semibold">{calculateDuration()} jour(s)</span>
            </div>
          </div>

          {/* Raison et notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Raison *</label>
            <input
              {...register('reason')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Raison de la demande"
            />
            {errors.reason && <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes supplémentaires</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Informations supplémentaires..."
            />
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
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Envoi...' : 'Soumettre la demande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};