// components/Modals/Create/CreatePurchaseOrderModal.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, ShoppingCart, Package, Plus, Trash2, DollarSign } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const purchaseService = createCrudService('purchases');
const supplierService = createCrudService('suppliers');
const productService = createCrudService('products');

const purchaseItemSchema = z.object({
  productId: z.number().optional(),
  description: z.string().min(1, 'Description requise'),
  quantity: z.number().min(0.01, 'Quantité invalide'),
  unitPriceHt: z.number().min(0, 'Prix invalide'),
  vatRate: z.number().min(0).max(100).default(18)
});

const createPurchaseOrderSchema = z.object({
  supplierId: z.number().min(1, 'Fournisseur requis'),
  expectedDate: z.string().min(1, 'Date attendue requise'),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'Au moins un article requis')
});

type CreatePurchaseOrderFormData = z.infer<typeof createPurchaseOrderSchema>;

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierService.getAll({ limit: 100 })
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getAll({ limit: 100 })
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<CreatePurchaseOrderFormData>({
    resolver: zodResolver(createPurchaseOrderSchema),
    defaultValues: {
      items: [{ description: '', quantity: 1, unitPriceHt: 0, vatRate: 18 }],
      expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  });

  const items = watch('items') || [];

  const addItem = () => {
    setValue('items', [...items, { description: '', quantity: 1, unitPriceHt: 0, vatRate: 18 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setValue('items', items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setValue('items', newItems);
  };

  const calculateItemTotal = (item: any) => {
    return item.quantity * item.unitPriceHt * (1 + item.vatRate / 100);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const createPurchaseMutation = useMutation({
    mutationFn: (data: CreatePurchaseOrderFormData) => purchaseService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreatePurchaseOrderFormData) => {
    setIsLoading(true);
    try {
      await createPurchaseMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const suppliers = suppliersData?.data?.suppliers || [];
  const products = productsData?.data?.products || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Nouvelle Commande d'Achat
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur *</label>
              <select
                {...register('supplierId', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un fournisseur</option>
                {suppliers.map((supplier: any) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              {errors.supplierId && <p className="mt-1 text-sm text-red-600">{errors.supplierId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date attendue *</label>
              <input
                {...register('expectedDate')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.expectedDate && <p className="mt-1 text-sm text-red-600">{errors.expectedDate.message}</p>}
            </div>
          </div>

          {/* Articles de la commande */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Articles commandés</h4>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter un article</span>
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                  <div className="col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <div className="flex space-x-2">
                      <select
                        value={item.productId || ''}
                        onChange={(e) => {
                          const productId = parseInt(e.target.value);
                          const product = products.find((p: any) => p.id === productId);
                          if (product) {
                            updateItem(index, 'productId', productId);
                            updateItem(index, 'description', product.name);
                            updateItem(index, 'unitPriceHt', product.priceHt);
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Sélectionner un produit</option>
                        {products.map((product: any) => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {product.priceHt} FCFA
                          </option>
                        ))}
                      </select>
                      <input
                        {...register(`items.${index}.description`)}
                        placeholder="Description manuelle"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
                    <input
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prix unitaire HT</label>
                    <input
                      {...register(`items.${index}.unitPriceHt`, { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">TVA %</label>
                    <input
                      {...register(`items.${index}.vatRate`, { valueAsNumber: true })}
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="w-full p-2 text-red-600 hover:text-red-700 border border-red-200 rounded-md hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mx-auto" />
                    </button>
                  </div>

                  <div className="col-span-12 mt-2">
                    <div className="text-sm text-gray-600">
                      Total TTC: {calculateItemTotal(item).toFixed(2)} FCFA
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {errors.items && <p className="mt-1 text-sm text-red-600">{errors.items.message}</p>}
          </div>

          {/* Total */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total TTC</span>
              <span className="text-2xl font-bold text-blue-600">
                {calculateTotal().toFixed(2)} FCFA
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Instructions spéciales, conditions de livraison..."
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
              {isLoading ? 'Création...' : 'Créer la commande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};