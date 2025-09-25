import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, DollarSign, Calendar, User, Calculator, FileText } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const loanService = createCrudService('loans');
const employeeService = createCrudService('employees');

const createLoanSchema = z.object({
  employeeId: z.number().min(1, 'Employé requis'),
  amount: z.number().min(1, 'Montant invalide'),
  interestRate: z.number().min(0).max(100).default(0),
  monthlyPayment: z.number().min(1, 'Mensualité invalide'),
  startDate: z.string().min(1, 'Date de début requise'),
  endDate: z.string().min(1, 'Date de fin requise'),
  purpose: z.string().min(1, 'Objet du prêt requis'),
  notes: z.string().optional()
});

type CreateLoanFormData = z.infer<typeof createLoanSchema>;

interface CreateLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: number;
}

export const CreateLoanModal: React.FC<CreateLoanModalProps> = ({ 
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
    watch,
    setValue
  } = useForm<CreateLoanFormData>({
    resolver: zodResolver(createLoanSchema),
    defaultValues: {
      employeeId,
      interestRate: 0,
      startDate: new Date().toISOString().split('T')[0]
    }
  });

  const amount = watch('amount');
  const interestRate = watch('interestRate');
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const createLoanMutation = useMutation({
    mutationFn: (data: CreateLoanFormData) => loanService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateLoanFormData) => {
    setIsLoading(true);
    try {
      await createLoanMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculer la mensualité automatiquement
  const calculateMonthlyPayment = () => {
    if (amount && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      
      if (months > 0) {
        const principal = amount;
        const monthlyInterest = (interestRate || 0) / 100 / 12;
        
        if (monthlyInterest > 0) {
          // Formule de calcul d'annuité
          const monthlyPayment = principal * (monthlyInterest * Math.pow(1 + monthlyInterest, months)) / 
                                (Math.pow(1 + monthlyInterest, months) - 1);
          setValue('monthlyPayment', Math.round(monthlyPayment));
        } else {
          setValue('monthlyPayment', Math.round(principal / months));
        }
      }
    }
  };

  React.useEffect(() => {
    calculateMonthlyPayment();
  }, [amount, interestRate, startDate, endDate]);

  if (!isOpen) return null;

  const employeesList = employees?.data?.employees || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Créer un Prêt Employé
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

          {/* Montant et taux */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant du prêt (FCFA)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('amount', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="500000"
                />
              </div>
              {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taux d'intérêt annuel (%)</label>
              <input
                {...register('interestRate', { valueAsNumber: true })}
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="5.0"
              />
            </div>
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

          {/* Mensualité calculée */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensualité (FCFA)</label>
            <div className="relative">
              <Calculator className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                {...register('monthlyPayment', { valueAsNumber: true })}
                type="number"
                min="1"
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                placeholder="Calculé automatiquement"
              />
            </div>
            {errors.monthlyPayment && <p className="mt-1 text-sm text-red-600">{errors.monthlyPayment.message}</p>}
          </div>

          {/* Objet du prêt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objet du prêt</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
              <textarea
                {...register('purpose')}
                rows={3}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Achat véhicule, travaux maison, formation, etc."
              />
            </div>
            {errors.purpose && <p className="mt-1 text-sm text-red-600">{errors.purpose.message}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes complémentaires</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Conditions particulières, garanties, etc."
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
              {isLoading ? 'Création...' : 'Créer le prêt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};