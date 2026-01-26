'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface Intervention {
  id?: number;
  missionId: number;
  titre: string;
  description?: string;
  dateDebut: string;
  heureDebut: string;
  dureeEstimee?: number;
  resultats?: string;
}

interface InterventionFormProps {
  item?: Intervention;
  onSubmit: (data: Partial<Intervention>) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function InterventionForm({ item, onSubmit, onClose, isLoading }: InterventionFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<Partial<Intervention>>({
    defaultValues: item || {
      missionId: 0,
      titre: '',
      description: '',
      dateDebut: '',
      heureDebut: '',
      dureeEstimee: 0,
      resultats: '',
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold">
            {item ? 'Modifier l\'intervention' : 'Nouvelle intervention'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mission ID */}
            <div>
              <Label htmlFor="missionId">Mission *</Label>
              <select
                id="missionId"
                {...register('missionId', { 
                  required: 'La mission est obligatoire',
                  valueAsNumber: true,
                })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
              >
                <option value={0}>Sélectionner une mission</option>
                {/* TODO: Populate with actual missions */}
              </select>
              {errors.missionId && (
                <p className="text-sm text-red-600 mt-1">{errors.missionId.message}</p>
              )}
            </div>

            {/* Titre */}
            <div>
              <Label htmlFor="titre">Titre *</Label>
              <Input
                id="titre"
                {...register('titre', { required: 'Le titre est obligatoire' })}
                placeholder="Intervention maintenance préventive"
              />
              {errors.titre && (
                <p className="text-sm text-red-600 mt-1">{errors.titre.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                {...register('description')}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
                rows={3}
                placeholder="Description détaillée de l'intervention..."
              />
            </div>

            {/* Date Début */}
            <div>
              <Label htmlFor="dateDebut">Date de début *</Label>
              <Input
                id="dateDebut"
                type="date"
                {...register('dateDebut', { required: 'La date de début est obligatoire' })}
              />
              {errors.dateDebut && (
                <p className="text-sm text-red-600 mt-1">{errors.dateDebut.message}</p>
              )}
            </div>

            {/* Heure Début */}
            <div>
              <Label htmlFor="heureDebut">Heure de début *</Label>
              <Input
                id="heureDebut"
                type="time"
                {...register('heureDebut', { required: 'L\'heure de début est obligatoire' })}
              />
              {errors.heureDebut && (
                <p className="text-sm text-red-600 mt-1">{errors.heureDebut.message}</p>
              )}
            </div>

            {/* Durée Estimée */}
            <div>
              <Label htmlFor="dureeEstimee">Durée estimée (heures)</Label>
              <Input
                id="dureeEstimee"
                type="number"
                step="0.5"
                {...register('dureeEstimee', {
                  valueAsNumber: true,
                })}
                placeholder="2.5"
              />
            </div>

            {/* Résultats */}
            <div className="md:col-span-2">
              <Label htmlFor="resultats">Résultats</Label>
              <textarea
                id="resultats"
                {...register('resultats')}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
                rows={4}
                placeholder="Compte-rendu des résultats de l'intervention..."
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enregistrement...' : (item ? 'Mettre à jour' : 'Créer')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
