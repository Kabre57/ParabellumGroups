// components/Modals/Create/CreateCashFlowModal.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, DollarSign, Calendar, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const cashFlowService = createCrudService('cash-flows');
const accountService = createCrudService('accounts');

const createCashFlowSchema = z.object({
  date: z.string().min(1, 'Date requise'),
  description: z.string().min(1, 'Description requise'),
  amount: z.number().min(0.01, 'Montant invalide'),
  type: z.enum(['INFLOW', 'OUTFLOW']),
  accountId: z.number().min(1, 'Compte requis'),
  sourceDocumentType: z.enum(['INVOICE', 'QUOTE', 'PAYMENT', 'EXPENSE', 'SALARY', 'OTHER']).default('OTHER'),
  sourceDocumentId: z.string().optional()
});

type CreateCashFlowFormData = z.infer<typeof createCashFlowSchema>;

interface CreateCashFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateCashFlowModal: React.FC<CreateCashFlowModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountService.getAll({ limit: 100 })
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<CreateCashFlowFormData>({
    resolver: zodResolver(createCashFlowSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      type: 'INFLOW',
      sourceDocumentType: 'OTHER'
    }
  });

  const cashFlowType = watch('type');

  const createCashFlowMutation = useMutation({
    mutationFn: (data: CreateCashFlowFormData) => cashFlowService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flows'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateCashFlowFormData) => {
    setIsLoading(true);
    try {
      await createCashFlowMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const accounts = accountsData?.data?.accounts || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Nouveau Flux de Trésorerie
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          {/* Type de flux */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de flux</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input {...register('type')} type="radio" value="INFLOW" className="mr-3" />
                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                <div>
                  <div className="font-medium text-sm">Entrée</div>
                  <div className="text-xs text-gray-500">Revenue, paiement</div>
                </div>
              </label>
              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input {...register('type')} type="radio" value="OUTFLOW" className="mr-3" />
                <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
                <div>
                  <div className="font-medium text-sm">Sortie</div>
                  <div className="text-xs text-gray-500">Dépense, achat</div>
                </div>
              </label>
            </div>
          </div>

          {/* Date et description */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('description')}
                  type="text"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Description du flux..."
                />
              </div>
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
            </div>
          </div>

          {/* Montant et compte */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA)</label>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compte</label>
              <select
                {...register('accountId', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un compte</option>
                {accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.accountNumber} - {account.name}
                  </option>
                ))}
              </select>
              {errors.accountId && <p className="mt-1 text-sm text-red-600">{errors.accountId.message}</p>}
            </div>
          </div>

          {/* Document source */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de document</label>
              <select
                {...register('sourceDocumentType')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="OTHER">Autre</option>
                <option value="INVOICE">Facture</option>
                <option value="QUOTE">Devis</option>
                <option value="PAYMENT">Paiement</option>
                <option value="EXPENSE">Dépense</option>
                <option value="SALARY">Salaire</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Référence document</label>
              <input
                {...register('sourceDocumentId')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Référence optionnelle..."
              />
            </div>
          </div>

          {/* Résumé */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700">Résumé</div>
            <div className="text-sm text-gray-600 mt-1">
              {cashFlowType === 'INFLOW' ? 'Entrée' : 'Sortie'} de{' '}
              <span className={`font-semibold ${cashFlowType === 'INFLOW' ? 'text-green-600' : 'text-red-600'}`}>
                {watch('amount') || 0} FCFA
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
              {isLoading ? 'Création...' : 'Créer le flux'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};