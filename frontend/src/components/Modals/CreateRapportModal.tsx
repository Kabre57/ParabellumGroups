import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, FileText, User } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const createRapportSchema = z.object({
  titre: z.string().min(1, 'Titre requis'),
  contenu: z.string().min(1, 'Contenu requis'),
  statut: z.enum(['brouillon', 'soumis', 'valide', 'rejete']).default('brouillon')
});

type CreateRapportFormData = z.infer<typeof createRapportSchema>;

interface CreateRapportModalProps {
  isOpen: boolean;
  onClose: () => void;
  intervention: any;
}

export const CreateRapportModal: React.FC<CreateRapportModalProps> = ({ 
  isOpen, 
  onClose, 
  intervention 
}) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CreateRapportFormData>({
    resolver: zodResolver(createRapportSchema),
    defaultValues: {
      titre: `Rapport d'intervention #${intervention?.id}`,
      contenu: '',
      statut: 'brouillon'
    }
  });

  const createRapportMutation = useMutation({
    mutationFn: (data: CreateRapportFormData) =>
      fetch(`/api/v1/interventions/${intervention.id}/rapports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateRapportFormData) => {
    setIsLoading(true);
    try {
      await createRapportMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !intervention) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Nouveau Rapport
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input
              {...register('titre')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Titre du rapport"
            />
            {errors.titre && <p className="mt-1 text-sm text-red-600">{errors.titre.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenu *</label>
            <textarea
              {...register('contenu')}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Détails de l'intervention, travaux effectués, observations..."
            />
            {errors.contenu && <p className="mt-1 text-sm text-red-600">{errors.contenu.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              {...register('statut')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="brouillon">Brouillon</option>
              <option value="soumis">Soumis</option>
            </select>
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
              {isLoading ? 'Création...' : 'Créer le rapport'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};