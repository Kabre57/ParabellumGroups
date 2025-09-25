import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, DollarSign, Calendar, CreditCard, FileText } from 'lucide-react';

const paySalarySchema = z.object({
  paymentDate: z.string().min(1, 'Date de paiement requise'),
  paymentMethod: z.enum(['TRANSFER', 'CHECK', 'CASH']),
  reference: z.string().optional(),
  notes: z.string().optional()
});

type PaySalaryFormData = z.infer<typeof paySalarySchema>;

interface PaySalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  salary: any;
  onPay: (paymentData: PaySalaryFormData) => void;
}

export const PaySalaryModal: React.FC<PaySalaryModalProps> = ({ 
  isOpen, 
  onClose, 
  salary,
  onPay 
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<PaySalaryFormData>({
    resolver: zodResolver(paySalarySchema),
    defaultValues: {
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'TRANSFER'
    }
  });

  const onSubmit = async (data: PaySalaryFormData) => {
    setIsLoading(true);
    try {
      await onPay(data);
      reset();
      onClose();
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !salary) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Payer le Salaire
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4">
          {/* Informations du salaire */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Détails du Salaire</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Employé:</span>
                <span className="font-medium">{salary.employee.firstName} {salary.employee.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span>Période:</span>
                <span>{new Date(salary.paymentDate).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Salaire Brut:</span>
                <span className="font-medium text-green-600">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF'
                  }).format(salary.grossSalary)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Déductions:</span>
                <span className="font-medium text-red-600">
                  -{new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF'
                  }).format(salary.totalDeductions)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-bold">Salaire Net:</span>
                <span className="font-bold text-blue-600 text-lg">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF'
                  }).format(salary.netSalary)}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  {...register('paymentMethod')}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="TRANSFER">Virement bancaire</option>
                  <option value="CHECK">Chèque</option>
                  <option value="CASH">Espèces</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
              <input
                {...register('reference')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Numéro de virement, chèque, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Notes sur le paiement..."
                />
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
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Traitement...' : 'Confirmer le Paiement'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};