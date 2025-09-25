import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Package, User } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../services/api';

const materielService = createCrudService('materiels');
const technicienService = createCrudService('techniciens');

const sortieMaterielSchema = z.object({
  materielId: z.number().min(1, 'Matériel requis'),
  quantite: z.number().min(1, 'Quantité invalide'),
  technicienId: z.number().min(1, 'Technicien requis'),
  motif: z.string().min(1, 'Motif requis'),
  dateSortie: z.string().min(1, 'Date de sortie requise')
});

type SortieMaterielFormData = z.infer<typeof sortieMaterielSchema>;

interface SortieMaterielModalProps {
  isOpen: boolean;
  onClose: () => void;
  interventionId: number;
}

export const SortieMaterielModal: React.FC<SortieMaterielModalProps> = ({ 
  isOpen, 
  onClose, 
  interventionId 
}) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: materiels } = useQuery({
    queryKey: ['materiels'],
    queryFn: () => materielService.getAll({ limit: 100, statut: 'actif' })
  });

  const { data: techniciens } = useQuery({
    queryKey: ['techniciens'],
    queryFn: () => technicienService.getAll({ limit: 100, isActive: true })
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<SortieMaterielFormData>({
    resolver: zodResolver(sortieMaterielSchema),
    defaultValues: {
      quantite: 1,
      dateSortie: new Date().toISOString().slice(0, 16)
    }
  });

  const createSortieMaterielMutation = useMutation({
    mutationFn: (data: SortieMaterielFormData) =>
      fetch(`/api/v1/interventions/${interventionId}/sortie-materiel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      queryClient.invalidateQueries({ queryKey: ['materiels'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: SortieMaterielFormData) => {
    setIsLoading(true);
    try {
      await createSortieMaterielMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la sortie:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const materielsList = materiels?.data?.materiels || [];
  const techniciensList = techniciens?.data?.techniciens || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Sortie de Matériel
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Matériel *</label>
            <select
              {...register('materielId', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner un matériel</option>
              {materielsList.map((materiel: any) => (
                <option key={materiel.id} value={materiel.id}>
                  {materiel.designation} ({materiel.reference}) - Stock: {materiel.quantiteDisponible}
                </option>
              ))}
            </select>
            {errors.materielId && <p className="mt-1 text-sm text-red-600">{errors.materielId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité *</label>
            <input
              {...register('quantite', { valueAsNumber: true })}
              type="number"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.quantite && <p className="mt-1 text-sm text-red-600">{errors.quantite.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technicien *</label>
            <select
              {...register('technicienId', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner un technicien</option>
              {techniciensList.map((technicien: any) => (
                <option key={technicien.id} value={technicien.id}>
                  {technicien.prenom} {technicien.nom}
                </option>
              ))}
            </select>
            {errors.technicienId && <p className="mt-1 text-sm text-red-600">{errors.technicienId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de sortie *</label>
            <input
              {...register('dateSortie')}
              type="datetime-local"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.dateSortie && <p className="mt-1 text-sm text-red-600">{errors.dateSortie.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motif *</label>
            <textarea
              {...register('motif')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Motif de la sortie de matériel..."
            />
            {errors.motif && <p className="mt-1 text-sm text-red-600">{errors.motif.message}</p>}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
              {isLoading ? 'Enregistrement...' : 'Enregistrer la sortie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};