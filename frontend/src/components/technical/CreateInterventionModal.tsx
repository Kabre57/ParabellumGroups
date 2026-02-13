'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useMissions, useInterventions, useIntervention, useCreateIntervention, useUpdateIntervention } from '@/hooks/useTechnical';
import { useRouter } from 'next/navigation';

const createInterventionSchema = z.object({
  titre: z.string().min(1, 'Titre requis'),
  missionId: z.string().min(1, 'Mission requise'),
  dateHeureDebut: z.string().min(1, 'Date de début requise'),
  dateHeureFin: z.string().optional(),
  description: z.string().optional(),
  priorite: z.enum(['BASSE', 'MOYENNE', 'HAUTE', 'URGENTE']).default('MOYENNE')
});

type CreateInterventionFormData = z.infer<typeof createInterventionSchema>;

interface CreateInterventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionId?: string;
  interventionId?: string;
}

export const CreateInterventionModal: React.FC<CreateInterventionModalProps> = ({
  isOpen,
  onClose,
  missionId,
  interventionId
}) => {
  const router = useRouter();
  const { data: missions = [] } = useMissions({ pageSize: 100 });
  const { data: interventions = [] } = useInterventions({ pageSize: 500 });
  const { data: currentIntervention } = useIntervention(interventionId || '');

  const missionIdsWithIntervention = [...new Set((interventions as any[]).map((i: any) => i.missionId).filter(Boolean))];
  const currentMissionId = (currentIntervention as any)?.data?.missionId ?? (currentIntervention as any)?.missionId ?? missionId;
  const availableMissions = missions.filter(
    (m: any) =>
      !missionIdsWithIntervention.includes(m.id) ||
      m.id === currentMissionId ||
      (missionId && m.id === missionId)
  );

  const createMutation = useCreateIntervention();
  const updateMutation = useUpdateIntervention();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<CreateInterventionFormData>({
    resolver: zodResolver(createInterventionSchema),
    defaultValues: {
      titre: '',
      missionId: missionId || '',
      dateHeureDebut: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
      priorite: 'MOYENNE'
    }
  });

  const dateHeureDebut = watch('dateHeureDebut') ?? '';
  const dateHeureFin = watch('dateHeureFin') ?? '';

  const calculateDuration = () => {
    if (!dateHeureDebut || !dateHeureFin) return null;
    const debut = new Date(dateHeureDebut);
    const fin = new Date(dateHeureFin);
    if (isNaN(debut.getTime()) || isNaN(fin.getTime())) return null;
    const diffMs = fin.getTime() - debut.getTime();
    if (diffMs <= 0) return null;
    const minutes = Math.round(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${String(mins).padStart(2, '0')}`;
  };

  const onSubmit = async (data: CreateInterventionFormData) => {
    try {
      if (interventionId) {
        await updateMutation.mutateAsync({
          id: interventionId,
          data: {
            titre: data.titre,
            missionId: data.missionId,
            dateDebut: data.dateHeureDebut,
            dateFin: data.dateHeureFin,
            description: data.description,
            priorite: data.priorite
          }
        });
        toast.success('Intervention mise à jour avec succès');
        reset();
        onClose();
      } else {
        const response = await createMutation.mutateAsync({
          titre: data.titre,
          missionId: data.missionId,
          dateDebut: data.dateHeureDebut,
          dateFin: data.dateHeureFin,
          description: data.description,
          priorite: data.priorite
        });
        
        toast.success('Intervention créée avec succès ! Ajoutez maintenant des techniciens et du matériel.');
        reset();
        onClose();
        
        // Rediriger vers la page de détails pour ajouter techniciens et matériel
        const interventionId = (response as any)?.data?.id || (response as any)?.id;
        if (interventionId) {
          router.push(`/dashboard/technical/interventions/${interventionId}`);
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde de l\'intervention:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la sauvegarde de l\'intervention');
    }
  };

  useEffect(() => {
    if (isOpen) {
      reset({
        titre: '',
        missionId: missionId || '',
        dateHeureDebut: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16),
        priorite: 'MOYENNE'
      });
    }
  }, [isOpen, missionId, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            {interventionId ? "Modifier l'Intervention" : "Nouvelle Intervention"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" type="button">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Titre de l'Intervention *
            </label>
            <input
              {...register('titre')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Ex: Installation système électrique"
            />
            {errors.titre && <p className="mt-1 text-sm text-red-600">{errors.titre.message}</p>}
          </div>

          {/* Mission */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mission *</label>
            <select
              {...register('missionId')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={!!missionId}
            >
              <option value="">Sélectionner une mission</option>
              {availableMissions
                .filter((mission: any) => mission.status !== 'TERMINEE' && mission.status !== 'ANNULEE')
                .map((mission: any) => (
                  <option key={mission.id} value={mission.id}>
                    {mission.numeroMission} - {mission.titre} ({mission.status})
                  </option>
                ))}
            </select>
            {errors.missionId && <p className="mt-1 text-sm text-red-600">{errors.missionId.message}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date et Heure de Début *
              </label>
              <input
                {...register('dateHeureDebut')}
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {errors.dateHeureDebut && (
                <p className="mt-1 text-sm text-red-600">{errors.dateHeureDebut.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date et Heure de Fin
              </label>
              <input
                {...register('dateHeureFin')}
                type="datetime-local"
                min={dateHeureDebut || undefined}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Durée calculée */}
          {calculateDuration() && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  Durée calculée: {calculateDuration()}
                </span>
              </div>
            </div>
          )}

          {/* Priorité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priorité</label>
            <select
              {...register('priorite')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="BASSE">Basse</option>
              <option value="MOYENNE">Moyenne</option>
              <option value="HAUTE">Haute</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Instructions, objectifs spécifiques, contraintes..."
            />
          </div>

          {/* Info message */}
          {!interventionId && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 Après la création, vous pourrez ajouter des techniciens et du matériel depuis la page de détails.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {interventionId ? 'Mise à jour...' : 'Création...'}
                </>
              ) : (
                interventionId ? "Mettre à jour" : "Créer l'intervention"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
