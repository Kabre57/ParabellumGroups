import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Trash2, FileText, Calendar, User } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const quoteService = createCrudService('quotes');
const customerService = createCrudService('customers');
const productService = createCrudService('products');

const quoteItemSchema = z.object({
  productId: z.number().optional(),
  description: z.string().min(1, 'Description requise'),
  quantity: z.number().min(0.01, 'Quantité invalide'),
  unitPriceHt: z.number().min(0, 'Prix invalide'),
  discountRate: z.number().min(0).max(100).default(0),
  vatRate: z.number().min(0).max(100).default(18)
});

const createQuoteSchema = z.object({
  customerId: z.number().min(1, 'Client requis'),
  customerAddressId: z.number().optional(),
  quoteDate: z.string().min(1, 'Date requise'),
  validUntil: z.string().min(1, 'Date de validité requise'),
  terms: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, 'Au moins un article requis')
});

type CreateQuoteFormData = z.infer<typeof createQuoteSchema>;

interface CreateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateQuoteModal: React.FC<CreateQuoteModalProps> = ({ isOpen, onClose }) => {
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
  } = useForm<CreateQuoteFormData>({
    resolver: zodResolver(createQuoteSchema),
    defaultValues: {
      quoteDate: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [{ description: '', quantity: 1, unitPriceHt: 0, discountRate: 0, vatRate: 18 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedItems = watch('items');

  const createQuoteMutation = useMutation({
    mutationFn: (data: CreateQuoteFormData) => quoteService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateQuoteFormData) => {
    setIsLoading(true);
    try {
      await createQuoteMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => {
    return watchedItems.reduce((total, item) => {
      const itemTotal = item.quantity * item.unitPriceHt * (1 - item.discountRate / 100);
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
            <FileText className="h-5 w-5 mr-2" />
            Créer un Devis
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Date du devis</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('quoteDate')}
                  type="date"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {errors.quoteDate && <p className="mt-1 text-sm text-red-600">{errors.quoteDate.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valide jusqu'au</label>
            <input
              {...register('validUntil')}
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.validUntil && <p className="mt-1 text-sm text-red-600">{errors.validUntil.message}</p>}
          </div>

          {/* Articles */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Articles</h4>
              <button
                type="button"
                onClick={() => append({ description: '', quantity: 1, unitPriceHt: 0, discountRate: 0, vatRate: 18 })}
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
                      {errors.items?.[index]?.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.items[index]?.description?.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Remise (%)</label>
                      <input
                        {...register(`items.${index}.discountRate` as const, { valueAsNumber: true })}
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
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
                placeholder="Conditions de vente..."
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
              {isLoading ? 'Création...' : 'Créer le devis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};