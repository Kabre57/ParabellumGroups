import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, User, FileText, Clock } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const leaveService = createCrudService('leaves');
const employeeService = createCrudService('employees');

const createLeaveSchema = z.object({
  employeeId: z.number().min(1, 'Employé requis'),
  leaveType: z.enum(['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'OTHER']),
  startDate: z.string().min(1, 'Date de début requise'),
  endDate: z.string().min(1, 'Date de fin requise'),
  reason: z.string().min(1, 'Motif requis'),
  notes: z.string().optional()
});

type CreateLeaveFormData = z.infer<typeof createLeaveSchema>;

interface CreateLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: number;
}

const leaveTypeLabels = {
  ANNUAL: 'Congés annuels',
  SICK: 'Congé maladie',
  PERSONAL: 'Congé personnel',
  MATERNITY: 'Congé maternité',
  PATERNITY: 'Congé paternité',
  OTHER: 'Autre'
};

export const CreateLeaveModal: React.FC<CreateLeaveModalProps> = ({ 
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
  } = useForm<CreateLeaveFormData>({
    resolver: zodResolver(createLeaveSchema),
    defaultValues: {
      employeeId,
      leaveType: 'ANNUAL',
      startDate: new Date().toISOString().split('T')[0]
    }
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const createLeaveMutation = useMutation({
    mutationFn: (data: CreateLeaveFormData) => leaveService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateLeaveFormData) => {
    setIsLoading(true);
    try {
      await createLeaveMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDays = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
    return 0;
  };

  if (!isOpen) return null;

  const employeesList = employees?.data?.employees || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Demande de Congé
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
                    {employee.firstName} {employee.lastName} - {employee.position}
                  </option>
                ))}
              </select>
            </div>
            {errors.employeeId && <p className="mt-1 text-sm text-red-600">{errors.employeeId.message}</p>}
          </div>

          {/* Type de congé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de congé</label>
            <select
              {...register('leaveType')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(leaveTypeLabels).map(([type, label]) => (
                <option key={type} value={type}>{label}</option>
              ))}
            </select>
          </div>

          {/* Période */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
            </div>
          </div>

          {/* Durée calculée */}
          {startDate && endDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-800">
                  Durée: {calculateDays()} jour{calculateDays() > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Motif */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motif</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
              <textarea
                {...register('reason')}
                rows={3}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Motif de la demande de congé..."
              />
            </div>
            {errors.reason && <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes complémentaires</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Informations complémentaires..."
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
              {isLoading ? 'Création...' : 'Créer la demande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};