// components/Modals/Edit/EditExpenseModal.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, DollarSign, Calendar, FileText, Tag, Save, CheckCircle } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const expenseService = createCrudService('expenses');
const employeeService = createCrudService('employees');

const editExpenseSchema = z.object({
  employeeId: z.number().min(1, 'Employé requis'),
  date: z.string().min(1, 'Date requise'),
  category: z.string().min(1, 'Catégorie requise'),
  description: z.string().min(1, 'Description requise'),
  amount: z.number().min(0.01, 'Montant invalide'),
  status: z.enum(['PENDING', 'PAID', 'REIMBURSED', 'CANCELLED']),
  notes: z.string().optional()
});

type EditExpenseFormData = z.infer<typeof editExpenseSchema>;

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: any;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({ isOpen, onClose, expense }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll({ limit: 100 })
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch
  } = useForm<EditExpenseFormData>({
    resolver: zodResolver(editExpenseSchema)
  });

  useEffect(() => {
    if (expense) {
      setValue('employeeId', expense.employeeId);
      setValue('date', expense.date?.split('T')[0] || '');
      setValue('category', expense.category || '');
      setValue('description', expense.description || '');
      setValue('amount', expense.amount || 0);
      setValue('status', expense.status || 'PENDING');
      setValue('notes', expense.notes || '');
    }
  }, [expense, setValue]);

  const categories = [
    'Fournitures bureau',
    'Déplacement',
    'Repas',
    'Hébergement',
    'Matériel',
    'Formation',
    'Communication',
    'Autre'
  ];

  const updateExpenseMutation = useMutation({
    mutationFn: (data: EditExpenseFormData) => expenseService.update(expense.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      onClose();
    }
  });

  const onSubmit = async (data: EditExpenseFormData) => {
    setIsLoading(true);
    try {
      await updateExpenseMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !expense) return null;

  const employees = employeesData?.data?.employees || [];
  const status = watch('status');

  const getStatusColor = (status: string) => {
    const colors = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'PAID': 'bg-green-100 text-green-800',
      'REIMBURSED': 'bg-blue-100 text-blue-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'PENDING': 'En attente',
      'PAID': 'Payée',
      'REIMBURSED': 'Remboursée',
      'CANCELLED': 'Annulée'
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Modifier la Dépense
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          {/* Employé et date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employé *</label>
              <select
                {...register('employeeId', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un employé</option>
                {employees.map((employee: any) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
              {errors.employeeId && <p className="mt-1 text-sm text-red-600">{errors.employeeId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('date')}
                  type="date"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
            </div>
          </div>

          {/* Catégorie et montant */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  {...register('category')}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA) *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('amount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                {...register('description')}
                type="text"
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
          </div>

          {/* Statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut *</label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="PENDING">En attente</option>
              <option value="PAID">Payée</option>
              <option value="REIMBURSED">Remboursée</option>
              <option value="CANCELLED">Annulée</option>
            </select>
          </div>

          {/* Indicateur de statut */}
          <div className={`p-3 rounded-lg border ${getStatusColor(status)}`}>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              <span className="font-medium">{getStatusLabel(status)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Notes supplémentaires..."
            />
          </div>

          {/* Informations lecture seule */}
          {expense.receiptUrl && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700">Justificatif</div>
              <a 
                href={expense.receiptUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Voir le justificatif ›
              </a>
            </div>
          )}

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