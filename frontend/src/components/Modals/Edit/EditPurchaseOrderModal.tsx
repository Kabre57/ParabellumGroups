// components/Modals/Edit/EditPurchaseOrderModal.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, ShoppingCart, Calendar, Truck, Save, RotateCcw } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const purchaseService = createCrudService('purchases');
const supplierService = createCrudService('suppliers');

const editPurchaseOrderSchema = z.object({
  supplierId: z.number().min(1, 'Fournisseur requis'),
  expectedDate: z.string().min(1, 'Date attendue requise'),
  deliveryDate: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED']),
  notes: z.string().optional()
});

type EditPurchaseOrderFormData = z.infer<typeof editPurchaseOrderSchema>;

interface EditPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: any;
}

export const EditPurchaseOrderModal: React.FC<EditPurchaseOrderModalProps> = ({ isOpen, onClose, purchase }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierService.getAll({ limit: 100 })
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch
  } = useForm<EditPurchaseOrderFormData>({
    resolver: zodResolver(editPurchaseOrderSchema)
  });

  useEffect(() => {
    if (purchase) {
      setValue('supplierId', purchase.supplierId);
      setValue('expectedDate', purchase.expectedDate?.split('T')[0] || '');
      setValue('deliveryDate', purchase.deliveryDate?.split('T')[0] || '');
      setValue('status', purchase.status);
      setValue('notes', purchase.notes || '');
    }
  }, [purchase, setValue]);

  const updatePurchaseMutation = useMutation({
    mutationFn: (data: EditPurchaseOrderFormData) => purchaseService.update(purchase.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      onClose();
    }
  });

  const onSubmit = async (data: EditPurchaseOrderFormData) => {
    setIsLoading(true);
    try {
      await updatePurchaseMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (purchase) {
      setValue('supplierId', purchase.supplierId);
      setValue('expectedDate', purchase.expectedDate?.split('T')[0] || '');
      setValue('deliveryDate', purchase.deliveryDate?.split('T')[0] || '');
      setValue('status', purchase.status);
      setValue('notes', purchase.notes || '');
    }
  };

  if (!isOpen || !purchase) return null;

  const suppliers = suppliersData?.data?.suppliers || [];
  const status = watch('status');

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Modifier la Commande {purchase.orderNumber}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut *</label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="PENDING">En attente</option>
                <option value="APPROVED">Approuvée</option>
                <option value="REJECTED">Rejetée</option>
                <option value="PARTIALLY_RECEIVED">Partiellement reçue</option>
                <option value="COMPLETED">Terminée</option>
                <option value="CANCELLED">Annulée</option>
              </select>
              {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date livraison attendue *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('expectedDate')}
                  type="date"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {errors.expectedDate && <p className="mt-1 text-sm text-red-600">{errors.expectedDate.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date livraison effective</label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('deliveryDate')}
                  type="date"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Indicateur de statut */}
          <div className={`p-3 rounded-lg border ${
            status === 'COMPLETED' ? 'bg-green-50 border-green-200' :
            status === 'APPROVED' ? 'bg-blue-50 border-blue-200' :
            status === 'REJECTED' ? 'bg-red-50 border-red-200' :
            'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="text-sm font-medium">
              Statut: <span className="capitalize">{status?.toLowerCase()}</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {status === 'PENDING' && 'En attente de traitement'}
              {status === 'APPROVED' && 'Commande approuvée et en cours de traitement'}
              {status === 'REJECTED' && 'Commande rejetée'}
              {status === 'PARTIALLY_RECEIVED' && 'Livraison partiellement effectuée'}
              {status === 'COMPLETED' && 'Commande terminée et livrée'}
              {status === 'CANCELLED' && 'Commande annulée'}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Notes supplémentaires..."
            />
          </div>

          {/* Informations lecture seule */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Informations système</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Numéro commande:</span>
                <span className="ml-2 font-medium">{purchase.orderNumber}</span>
              </div>
              <div>
                <span className="text-gray-600">Date création:</span>
                <span className="ml-2 font-medium">
                  {new Date(purchase.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Montant total:</span>
                <span className="ml-2 font-medium">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF'
                  }).format(purchase.totalTtc || 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Articles:</span>
                <span className="ml-2 font-medium">{purchase.items?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex justify-between pt-4 border-t">
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </button>
            
            <div className="flex space-x-3">
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
          </div>
        </form>
      </div>
    </div>
  );
};