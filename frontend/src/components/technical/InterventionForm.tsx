'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { useMissions } from '@/hooks/useTechnical';
import { Intervention } from '@/shared/api/technical';

interface InterventionFormProps {
  item?: Intervention;
  onSubmit: (data: Partial<Intervention>) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function InterventionForm({ item, onSubmit, onClose, isLoading }: InterventionFormProps) {
  const { data: missions = [] } = useMissions({ pageSize: 100 });

  const defaultDateDebut = item?.dateDebut
    ? new Date(item.dateDebut).toISOString().slice(0, 16)
    : '';
  const defaultDateFin = item?.dateFin
    ? new Date(item.dateFin).toISOString().slice(0, 16)
    : '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Partial<Intervention>>({
    defaultValues: item || {
      missionId: '',
      titre: '',
      description: '',
      dateDebut: defaultDateDebut,
      dateFin: defaultDateFin,
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
                })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
              >
                <option value="">Selectionner une mission</option>
                {missions.map((mission: any) => (
                  <option key={mission.id} value={mission.id}>
                    {mission.numeroMission} - {mission.titre}
                  </option>
                ))}
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
                placeholder="Intervention maintenance preventive"
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
                placeholder="Description detaillee de l'intervention..."
              />
            </div>

            {/* Date Debut */}
            <div>
              <Label htmlFor="dateDebut">Date et heure de debut *</Label>
              <Input
                id="dateDebut"
                type="datetime-local"
                {...register('dateDebut', { required: 'La date de debut est obligatoire' })}
              />
              {errors.dateDebut && (
                <p className="text-sm text-red-600 mt-1">{errors.dateDebut.message}</p>
              )}
            </div>

            {/* Date Fin */}
            <div>
              <Label htmlFor="dateFin">Date et heure de fin</Label>
              <Input id="dateFin" type="datetime-local" {...register('dateFin')} />
            </div>

            {/* Duree Estimee */}
            <div>
              <Label htmlFor="dureeEstimee">Duree estimee (heures)</Label>
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

            {/* Resultats */}
            <div className="md:col-span-2">
              <Label htmlFor="resultats">Resultats</Label>
              <textarea
                id="resultats"
                {...register('resultats')}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
                rows={4}
                placeholder="Compte-rendu des resultats de l'intervention..."
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enregistrement...' : item ? 'Mettre a jour' : 'Creer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
