// components/Modals/Edit/EditSupplierModal.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Building2, Mail, Phone, MapPin, CreditCard, User } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const supplierService = createCrudService('suppliers');

const editSupplierSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  contactName: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('Côte d\'Ivoire'),
  vatNumber: z.string().optional(),
  paymentTerms: z.number().min(0).max(365).default(30),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true)
});

type EditSupplierFormData = z.infer<typeof editSupplierSchema>;

interface EditSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: any;
}

export const EditSupplierModal: React.FC<EditSupplierModalProps> = ({ isOpen, onClose, supplier }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<EditSupplierFormData>({
    resolver: zodResolver(editSupplierSchema)
  });

  useEffect(() => {
    if (supplier) {
      setValue('name', supplier.name || '');
      setValue('contactName', supplier.contactName || '');
      setValue('email', supplier.email || '');
      setValue('phone', supplier.phone || '');
      setValue('address', supplier.address || '');
      setValue('city', supplier.city || '');
      setValue('postalCode', supplier.postalCode || '');
      setValue('country', supplier.country || 'Côte d\'Ivoire');
      setValue('vatNumber', supplier.vatNumber || '');
      setValue('paymentTerms', supplier.paymentTerms || 30);
      setValue('bankName', supplier.bankName || '');
      setValue('bankAccount', supplier.bankAccount || '');
      setValue('notes', supplier.notes || '');
      setValue('isActive', supplier.isActive !== undefined ? supplier.isActive : true);
    }
  }, [supplier, setValue]);

  const updateSupplierMutation = useMutation({
    mutationFn: (data: EditSupplierFormData) => supplierService.update(supplier.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      onClose();
    }
  });

  const onSubmit = async (data: EditSupplierFormData) => {
    setIsLoading(true);
    try {
      await updateSupplierMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Modifier le Fournisseur
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du fournisseur *</label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact principal</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('contactName')}
                  type="text"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Coordonnées */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('email')}
                  type="email"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('phone')}
                  type="tel"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Statut */}
          <div>
            <label className="flex items-center">
              <input
                {...register('isActive')}
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Fournisseur actif</span>
            </label>
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
              {isLoading ? 'Modification...' : 'Modifier le fournisseur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};