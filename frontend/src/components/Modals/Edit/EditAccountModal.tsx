// components/Modals/Edit/EditAccountModal.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, CreditCard, BookOpen, DollarSign, Save, Activity } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const accountService = createCrudService('accounts');

const editAccountSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  accountNumber: z.string().min(1, 'Numéro de compte requis'),
  accountType: z.string().min(1, 'Type de compte requis'),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
});

type EditAccountFormData = z.infer<typeof editAccountSchema>;

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: any;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({ isOpen, onClose, account }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const accountTypes = [
    'Actif',
    'Passif',
    'Produit',
    'Charge',
    'Trésorerie',
    'Client',
    'Fournisseur',
    'Capital'
  ];

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch
  } = useForm<EditAccountFormData>({
    resolver: zodResolver(editAccountSchema)
  });

  useEffect(() => {
    if (account) {
      setValue('name', account.name || '');
      setValue('accountNumber', account.accountNumber || '');
      setValue('accountType', account.accountType || '');
      setValue('description', account.description || '');
      setValue('isActive', account.isActive !== undefined ? account.isActive : true);
    }
  }, [account, setValue]);

  const updateAccountMutation = useMutation({
    mutationFn: (data: EditAccountFormData) => accountService.update(account.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      onClose();
    }
  });

  const onSubmit = async (data: EditAccountFormData) => {
    setIsLoading(true);
    try {
      await updateAccountMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !account) return null;

  const isActive = watch('isActive');

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Modifier le Compte {account.accountNumber}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          {/* Numéro et nom du compte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de compte *</label>
              <input
                {...register('accountNumber')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.accountNumber && <p className="mt-1 text-sm text-red-600">{errors.accountNumber.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du compte *</label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>
          </div>

          {/* Type de compte */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de compte *</label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                {...register('accountType')}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un type</option>
                {accountTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            {errors.accountType && <p className="mt-1 text-sm text-red-600">{errors.accountType.message}</p>}
          </div>

          {/* Statut */}
          <div>
            <label className="flex items-center">
              <input
                {...register('isActive')}
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Compte actif</span>
            </label>
          </div>

          {/* Indicateur de statut */}
          <div className={`p-3 rounded-lg border ${
            isActive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center">
              <Activity className={`h-4 w-4 mr-2 ${isActive ? 'text-green-600' : 'text-red-600'}`} />
              <span className={`font-medium ${isActive ? 'text-green-800' : 'text-red-800'}`}>
                {isActive ? 'Compte actif' : 'Compte inactif'}
              </span>
            </div>
            <div className="text-sm opacity-75 mt-1">
              {isActive 
                ? 'Le compte est actif et peut être utilisé dans les transactions'
                : 'Le compte est inactif et ne peut pas être utilisé'
              }
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Description du compte..."
            />
          </div>

          {/* Informations lecture seule */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">Informations financières</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Solde actuel:</span>
                <span className="ml-2 font-medium">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF'
                  }).format(account.balance || 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Devise:</span>
                <span className="ml-2 font-medium">{account.currency || 'XOF'}</span>
              </div>
              <div>
                <span className="text-gray-600">Date création:</span>
                <span className="ml-2 font-medium">
                  {new Date(account.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Dernière modification:</span>
                <span className="ml-2 font-medium">
                  {new Date(account.updatedAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
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