'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { technicalService, CreateRapportInterventionRequest } from '@/shared/api/services/technical';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

const rapportSchema = z.object({
  interventionId: z.string().min(1, 'L\'intervention est requise'),
  workDone: z.string().min(10, 'Veuillez décrire les travaux effectués (min. 10 caractères)'),
  issuesFound: z.string().optional(),
  recommendations: z.string().optional(),
});

type RapportFormData = z.infer<typeof rapportSchema>;

interface RapportInterventionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function RapportInterventionForm({ onSuccess, onCancel }: RapportInterventionFormProps) {
  const queryClient = useQueryClient();
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ url: string; name: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [rapportId, setRapportId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<RapportFormData>({
    resolver: zodResolver(rapportSchema),
    defaultValues: {
      interventionId: '',
      workDone: '',
      issuesFound: '',
      recommendations: '',
    },
  });

  const { data: interventionsData } = useQuery({
    queryKey: ['interventions-for-rapport'],
    queryFn: () => technicalService.getInterventions({ status: 'COMPLETED', pageSize: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateRapportInterventionRequest) => technicalService.createRapport(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rapports'] });
      setRapportId(data.id);
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: ({ rapportId, file }: { rapportId: string; file: File }) =>
      technicalService.uploadPhoto(rapportId, file),
    onSuccess: (data, variables) => {
      setUploadedPhotos((prev) => [...prev, { url: data.url, name: variables.file.name }]);
      setIsUploading(false);
    },
    onError: () => {
      setIsUploading(false);
    },
  });

  const onSubmit = (data: RapportFormData) => {
    const payload: CreateRapportInterventionRequest = {
      interventionId: data.interventionId,
      workDone: data.workDone,
      issuesFound: data.issuesFound,
      recommendations: data.recommendations,
    };

    createMutation.mutate(payload);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!rapportId) {
      alert('Veuillez d\'abord créer le rapport avant d\'uploader des photos');
      return;
    }

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Vérification du type de fichier
      if (!file.type.startsWith('image/')) {
        alert(`Le fichier ${file.name} n'est pas une image valide`);
        continue;
      }

      // Vérification de la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`Le fichier ${file.name} est trop volumineux (max 5MB)`);
        continue;
      }

      uploadPhotoMutation.mutate({ rapportId, file });
    }

    event.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinish = () => {
    reset();
    setUploadedPhotos([]);
    setRapportId(null);
    if (onSuccess) onSuccess();
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Rapport d'intervention
      </h2>

      {createMutation.isError && (
        <Alert className="mb-4 bg-red-50 border-red-200 text-red-800">
          Une erreur est survenue lors de la création du rapport
        </Alert>
      )}

      {uploadPhotoMutation.isError && (
        <Alert className="mb-4 bg-red-50 border-red-200 text-red-800">
          Erreur lors de l'upload de la photo
        </Alert>
      )}

      {createMutation.isSuccess && !rapportId && (
        <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
          Rapport créé avec succès
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Intervention */}
        <div>
          <Label htmlFor="interventionId">
            Intervention <span className="text-red-500">*</span>
          </Label>
          <select
            id="interventionId"
            {...register('interventionId')}
            disabled={!!rapportId}
            className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 text-sm mt-1 disabled:opacity-50"
          >
            <option value="">Sélectionner une intervention</option>
            {interventionsData?.data?.map((intervention) => (
              <option key={intervention.id} value={intervention.id}>
                {intervention.mission?.title || intervention.missionNum} -{' '}
                {intervention.technician
                  ? `${intervention.technician.firstName} ${intervention.technician.lastName}`
                  : ''}
                {' - '}
                {new Date(intervention.scheduledDate || intervention.date).toLocaleDateString('fr-FR')}
              </option>
            ))}
          </select>
          {errors.interventionId && (
            <p className="mt-1 text-sm text-red-600">{errors.interventionId.message}</p>
          )}
        </div>

        {/* Travaux effectués */}
        <div>
          <Label htmlFor="workDone">
            Travaux effectués <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="workDone"
            rows={6}
            {...register('workDone')}
            disabled={!!rapportId}
            placeholder="Décrivez en détail les travaux réalisés..."
            className="mt-1"
          />
          {errors.workDone && (
            <p className="mt-1 text-sm text-red-600">{errors.workDone.message}</p>
          )}
        </div>

        {/* Problèmes rencontrés */}
        <div>
          <Label htmlFor="issuesFound">Problèmes rencontrés</Label>
          <Textarea
            id="issuesFound"
            rows={4}
            {...register('issuesFound')}
            disabled={!!rapportId}
            placeholder="Listez les problèmes ou anomalies constatés..."
            className="mt-1"
          />
          {errors.issuesFound && (
            <p className="mt-1 text-sm text-red-600">{errors.issuesFound.message}</p>
          )}
        </div>

        {/* Recommandations */}
        <div>
          <Label htmlFor="recommendations">Recommandations</Label>
          <Textarea
            id="recommendations"
            rows={4}
            {...register('recommendations')}
            disabled={!!rapportId}
            placeholder="Vos recommandations pour la suite..."
            className="mt-1"
          />
          {errors.recommendations && (
            <p className="mt-1 text-sm text-red-600">{errors.recommendations.message}</p>
          )}
        </div>

        {/* Upload photos */}
        {rapportId && (
          <div>
            <Label htmlFor="photos">Photos</Label>
            <div className="mt-2">
              <input
                type="file"
                id="photos"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                disabled={isUploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-1 text-sm text-gray-500">
                Formats acceptés: JPG, PNG, GIF. Taille max: 5MB par fichier.
              </p>
            </div>

            {/* Liste des photos uploadées */}
            {uploadedPhotos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {uploadedPhotos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-800"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                    <p className="mt-1 text-xs text-gray-500 truncate">{photo.name}</p>
                  </div>
                ))}
              </div>
            )}

            {isUploading && (
              <p className="mt-2 text-sm text-blue-600">Upload en cours...</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          {!rapportId ? (
            <>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? 'Création...' : 'Créer le rapport'}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Annuler
                </Button>
              )}
            </>
          ) : (
            <Button type="button" onClick={handleFinish} className="flex-1">
              Terminer
            </Button>
          )}
        </div>
      </form>

      {rapportId && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Rapport créé avec succès. Vous pouvez maintenant ajouter des photos.
          </p>
        </div>
      )}
    </Card>
  );
}
