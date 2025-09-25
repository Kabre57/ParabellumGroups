import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, CreditCard, Calendar, User, Receipt, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const paymentService = createCrudService('payments');
const customerService = createCrudService('customers');

const allocationSchema = z.object({
  invoiceId: z.number().min(1, 'Facture requise'),
  amount: z.number().min(0.01, 'Montant invalide')
});

const createPaymentSchema = z.object({
  customerId: z.number().min(1, 'Client requis'),
  amount: z.number().min(0.01, 'Montant invalide'),
  paymentDate: z.string().min(1, 'Date requise'),
  paymentMethod: z.enum(['TRANSFER', 'CHECK', 'CARD', 'CASH', 'OTHER']),
  reference: z.string().optional(),
  notes: z.string().optional(),
  invoiceAllocations: z.array(allocationSchema).optional()
});

type CreatePaymentFormData = z.infer<typeof createPaymentSchema>;

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId?: number;
}

export const CreatePaymentModal: React.FC<CreatePaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  customerId 
}) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [showAllocations, setShowAllocations] = useState(false);

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getAll({ limit: 100 })
  });

  const selectedCustomerId = customerId || 0;
  const { data: unpaidInvoices } = useQuery({
    queryKey: ['unpaid-invoices', selectedCustomerId],
    queryFn: () => fetch(`/api/v1/payments/customer/${selectedCustomerId}/unpaid-invoices`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(res => res.json()),
    enabled: !!selectedCustomerId
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch
  } = useForm<CreatePaymentFormData>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      customerId,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'TRANSFER',
      invoiceAllocations: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'invoiceAllocations'
  });

  const watchedCustomerId = watch('customerId');
  const watchedAllocations = watch('invoiceAllocations');

  const createPaymentMutation = useMutation({
    mutationFn: (data: CreatePaymentFormData) => paymentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreatePaymentFormData) => {
    setIsLoading(true);
    try {
      await createPaymentMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalAllocated = () => {
    return watchedAllocations?.reduce((total, allocation) => total + (allocation.amount || 0), 0) || 0;
  };

  if (!isOpen) return null;

  const customersList = customers?.data?.customers || [];
  const invoicesList = unpaidInvoices?.data || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Enregistrer un Paiement
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  {...register('customerId', { valueAsNumber: true })}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={!!customerId}
                >
                  <option value="">Sélectionner un client</option>
                  {customersList.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.customerNumber})
                    </option>
                  ))}
                </select>
              </div>
              {errors.customerId && <p className="mt-1 text-sm text-red-600">{errors.customerId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA)</label>
              <input
                {...register('amount', { valueAsNumber: true })}
                type="number"
                min="0.01"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
              {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <select
                {...register('paymentMethod')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="TRANSFER">Virement</option>
                <option value="CHECK">Chèque</option>
                <option value="CARD">Carte</option>
                <option value="CASH">Espèces</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
            <input
              {...register('reference')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Numéro de transaction, chèque, etc."
            />
          </div>

          {/* Allocation aux factures */}
          {watchedCustomerId && invoicesList.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">Allocation aux factures</h4>
                <button
                  type="button"
                  onClick={() => setShowAllocations(!showAllocations)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  {showAllocations ? 'Masquer' : 'Affecter aux factures'}
                </button>
              </div>

              {showAllocations && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Factures impayées</span>
                    <button
                      type="button"
                      onClick={() => append({ invoiceId: 0, amount: 0 })}
                      className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 flex items-center"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Ajouter
                    </button>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center space-x-3 bg-gray-50 p-3 rounded">
                      <select
                        {...register(`invoiceAllocations.${index}.invoiceId` as const, { valueAsNumber: true })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Sélectionner une facture</option>
                        {invoicesList.map((invoice: any) => (
                          <option key={invoice.id} value={invoice.id}>
                            {invoice.invoiceNumber} - {new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: 'XOF'
                            }).format(invoice.balanceDue)}
                          </option>
                        ))}
                      </select>
                      <input
                        {...register(`invoiceAllocations.${index}.amount` as const, { valueAsNumber: true })}
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Montant"
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {getTotalAllocated() > 0 && (
                    <div className="text-sm text-gray-600">
                      Total alloué: {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'XOF'
                      }).format(getTotalAllocated())}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Notes sur le paiement..."
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
              {isLoading ? 'Enregistrement...' : 'Enregistrer le paiement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};