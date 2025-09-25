// components/Modals/Create/CreateExpenseModal.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, DollarSign, Calendar, FileText, User, Tag, Upload } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const expenseService = createCrudService('expenses');
const employeeService = createCrudService('employees');

const createExpenseSchema = z.object({
  employeeId: z.number().min(1, 'Employé requis'),
  date: z.string().min(1, 'Date requise'),
  category: z.string().min(1, 'Catégorie requise'),
  description: z.string().min(1, 'Description requise'),
  amount: z.number().min(0.01, 'Montant invalide'),
  currency: z.string().default('XOF'),
  receiptUrl: z.string().optional()
});

type CreateExpenseFormData = z.infer<typeof createExpenseSchema>;

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll({ limit: 100 })
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<CreateExpenseFormData>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      currency: 'XOF'
    }
  });

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      // Simuler l'upload et obtenir une URL
      setValue('receiptUrl', `/receipts/${Date.now()}_${file.name}`);
    }
  };

  const createExpenseMutation = useMutation({
    mutationFn: (data: CreateExpenseFormData) => expenseService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      reset();
      setReceiptFile(null);
      onClose();
    }
  });

  const onSubmit = async (data: CreateExpenseFormData) => {
    setIsLoading(true);
    try {
      await createExpenseMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const employees = employeesData?.data?.employees || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Nouvelle Dépense
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
                  placeholder="0.00"
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
                placeholder="Description de la dépense..."
              />
            </div>
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
          </div>

          {/* Justificatif */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Justificatif</label>
            <div className="flex items-center space-x-3">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500">
                  <Upload className="h-4 w-4 mr-2" />
                  <span className="text-sm">
                    {receiptFile ? receiptFile.name : 'Téléverser un justificatif'}
                  </span>
                </div>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">Formats acceptés: JPG, PNG, PDF (max 5MB)</p>
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
              {isLoading ? 'Création...' : 'Créer la dépense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};