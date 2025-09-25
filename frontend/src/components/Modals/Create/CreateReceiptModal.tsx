// src/components/Modals/Create/CreateReceiptModal.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Package, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const purchaseService = createCrudService('purchases');

const createReceiptSchema = z.object({
  receiptDate: z.string().min(1, 'Date de réception requise'),
  items: z.array(z.object({
    purchaseOrderItemId: z.number().min(1, 'Article requis'),
    quantityReceived: z.number().min(1, 'Quantité reçue requise'),
    notes: z.string().optional()
  })).min(1, 'Au moins un article requis')
});

type CreateReceiptFormData = z.infer<typeof createReceiptSchema>;

interface CreateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: any;
}

export const CreateReceiptModal: React.FC<CreateReceiptModalProps> = ({ isOpen, onClose, purchase }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<CreateReceiptFormData>({
    resolver: zodResolver(createReceiptSchema),
    defaultValues: {
      receiptDate: new Date().toISOString().split('T')[0],
      items: purchase.items?.map((item: any) => ({
        purchaseOrderItemId: item.id,
        quantityReceived: item.quantity - (item.quantityReceived || 0),
        notes: ''
      })) || []
    }
  });

  const items = watch('items') || [];

  const createReceiptMutation = useMutation({
    mutationFn: (data: CreateReceiptFormData) => 
      purchaseService.update(purchase.id, { 
        receipt: data,
        status: items.every((item: any) => {
          const purchaseItem = purchase.items.find((pi: any) => pi.id === item.purchaseOrderItemId);
          return item.quantityReceived >= (purchaseItem.quantity - (purchaseItem.quantityReceived || 0));
        }) ? 'COMPLETED' : 'RECEIVED'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateReceiptFormData) => {
    setIsLoading(true);
    try {
      await createReceiptMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantityReceived = (index: number, value: number) => {
    const newItems = [...items];
    newItems[index].quantityReceived = value;
    setValue('items', newItems);
  };

  if (!isOpen || !purchase) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Réception de commande {purchase.orderNumber}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Date de réception */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de réception *</label>
            <input
              {...register('receiptDate')}
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.receiptDate && <p className="mt-1 text-sm text-red-600">{errors.receiptDate.message}</p>}
          </div>

          {/* Articles à recevoir */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Articles à recevoir</h4>
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Description</th>
                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Commandé</th>
                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Déjà reçu</th>
                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">À recevoir</th>
                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Quantité reçue *</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {items.map((item: any, index: number) => {
                    const purchaseItem = purchase.items.find((pi: any) => pi.id === item.purchaseOrderItemId);
                    const remaining = purchaseItem.quantity - (purchaseItem.quantityReceived || 0);
                    
                    return (
                      <tr key={index}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900">
                          {purchaseItem.description}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right">
                          {purchaseItem.quantity}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right">
                          {purchaseItem.quantityReceived || 0}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right">
                          {remaining}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            value={item.quantityReceived}
                            onChange={(e) => updateQuantityReceived(index, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-right"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          <input
                            {...register(`items.${index}.notes` as const)}
                            type="text"
                            className="w-full px-2 py-1 border border-gray-300 rounded-md"
                            placeholder="Notes..."
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {errors.items?.root && (
              <p className="mt-1 text-sm text-red-600">{errors.items.root.message}</p>
            )}
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
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Check className="h-4 w-4" />
              <span>{isLoading ? 'Enregistrement...' : 'Enregistrer la réception'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};