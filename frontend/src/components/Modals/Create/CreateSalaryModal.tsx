import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, DollarSign, Calendar, User, Calculator } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';
import { salaryHelpers } from '../../../utils/salaryHelpers';

const salaryService = createCrudService('salaries');
const employeeService = createCrudService('employees');

const createSalarySchema = z.object({
  employeeId: z.number().min(1, 'Employé requis'),
  paymentDate: z.string().min(1, 'Date de paiement requise'),
  workingDays: z.number().min(1).max(31).default(22),
  baseSalary: z.number().min(0, 'Salaire de base invalide'),
  overtime: z.number().min(0).default(0),
  bonuses: z.number().min(0).default(0),
  allowances: z.number().min(0).default(0),
  paidLeave: z.number().min(0).default(0),
  cnpsEmployee: z.number().min(0).default(0),
  cnamEmployee: z.number().min(0).default(0),
  fdfpEmployee: z.number().min(0).default(0),
  socialContributions: z.number().min(0).default(0),
  taxes: z.number().min(0).default(0),
  nonTaxableAmount: z.number().min(0).default(0),
  otherDeductions: z.number().min(0).default(0),
  loanDeductions: z.number().min(0).default(0),
  notes: z.string().optional()
});

type CreateSalaryFormData = z.infer<typeof createSalarySchema>;

interface CreateSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: number;
}

export const CreateSalaryModal: React.FC<CreateSalaryModalProps> = ({ 
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
  } = useForm<CreateSalaryFormData>({
    resolver: zodResolver(createSalarySchema),
    defaultValues: {
      employeeId,
      paymentDate: new Date().toISOString().split('T')[0],
      workingDays: 22,
      overtime: 0,
      bonuses: 0,
      allowances: 0,
      paidLeave: 0,
      cnpsEmployee: 0,
      cnamEmployee: 0,
      fdfpEmployee: 0,
      socialContributions: 0,
      taxes: 0,
      nonTaxableAmount: 0,
      otherDeductions: 0,
      loanDeductions: 0
    }
  });

  const watchedValues = watch();

  // Calculer automatiquement les cotisations sociales
  React.useEffect(() => {
    const baseSalary = watchedValues.baseSalary || 0;
    const overtime = watchedValues.overtime || 0;
    const bonuses = watchedValues.bonuses || 0;
    const allowances = watchedValues.allowances || 0;
    
    const grossSalary = baseSalary + overtime + bonuses + allowances;
    
    if (grossSalary > 0) {
      const socialContributions = salaryHelpers.calculateSocialContributions(grossSalary);
      const incomeTax = salaryHelpers.calculateIncomeTax(grossSalary);
      
      setValue('socialContributions', socialContributions.total);
      setValue('taxes', incomeTax);
    }
  }, [watchedValues.baseSalary, watchedValues.overtime, watchedValues.bonuses, watchedValues.allowances, setValue]);

  const createSalaryMutation = useMutation({
    mutationFn: async (data: CreateSalaryFormData) => {
      // Formatage des données pour le backend
      const formattedData = {
        employeeId: Number(data.employeeId),
        paymentDate: data.paymentDate,
        workingDays: Number(data.workingDays),
        baseSalary: Number(data.baseSalary),
        overtime: Number(data.overtime),
        bonuses: Number(data.bonuses),
        allowances: Number(data.allowances),
        paidLeave: Number(data.paidLeave),
        cnpsEmployee: Number(data.cnpsEmployee),
        cnamEmployee: Number(data.cnamEmployee),
        fdfpEmployee: Number(data.fdfpEmployee),
        socialContributions: Number(data.socialContributions),
        taxes: Number(data.taxes),
        nonTaxableAmount: Number(data.nonTaxableAmount),
        otherDeductions: Number(data.otherDeductions),
        loanDeductions: Number(data.loanDeductions),
        grossSalary: calculateTotals().grossSalary,
        totalDeductions: calculateTotals().totalDeductions,
        netSalary: calculateTotals().netSalary,
        status: 'PENDING',
        notes: data.notes || ''
      };
      
      return salaryService.create(formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      reset();
      onClose();
    },
    onError: (error: any) => {
      console.error('Erreur détaillée:', error.response?.data);
    }
  });

  const onSubmit = async (data: CreateSalaryFormData) => {
    setIsLoading(true);
    try {
      await createSalaryMutation.mutateAsync(data);
    } catch (error: any) {
      console.error('Erreur lors de la création:', error);
      alert(`Erreur: ${error.response?.data?.message || 'Erreur de création du salaire'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotals = () => {
    const baseSalary = watchedValues.baseSalary || 0;
    const overtime = watchedValues.overtime || 0;
    const bonuses = watchedValues.bonuses || 0;
    const allowances = watchedValues.allowances || 0;
    const paidLeave = watchedValues.paidLeave || 0;
    const socialContributions = watchedValues.socialContributions || 0;
    const taxes = watchedValues.taxes || 0;
    const otherDeductions = watchedValues.otherDeductions || 0;
    const loanDeductions = watchedValues.loanDeductions || 0;
    const nonTaxableAmount = watchedValues.nonTaxableAmount || 0;

    const grossSalary = baseSalary + overtime + bonuses + allowances + paidLeave;
    const totalDeductions = socialContributions + taxes + otherDeductions + loanDeductions;
    const netSalary = grossSalary - totalDeductions + nonTaxableAmount;

    return { grossSalary, totalDeductions, netSalary };
  };

  if (!isOpen) return null;

  const employeesList = employees?.data?.employees || [];
  const { grossSalary, totalDeductions, netSalary } = calculateTotals();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Créer un Salaire
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Employé et date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de paiement</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('paymentDate')}
                  type="date"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {errors.paymentDate && <p className="mt-1 text-sm text-red-600">{errors.paymentDate.message}</p>}
            </div>
          </div>

          {/* Jours travaillés */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de jours travaillés</label>
            <input
              {...register('workingDays', { valueAsNumber: true })}
              type="number"
              min="1"
              max="31"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="22"
            />
            {errors.workingDays && <p className="mt-1 text-sm text-red-600">{errors.workingDays.message}</p>}
          </div>

          {/* Éléments de rémunération */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Éléments de Rémunération
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salaire de base (FCFA)</label>
                <input
                  {...register('baseSalary', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="500000"
                />
                {errors.baseSalary && <p className="mt-1 text-sm text-red-600">{errors.baseSalary.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heures supplémentaires (FCFA)</label>
                <input
                  {...register('overtime', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primes (FCFA)</label>
                <input
                  {...register('bonuses', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Indemnités (FCFA)</label>
                <input
                  {...register('allowances', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Congés payés (FCFA)</label>
                <input
                  {...register('paidLeave', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sommes non taxables (FCFA)</label>
                <input
                  {...register('nonTaxableAmount', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Cotisations salariales */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Cotisations Salariales</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNPS Employé (FCFA)</label>
                <input
                  {...register('cnpsEmployee', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNAM Employé (FCFA)</label>
                <input
                  {...register('cnamEmployee', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">FDFP Employé (FCFA)</label>
                <input
                  {...register('fdfpEmployee', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cotisations sociales (FCFA)</label>
                <input
                  {...register('socialContributions', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Autres déductions */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Autres Déductions</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Impôts (FCFA)</label>
                <input
                  {...register('taxes', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remboursement prêt (FCFA)</label>
                <input
                  {...register('loanDeductions', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Autres déductions (FCFA)</label>
                <input
                  {...register('otherDeductions', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Calculs automatiques */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
              <Calculator className="h-4 w-4 mr-2" />
              Calculs Automatiques
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF'
                  }).format(grossSalary)}
                </div>
                <div className="text-gray-600">Salaire Brut</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-red-600">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF'
                  }).format(totalDeductions)}
                </div>
                <div className="text-gray-600">Total Déductions</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF'
                  }).format(netSalary)}
                </div>
                <div className="text-gray-600">Salaire Net</div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Notes sur le salaire..."
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
              {isLoading ? 'Création...' : 'Créer le salaire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};