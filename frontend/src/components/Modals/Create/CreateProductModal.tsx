import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Package, Zap, RotateCcw, Hash, DollarSign } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const productService = createCrudService('products');

const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU requis'),
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  type: z.enum(['PRODUCT', 'SERVICE', 'SUBSCRIPTION']),
  category: z.string().optional(),
  unit: z.string().default('pièce'),
  priceHt: z.number().min(0, 'Prix invalide'),
  vatRate: z.number().min(0).max(100).default(18),
  costPrice: z.number().min(0).optional(),
  stockQuantity: z.number().min(0).default(0),
  stockAlertThreshold: z.number().min(0).default(0),
  weight: z.number().min(0).optional(),
  dimensions: z.string().optional(),
  imageUrl: z.string().url('URL invalide').optional().or(z.literal(''))
});

type CreateProductFormData = z.infer<typeof createProductSchema>;

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const productTypeConfig = {
  PRODUCT: { label: 'Produit', icon: Package, description: 'Article physique avec stock' },
  SERVICE: { label: 'Service', icon: Zap, description: 'Prestation de service' },
  SUBSCRIPTION: { label: 'Abonnement', icon: RotateCcw, description: 'Service récurrent' }
};

export const CreateProductModal: React.FC<CreateProductModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<CreateProductFormData>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      type: 'SERVICE',
      unit: 'pièce',
      vatRate: 18,
      stockQuantity: 0,
      stockAlertThreshold: 0
    }
  });

  const productType = watch('type');

  const createProductMutation = useMutation({
    mutationFn: (data: CreateProductFormData) => productService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateProductFormData) => {
    setIsLoading(true);
    try {
      await createProductMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Créer un Produit/Service
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Type de produit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(productTypeConfig).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <label key={type} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input {...register('type')} type="radio" value={type} className="mr-3" />
                    <Icon className="h-5 w-5 mr-2 text-gray-600" />
                    <div>
                      <div className="font-medium text-sm">{config.label}</div>
                      <div className="text-xs text-gray-500">{config.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('sku')}
                  type="text"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="PROD-001"
                />
              </div>
              {errors.sku && <p className="mt-1 text-sm text-red-600">{errors.sku.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nom du produit/service"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Description détaillée..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <input
                {...register('category')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Développement, Formation, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
              <input
                {...register('unit')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="pièce, heure, jour, etc."
              />
            </div>
          </div>

          {/* Prix */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Tarification
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix HT (FCFA)</label>
                <input
                  {...register('priceHt', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.priceHt && <p className="mt-1 text-sm text-red-600">{errors.priceHt.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taux TVA (%)</label>
                <input
                  {...register('vatRate', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix de revient (FCFA)</label>
                <input
                  {...register('costPrice', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Stock (seulement pour les produits) */}
          {productType === 'PRODUCT' && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Gestion du Stock</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité en stock</label>
                  <input
                    {...register('stockQuantity', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seuil d'alerte</label>
                  <input
                    {...register('stockAlertThreshold', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Caractéristiques physiques */}
          {productType === 'PRODUCT' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poids (kg)</label>
                <input
                  {...register('weight', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
                <input
                  {...register('dimensions')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="L x l x h (cm)"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de l'image</label>
            <input
              {...register('imageUrl')}
              type="url"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://exemple.com/image.jpg"
            />
            {errors.imageUrl && <p className="mt-1 text-sm text-red-600">{errors.imageUrl.message}</p>}
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
              {isLoading ? 'Création...' : 'Créer le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};