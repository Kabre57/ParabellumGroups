'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, User as UserIcon, Phone, Wrench, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useSpecialites, useCreateTechnicien } from '@/hooks/useTechnical';
import { Specialite } from '@/shared/api/technical';

const createTechnicienSchema = z.object({
  prenom: z.string().min(1, 'Prénom requis'),
  nom: z.string().min(1, 'Nom requis'),
  telephone: z.string().min(1, 'Téléphone requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  specialiteId: z.string().min(1, 'Spécialité requise'),
  matricule: z.string().min(1, 'Matricule requis'),
  dateEmbauche: z.string().min(1, 'Date d\'embauche requise'),
  tauxHoraire: z.string().optional()
});

type CreateTechnicienFormData = z.infer<typeof createTechnicienSchema>;

interface CreateTechnicienModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTechnicienModal: React.FC<CreateTechnicienModalProps> = ({ isOpen, onClose }) => {
  const { data: specialites, isLoading: isLoadingSpecialites, error: specialitesError } = useSpecialites();
  
  // Debug
  console.log('Specialites dans modal:', {
    data: specialites,
    isLoading: isLoadingSpecialites,
    error: specialitesError,
    isArray: Array.isArray(specialites),
    length: Array.isArray(specialites) ? specialites.length : 'not array'
  });

  const createMutation = useCreateTechnicien();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CreateTechnicienFormData>({
    resolver: zodResolver(createTechnicienSchema),
    defaultValues: {
      dateEmbauche: new Date().toISOString().split('T')[0]
    }
  });

  const onSubmit = async (data: CreateTechnicienFormData) => {
    try {
      const payload = {
        ...data,
        email: data.email || undefined,
        tauxHoraire: data.tauxHoraire ? parseFloat(data.tauxHoraire) : undefined
      };
      await createMutation.mutateAsync(payload);
      toast.success('Technicien créé avec succès');
      reset();
      onClose();
    } catch (error) {
      console.error('Erreur création technicien:', error);
      toast.error('Erreur lors de la création du technicien');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
            Créer un Technicien
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" type="button">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          {/* Identité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom *</label>
              <input
                {...register('prenom')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Prénom"
              />
              {errors.prenom && <p className="mt-1 text-sm text-red-600">{errors.prenom.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
              <input
                {...register('nom')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Nom"
              />
              {errors.nom && <p className="mt-1 text-sm text-red-600">{errors.nom.message}</p>}
            </div>
          </div>

          {/* Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                {...register('telephone')}
                type="text"
                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="+225 07 07 07 07 07"
              />
            </div>
            {errors.telephone && <p className="mt-1 text-sm text-red-600">{errors.telephone.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                {...register('email')}
                type="email"
                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="email@exemple.com"
              />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          {/* Spécialité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Spécialité *</label>
            <div className="relative">
              <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                {...register('specialiteId')}
                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={isLoadingSpecialites}
              >
                <option value="">Sélectionner une spécialité</option>
                
                {/* Afficher un message de chargement */}
                {isLoadingSpecialites && (
                  <option disabled>Chargement des spécialités...</option>
                )}
                
                {/* Afficher les spécialités quand elles sont chargées */}
                {!isLoadingSpecialites && Array.isArray(specialites) && specialites.length > 0 && (
                  specialites.map((s: Specialite) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))
                )}
                
                {/* Afficher un message si aucune spécialité */}
                {!isLoadingSpecialites && Array.isArray(specialites) && specialites.length === 0 && (
                  <option disabled>Aucune spécialité disponible</option>
                )}
                
                {/* Afficher un message d'erreur */}
                {specialitesError && (
                  <option disabled>Erreur de chargement</option>
                )}
              </select>
            </div>
            {errors.specialiteId && <p className="mt-1 text-sm text-red-600">{errors.specialiteId.message}</p>}
            
            {/* Messages d'information */}
            {specialitesError && (
              <p className="mt-1 text-sm text-red-600">
                Impossible de charger les spécialités. Veuillez réessayer.
              </p>
            )}
            
            {!isLoadingSpecialites && Array.isArray(specialites) && specialites.length === 0 && (
              <p className="mt-1 text-sm text-yellow-600">
                Aucune spécialité disponible. Veuillez d'abord créer une spécialité.
              </p>
            )}
          </div>

          {/* Matricule et Date Embauche */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Matricule *</label>
              <input
                {...register('matricule')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="TECH-001"
              />
              {errors.matricule && <p className="mt-1 text-sm text-red-600">{errors.matricule.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date d'Embauche *</label>
              <input
                {...register('dateEmbauche')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {errors.dateEmbauche && <p className="mt-1 text-sm text-red-600">{errors.dateEmbauche.message}</p>}
            </div>
          </div>

          {/* Taux Horaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taux Horaire (FCFA)</label>
            <input
              {...register('tauxHoraire')}
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Taux horaire"
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
              disabled={createMutation.isPending || isLoadingSpecialites || (Array.isArray(specialites) && specialites.length === 0)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Création...' : 'Créer le technicien'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
