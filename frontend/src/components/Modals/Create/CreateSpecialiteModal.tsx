import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Wrench, FileText } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const specialiteService = createCrudService('specialites');

const createSpecialiteSchema = z.object({
  libelle: z.string().min(1, 'Libellé requis'),
  description: z.string().optional()
});

type CreateSpecialiteFormData = z.infer<typeof createSpecialiteSchema>;

interface CreateSpecialiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateSpecialiteModal: React.FC<CreateSpecialiteModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CreateSpecialiteFormData>({
    resolver: zodResolver(createSpecialiteSchema)
  });

  const createSpecialiteMutation = useMutation({
    mutationFn: (data: CreateSpecialiteFormData) => specialiteService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialites'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateSpecialiteFormData) => {
    setIsLoading(true);
    try {
      await createSpecialiteMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Wrench className="h-5 w-5 mr-2" />
            Créer une Spécialité
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Libellé</label>
            <input
              {...register('libelle')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Électricité, Plomberie, etc."
            />
            {errors.libelle && <p className="mt-1 text-sm text-red-600">{errors.libelle.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
              <textarea
                {...register('description')}
                rows={4}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Description de la spécialité technique..."
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
              {isLoading ? 'Création...' : 'Créer la spécialité'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};