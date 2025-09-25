import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, FileText, User, Calendar, Image, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const rapportService = createCrudService('rapports');
const missionService = createCrudService('missions');
const technicienService = createCrudService('techniciens');
const interventionService = createCrudService('interventions');

const imageSchema = z.object({
  url: z.string().url('URL invalide'),
  description: z.string().optional()
});

const createRapportSchema = z.object({
  titre: z.string().min(1, 'Titre requis'),
  contenu: z.string().min(1, 'Contenu requis'),
  interventionId: z.number().optional(),
  technicienId: z.number().min(1, 'Technicien requis'),
  missionId: z.string().min(1, 'Mission requise'),
  commentaire: z.string().optional(),
  images: z.array(imageSchema).optional()
});

type CreateRapportFormData = z.infer<typeof createRapportSchema>;

interface CreateRapportModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionId?: string;
  interventionId?: number;
}

export const CreateRapportModal: React.FC<CreateRapportModalProps> = ({ 
  isOpen, 
  onClose, 
  missionId,
  interventionId 
}) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: missions } = useQuery({
    queryKey: ['missions'],
    queryFn: () => missionService.getAll({ limit: 100 })
  });

  const { data: techniciens } = useQuery({
    queryKey: ['techniciens'],
    queryFn: () => technicienService.getAll({ isActive: true, limit: 100 })
  });

  const { data: interventions } = useQuery({
    queryKey: ['interventions', missionId],
    queryFn: () => interventionService.getAll({ missionId, limit: 100 }),
    enabled: !!missionId
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch
  } = useForm<CreateRapportFormData>({
    resolver: zodResolver(createRapportSchema),
    defaultValues: {
      missionId,
      interventionId,
      images: []
    }
  });

  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({
    control,
    name: 'images'
  });

  const selectedMissionId = watch('missionId');

  const createRapportMutation = useMutation({
    mutationFn: (data: CreateRapportFormData) => rapportService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapports'] });
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

  if (!isOpen) return null;

  const missionsList = missions?.data?.missions || [];
  const techniciensList = techniciens?.data?.techniciens || [];
  const interventionsList = interventions?.data?.interventions || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Créer un Rapport de Mission
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mission</label>
              <select
                {...register('missionId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={!!missionId}
              >
                <option value="">Sélectionner une mission</option>
                {missionsList.map((mission: any) => (
                  <option key={mission.numIntervention} value={mission.numIntervention}>
                    {mission.numIntervention} - {mission.objectifDuContrat}
                  </option>
                ))}
              </select>
              {errors.missionId && <p className="mt-1 text-sm text-red-600">{errors.missionId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Technicien</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  {...register('technicienId', { valueAsNumber: true })}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner un technicien</option>
                  {techniciensList.map((technicien: any) => (
                    <option key={technicien.id} value={technicien.id}>
                      {technicien.prenom} {technicien.nom} - {technicien.specialite?.libelle}
                    </option>
                  ))}
                </select>
              </div>
              {errors.technicienId && <p className="mt-1 text-sm text-red-600">{errors.technicienId.message}</p>}
            </div>
          </div>

          {/* Intervention (optionnel) */}
          {selectedMissionId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intervention (optionnel)</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  {...register('interventionId', { valueAsNumber: true })}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={!!interventionId}
                >
                  <option value="">Rapport général de mission</option>
                  {interventionsList.map((intervention: any) => (
                    <option key={intervention.id} value={intervention.id}>
                      Intervention #{intervention.id} - {new Date(intervention.dateHeureDebut).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Titre et contenu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre du rapport</label>
            <input
              {...register('titre')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Rapport d'intervention du..."
            />
            {errors.titre && <p className="mt-1 text-sm text-red-600">{errors.titre.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenu du rapport</label>
            <textarea
              {...register('contenu')}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Décrivez en détail les travaux effectués, les observations, les recommandations..."
            />
            {errors.contenu && <p className="mt-1 text-sm text-red-600">{errors.contenu.message}</p>}
          </div>

          {/* Images */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Images du rapport</h4>
              <button
                type="button"
                onClick={() => appendImage({ url: '', description: '' })}
                className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter Image
              </button>
            </div>

            {imageFields.length > 0 && (
              <div className="space-y-3">
                {imageFields.map((field, index) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Image {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL de l'image</label>
                        <input
                          {...register(`images.${index}.url` as const)}
                          type="url"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="https://exemple.com/image.jpg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input
                          {...register(`images.${index}.description` as const)}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Description de l'image"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
            <textarea
              {...register('commentaire')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Commentaires additionnels..."
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
              {isLoading ? 'Création...' : 'Créer le rapport'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};