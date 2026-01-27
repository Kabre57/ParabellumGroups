'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, FileText, Calendar, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateMission } from '@/hooks/useTechnical';

// Utiliser les mêmes valeurs que le backend: BASSE, MOYENNE, HAUTE, URGENTE
const createMissionSchema = z.object({
  titre: z.string().min(1, 'Titre requis'),
  description: z.string().optional(),
  clientNom: z.string().min(1, 'Nom du client requis'),
  clientContact: z.string().optional(),
  adresse: z.string().min(1, 'Adresse requise'),
  dateDebut: z.string().min(1, 'Date de début requise'),
  dateFin: z.string().optional(),
  priorite: z.enum(['BASSE', 'MOYENNE', 'HAUTE', 'URGENTE']).default('MOYENNE'),
  budgetEstime: z.string().optional(),
  notes: z.string().optional()
});

type CreateMissionFormData = z.infer<typeof createMissionSchema>;

interface CreateMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateMissionModal: React.FC<CreateMissionModalProps> = ({ isOpen, onClose }) => {
  const createMutation = useCreateMission();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<CreateMissionFormData>({
    resolver: zodResolver(createMissionSchema),
    defaultValues: {
      priorite: 'MOYENNE',
      dateDebut: new Date().toISOString().split('T')[0]
    }
  });

  const onSubmit = async (data: CreateMissionFormData) => {
    try {
      console.log('Données soumises:', data);
      
      const payload = {
        ...data,
        budgetEstime: data.budgetEstime ? parseFloat(data.budgetEstime) : undefined,
        // Assurer que les dates sont au bon format
        dateDebut: data.dateDebut,
        dateFin: data.dateFin || undefined
      };
      
      console.log('Payload envoyé:', payload);
      
      await createMutation.mutateAsync(payload);
      toast.success('Mission créée avec succès');
      reset();
      onClose();
    } catch (error: any) {
      console.error('Erreur détaillée création mission:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Erreur inconnue';
      toast.error(`Erreur: ${errorMessage}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600" />
            Créer une Mission
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            type="button"
            disabled={createMutation.isPending}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Titre de la Mission *
            </label>
            <input
              {...register('titre')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Ex: Installation électrique bâtiment A"
              disabled={createMutation.isPending}
            />
            {errors.titre && <p className="mt-1 text-sm text-red-600">{errors.titre.message}</p>}
          </div>

          {/* Client */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom du Client *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('clientNom')}
                  type="text"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Nom du client"
                  disabled={createMutation.isPending}
                />
              </div>
              {errors.clientNom && <p className="mt-1 text-sm text-red-600">{errors.clientNom.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contact Client
              </label>
              <input
                {...register('clientContact')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Téléphone ou email"
                disabled={createMutation.isPending}
              />
            </div>
          </div>

          {/* Adresse */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Adresse du Chantier *
            </label>
            <input
              {...register('adresse')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Adresse complète du lieu d'intervention"
              disabled={createMutation.isPending}
            />
            {errors.adresse && <p className="mt-1 text-sm text-red-600">{errors.adresse.message}</p>}
          </div>

          {/* Dates et Priorité */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date de Début *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('dateDebut')}
                  type="date"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={createMutation.isPending}
                />
              </div>
              {errors.dateDebut && <p className="mt-1 text-sm text-red-600">{errors.dateDebut.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date de Fin
              </label>
              <input
                {...register('dateFin')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min={watch('dateDebut')}
                disabled={createMutation.isPending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priorité *
              </label>
              <div className="relative">
                <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  {...register('priorite')}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={createMutation.isPending}
                >
                  <option value="BASSE">Basse</option>
                  <option value="MOYENNE">Moyenne</option>
                  <option value="HAUTE">Haute</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>
              {errors.priorite && <p className="mt-1 text-sm text-red-600">{errors.priorite.message}</p>}
            </div>
          </div>

          {/* Budget Estimé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Budget Estimé (FCFA)
            </label>
            <input
              {...register('budgetEstime')}
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Montant estimé"
              disabled={createMutation.isPending}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Description détaillée de la mission..."
              disabled={createMutation.isPending}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes Complémentaires
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Notes, contraintes, informations supplémentaires..."
              disabled={createMutation.isPending}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={createMutation.isPending}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Création...
                </span>
              ) : (
                'Créer la mission'
              )}
            </button>
          </div>

          {/* Debug info */}
          {createMutation.isError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">
                Erreur: {createMutation.error instanceof Error ? createMutation.error.message : 'Erreur inconnue'}
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};