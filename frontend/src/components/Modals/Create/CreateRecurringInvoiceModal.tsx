import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, RotateCcw, Calendar, User, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const recurringInvoiceService = createCrudService('recurring-invoices');
const customerService = createCrudService('customers');
const productService = createCrudService('products');

const recurringItemSchema = z.object({
  productId: z.number().optional(),
  description: z.string().min(1, 'Description requise'),
  quantity: z.number().min(0.01, 'Quantité invalide'),
  unitPriceHt: z.number().min(0, 'Prix invalide'),
  vatRate: z.number().min(0).max(100).default(18)
});

const createRecurringInvoiceSchema = z.object({
  customerId: z.number().min(1, 'Client requis'),
  templateName: z.string().min(1, 'Nom du modèle requis'),
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
  startDate: z.string().min(1, 'Date de début requise'),
  endDate: z.string().optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(recurringItemSchema).min(1, 'Au moins un article requis')
});

type CreateRecurringInvoiceFormData = z.infer<typeof createRecurringInvoiceSchema>;

interface CreateRecurringInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const frequencyLabels = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  YEARLY: 'Annuel'
};

export const CreateRecurringInvoiceModal: React.FC<CreateRecurringInvoiceModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getAll({ limit: 100 })
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getAll({ limit: 100, isActive: true })
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch
  } = useForm<CreateRecurringInvoiceFormData>({
    resolver: zodResolver(createRecurringInvoiceSchema),
    defaultValues: {
      frequency: 'MONTHLY',
      startDate: new Date().toISOString().split('T')[0],
      items: [{ description: '', quantity: 1, unitPriceHt: 0, vatRate: 18 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedItems = watch('items');

  const createRecurringInvoiceMutation = useMutation({
    mutationFn: (data: CreateRecurringInvoiceFormData) => recurringInvoiceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-invoices'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateRecurringInvoiceFormData) => {
    setIsLoading(true);
    try {
      await createRecurringInvoiceMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => {
    return watchedItems.reduce((total, item) => {
      const itemTotal = item.quantity * item.unitPriceHt;
      const itemVat = itemTotal * (item.vatRate / 100);
      return total + itemTotal + itemVat;
    }, 0);
  };

  if (!isOpen) return null;

  const customersList = customers?.data?.customers || [];
  const productsList = products?.data?.products || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <RotateCcw className="h-5 w-5 mr-2" />
            Créer une Facture Récurrente
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du modèle</label>
              <input
                {...register('templateName')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Abonnement mensuel"
              />
              {errors.templateName && <p className="mt-1 text-sm text-red-600">{errors.templateName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  {...register('customerId', { valueAsNumber: true })}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
          </div>

          {/* Fréquence et dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
              <select
                {...register('frequency')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(frequencyLabels).map(([freq, label]) => (
                  <option key={freq} value={freq}>{label}</option>
                ))}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin (optionnel)</label>
              <input
                {...register('endDate')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Articles */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Articles</h4>
              <button
                type="button"
                onClick={() => append({ description: '', quantity: 1, unitPriceHt: 0, vatRate: 18 })}
                className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Article {index + 1}</span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Produit (optionnel)</label>
                      <select
                        {...register(`items.${index}.productId` as const, { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Sélectionner un produit</option>
                        {productsList.map((product: any) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        {...register(`items.${index}.description` as const)}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Description de l'article"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
                      <input
                        {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prix unitaire HT</label>
                      <input
                        {...register(`items.${index}.unitPriceHt` as const, { valueAsNumber: true })}
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">TVA (%)</label>
                      <input
                        {...register(`items.${index}.vatRate` as const, { valueAsNumber: true })}
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="text-lg font-semibold text-gray-900">
                Total TTC: {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF'
                }).format(calculateTotal())}
              </div>
            </div>
          </div>

          {/* Conditions et notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conditions</label>
              <textarea
                {...register('terms')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Conditions de facturation..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Notes internes..."
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Création...' : 'Créer la facture récurrente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};