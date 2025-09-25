import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, FileText, Calendar, DollarSign, Clock, User } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const contractService = createCrudService('contracts');
const employeeService = createCrudService('employees');

const createContractSchema = z.object({
  employeeId: z.number().min(1, 'Employé requis'),
  contractType: z.enum(['CDI', 'CDD', 'STAGE', 'FREELANCE']),
  startDate: z.string().min(1, 'Date de début requise'),
  endDate: z.string().optional(),
  baseSalary: z.number().min(0, 'Salaire invalide'),
  workingHours: z.number().min(0).max(80, 'Heures invalides'),
  benefits: z.string().optional(),
  terms: z.string().optional()
});

type CreateContractFormData = z.infer<typeof createContractSchema>;

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: number;
}

export const CreateContractModal: React.FC<CreateContractModalProps> = ({ 
  isOpen, 
  onClose, 
  employeeId 
}) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll({ limit: 100 })
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<CreateContractFormData>({
    resolver: zodResolver(createContractSchema),
    defaultValues: {
      employeeId,
      contractType: 'CDI',
      startDate: new Date().toISOString().split('T')[0],
      workingHours: 40
    }
  });

  const contractType = watch('contractType');

  const createContractMutation = useMutation({
    mutationFn: (data: CreateContractFormData) => contractService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateContractFormData) => {
    setIsLoading(true);
    try {
      await createContractMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const employeesList = employees?.data?.employees || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Créer un Contrat
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Employé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employé</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                {...register('employeeId', { valueAsNumber: true })}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={!!employeeId}
              >
                <option value="">Sélectionner un employé</option>
                {employeesList.map((employee: any) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} ({employee.employeeNumber})
                  </option>
                ))}
              </select>
            </div>
            {errors.employeeId && <p className="mt-1 text-sm text-red-600">{errors.employeeId.message}</p>}
          </div>

          {/* Type et dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de contrat</label>
              <select
                {...register('contractType')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="CDI">CDI - Contrat à Durée Indéterminée</option>
                <option value="CDD">CDD - Contrat à Durée Déterminée</option>
                <option value="STAGE">Stage</option>
                <option value="FREELANCE">Freelance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
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
          </div>

          {/* Date de fin pour CDD */}
          {contractType === 'CDD' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
              <input
                {...register('endDate')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Rémunération */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salaire de base (FCFA)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('baseSalary', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="500000"
                />
              </div>
              {errors.baseSalary && <p className="mt-1 text-sm text-red-600">{errors.baseSalary.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heures de travail/semaine</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('workingHours', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  max="80"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="40"
                />
              </div>
              {errors.workingHours && <p className="mt-1 text-sm text-red-600">{errors.workingHours.message}</p>}
            </div>
          </div>

          {/* Avantages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Avantages</label>
            <textarea
              {...register('benefits')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mutuelle, tickets restaurant, voiture de fonction, etc."
            />
          </div>

          {/* Conditions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conditions particulières</label>
            <textarea
              {...register('terms')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Clauses particulières du contrat..."
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Création...' : 'Créer le contrat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};