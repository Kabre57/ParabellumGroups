import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, User, Building2, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const customerService = createCrudService('customers');
const serviceService = createCrudService('services');

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  type: z.enum(['INDIVIDUAL', 'COMPANY']),
  legalName: z.string().optional(),
  siret: z.string().optional(),
  vatNumber: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  website: z.string().url('URL invalide').optional().or(z.literal('')),
  paymentTerms: z.number().min(0).max(365).default(30),
  paymentMethod: z.enum(['TRANSFER', 'CHECK', 'CARD', 'CASH', 'OTHER']).default('TRANSFER'),
  creditLimit: z.number().min(0).default(0),
  discountRate: z.number().min(0).max(100).default(0),
  category: z.string().optional(),
  notes: z.string().optional(),
  // Adresse
  addressLine1: z.string().min(1, 'Adresse requise'),
  addressLine2: z.string().optional(),
  postalCode: z.string().min(1, 'Code postal requis'),
  city: z.string().min(1, 'Ville requise'),
  country: z.string().default('Côte d\'Ivoire')
});

type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<CreateCustomerFormData>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      type: 'COMPANY',
      paymentTerms: 30,
      paymentMethod: 'TRANSFER',
      creditLimit: 0,
      discountRate: 0,
      country: 'Côte d\'Ivoire'
    }
  });

  const customerType = watch('type');

  const createCustomerMutation = useMutation({
    mutationFn: (data: CreateCustomerFormData) => {
      const { addressLine1, addressLine2, postalCode, city, country, ...customerData } = data;
      return customerService.create({
        ...customerData,
        addresses: [{
          type: 'BILLING',
          name: 'Adresse principale',
          addressLine1,
          addressLine2,
          postalCode,
          city,
          country,
          isDefault: true
        }]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateCustomerFormData) => {
    setIsLoading(true);
    try {
      await createCustomerMutation.mutateAsync(data);
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
          <h3 className="text-lg font-medium text-gray-900">Créer un Client</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Type de client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de client</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input {...register('type')} type="radio" value="COMPANY" className="mr-2" />
                <Building2 className="h-4 w-4 mr-1" />
                Entreprise
              </label>
              <label className="flex items-center">
                <input {...register('type')} type="radio" value="INDIVIDUAL" className="mr-2" />
                <User className="h-4 w-4 mr-1" />
                Particulier
              </label>
            </div>
          </div>

          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {customerType === 'COMPANY' ? 'Nom de l\'entreprise' : 'Nom complet'}
              </label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder={customerType === 'COMPANY' ? 'ACME Corp' : 'Jean Dupont'}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            {customerType === 'COMPANY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raison sociale</label>
                <input
                  {...register('legalName')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ACME Corporation SARL"
                />
              </div>
            )}
          </div>

          {/* Informations légales pour entreprises */}
          {customerType === 'COMPANY' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                <input
                  {...register('siret')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="CI-123456789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro TVA</label>
                <input
                  {...register('vatNumber')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="TVACI123456789"
                />
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('email')}
                  type="email"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="contact@exemple.com"
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
                  placeholder="+225 07 07 07 07 07"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
              <input
                {...register('mobile')}
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="+225 07 07 07 07 07"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
              <input
                {...register('website')}
                type="url"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://exemple.com"
              />
              {errors.website && <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>}
            </div>
          </div>

          {/* Adresse */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              Adresse
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse ligne 1</label>
                <input
                  {...register('addressLine1')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123 Rue de la Paix"
                />
                {errors.addressLine1 && <p className="mt-1 text-sm text-red-600">{errors.addressLine1.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse ligne 2</label>
                <input
                  {...register('addressLine2')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Appartement, étage, etc."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                  <input
                    {...register('postalCode')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="01 BP 1234"
                  />
                  {errors.postalCode && <p className="mt-1 text-sm text-red-600">{errors.postalCode.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    {...register('city')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Abidjan"
                  />
                  {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                  <input
                    {...register('country')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Côte d'Ivoire"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Conditions commerciales */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              Conditions Commerciales
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Délai de paiement (jours)</label>
                <input
                  {...register('paymentTerms', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  max="365"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Limite de crédit (FCFA)</label>
                <input
                  {...register('creditLimit', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taux de remise (%)</label>
                <input
                  {...register('discountRate', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Catégorie et notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <input
                {...register('category')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Grande entreprise, PME, etc."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Notes sur le client..."
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
              {isLoading ? 'Création...' : 'Créer le client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};