import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Package, Hash, DollarSign, MapPin, Calendar } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const materielService = createCrudService('materiels');

const createMaterielSchema = z.object({
  reference: z.string().min(1, 'Référence requise'),
  designation: z.string().min(1, 'Désignation requise'),
  description: z.string().optional(),
  quantiteTotale: z.number().min(0, 'Quantité invalide').default(0),
  quantiteDisponible: z.number().min(0, 'Quantité invalide').default(0),
  seuilAlerte: z.number().min(0, 'Seuil invalide').default(5),
  emplacement: z.string().optional(),
  categorie: z.string().default('Outillage'),
  prixUnitaire: z.number().min(0, 'Prix invalide').optional(),
  fournisseur: z.string().optional(),
  dateAchat: z.string().optional(),
  garantie: z.string().optional()
});

type CreateMaterielFormData = z.infer<typeof createMaterielSchema>;

interface CreateMaterielModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const categories = [
  'Outillage',
  'Électrique',
  'Plomberie',
  'Climatisation',
  'Informatique',
  'Sécurité',
  'Véhicule',
  'Consommable'
];

export const CreateMaterielModal: React.FC<CreateMaterielModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<CreateMaterielFormData>({
    resolver: zodResolver(createMaterielSchema),
    defaultValues: {
      categorie: 'Outillage',
      quantiteTotale: 0,
      quantiteDisponible: 0,
      seuilAlerte: 5
    }
  });

  const quantiteTotale = watch('quantiteTotale');

  const createMaterielMutation = useMutation({
    mutationFn: (data: CreateMaterielFormData) => materielService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiels'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateMaterielFormData) => {
    setIsLoading(true);
    try {
      await createMaterielMutation.mutateAsync(data);
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
            Créer du Matériel
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('reference')}
                  type="text"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="MAT-001"
                />
              </div>
              {errors.reference && <p className="mt-1 text-sm text-red-600">{errors.reference.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select
                {...register('categorie')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Désignation</label>
            <input
              {...register('designation')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Perceuse électrique, Multimètre, etc."
            />
            {errors.designation && <p className="mt-1 text-sm text-red-600">{errors.designation.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Description détaillée du matériel..."
            />
          </div>

          {/* Stock */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Gestion du Stock</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantité totale</label>
                <input
                  {...register('quantiteTotale', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.quantiteTotale && <p className="mt-1 text-sm text-red-600">{errors.quantiteTotale.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantité disponible</label>
                <input
                  {...register('quantiteDisponible', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  max={quantiteTotale || 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.quantiteDisponible && <p className="mt-1 text-sm text-red-600">{errors.quantiteDisponible.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seuil d'alerte</label>
                <input
                  {...register('seuilAlerte', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Localisation et prix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emplacement</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('emplacement')}
                  type="text"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Magasin A, Atelier B, etc."
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix unitaire (FCFA)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('prixUnitaire', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Fournisseur et achat */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
              <input
                {...register('fournisseur')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nom du fournisseur"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'achat</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('dateAchat')}
                  type="date"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Garantie</label>
            <input
              {...register('garantie')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="2 ans, 6 mois, etc."
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
              {isLoading ? 'Création...' : 'Créer le matériel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};