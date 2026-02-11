'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from 'react';
import Compress from 'compress.js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { technicalService } from '@/shared/api/technical';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

const rapportSchema = z.object({
  interventionId: z.string().min(1, "L'intervention est requise"),
  redacteurId: z.string().optional(),
  workDone: z.string().min(10, 'Veuillez decrire les travaux effectues (min. 10 caracteres)'),
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
    setError,
    clearErrors,
    watch,
    setValue,
  } = useForm<RapportFormData>({
    resolver: zodResolver(rapportSchema),
    defaultValues: {
      interventionId: '',
      redacteurId: '',
      workDone: '',
      issuesFound: '',
      recommendations: '',
    },
  });

  const { data: interventionsResponse } = useQuery<Awaited<ReturnType<typeof technicalService.getInterventions>>>({
    queryKey: ['interventions-for-rapport'],
    queryFn: () =>
      technicalService.getInterventions({
        status: 'TERMINEE',
        limit: 100,
      }),
  });
  const interventionsData = interventionsResponse?.data ?? [];

  const { data: techniciensResponse } = useQuery<Awaited<ReturnType<typeof technicalService.getTechniciens>>>({
    queryKey: ['techniciens-for-rapport'],
    queryFn: () => technicalService.getTechniciens({ pageSize: 200 }),
  });
  const techniciensData = techniciensResponse?.data ?? [];

  const interventionId = watch('interventionId');
  const redacteurId = watch('redacteurId');
  const selectedIntervention = interventionsData.find((item: any) => item.id === interventionId);
  const assignedTechnicienId =
    selectedIntervention?.techniciens?.[0]?.technicienId ||
    selectedIntervention?.techniciens?.[0]?.technicien?.id;

  useEffect(() => {
    if (!interventionId || !selectedIntervention) {
      return;
    }
    if (assignedTechnicienId && !redacteurId) {
      setValue('redacteurId', assignedTechnicienId, { shouldValidate: true });
      clearErrors('redacteurId');
      return;
    }
  }, [assignedTechnicienId, interventionId, redacteurId, selectedIntervention, setValue, clearErrors]);

  const createMutation = useMutation({
    mutationFn: (data: { interventionId: string; redacteurId: string; workDone: string; issuesFound?: string; recommendations?: string }) =>
      technicalService.createRapport({
        interventionId: data.interventionId,
        redacteurId: data.redacteurId,
        titre: 'Rapport intervention',
        contenu: data.workDone,
        conclusions: data.issuesFound,
        recommandations: data.recommendations,
      } as any),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rapports'] });
      setRapportId(data.data?.id ?? null);
    },
  });

  const onSubmit = (data: RapportFormData) => {
    if (!data.redacteurId) {
      if (assignedTechnicienId) {
        data.redacteurId = assignedTechnicienId;
      } else {
        setError('redacteurId', {
          type: 'manual',
          message: "Aucun technicien assigné à l'intervention. Veuillez sélectionner un rédacteur."
        });
        return;
      }
    }
    createMutation.mutate({
      interventionId: data.interventionId,
      redacteurId: data.redacteurId,
      workDone: data.workDone,
      issuesFound: data.issuesFound,
      recommendations: data.recommendations,
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!rapportId) {
      alert("Veuillez d'abord creer le rapport avant d'uploader des photos");
      return;
    }

    const filesArray = Array.from(files);
    const invalidType = filesArray.find((file) => !file.type.startsWith('image/'));
    if (invalidType) {
      alert('Seules les images (JPEG, PNG, WEBP) sont autorisées.');
      return;
    }
    const tooLarge = filesArray.find((file) => file.size > 5 * 1024 * 1024);
    if (tooLarge) {
      alert('La taille maximale par fichier est de 5 Mo.');
      return;
    }
    if (filesArray.length > 10) {
      alert('Maximum 10 fichiers par upload.');
      return;
    }

    const compress = new Compress();

    const dataUrlToFile = (dataUrl: string, fileName: string, fileType: string) => {
      const arr = dataUrl.split(',');
      const mimeMatch = arr[0]?.match(/:(.*?);/);
      const mime = mimeMatch?.[1] || fileType;
      const bstr = atob(arr[1] || '');
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], fileName, { type: mime });
    };

    try {
      setIsUploading(true);
      const compressed = await compress.compress(filesArray, {
        size: 4,
        quality: 0.8,
        maxWidth: 2000,
        maxHeight: 2000,
        resize: true,
      });

      const compressedFiles = compressed.map((item) => {
        const ext = item.ext || 'jpeg';
        const name = item.alt ? `${item.alt}.${ext}` : `photo.${ext}`;
        const mimeType = `image/${ext}`;
        return dataUrlToFile(item.data, name, mimeType);
      });

      const tooLargeAfter = compressedFiles.find((file) => file.size > 5 * 1024 * 1024);
      if (tooLargeAfter) {
        alert('Un fichier compressé dépasse 5 Mo. Veuillez réduire la taille des images.');
        return;
      }

      const response = await technicalService.uploadRapportPhotos(rapportId, compressedFiles);
      const newUrls = response.data?.photos || [];
      const newPhotos = newUrls.map((url: string) => ({
        url,
        name: url.split('/').pop() || 'photo',
      }));
      setUploadedPhotos((prev) => [...prev, ...newPhotos]);
      queryClient.invalidateQueries({ queryKey: ['rapport', rapportId] });
    } catch (error) {
      console.error('Erreur upload photos:', error);
      alert("Erreur lors de l'upload des photos");
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    const photo = uploadedPhotos[index];
    if (!photo || !rapportId) {
      setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    technicalService.deleteRapportPhoto(rapportId, photo.url)
      .then(() => {
        setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
        queryClient.invalidateQueries({ queryKey: ['rapport', rapportId] });
      })
      .catch((error) => {
        console.error('Erreur suppression photo:', error);
        alert("Erreur lors de la suppression de la photo");
      });
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
          Une erreur est survenue lors de la creation du rapport
        </Alert>
      )}

      {false && (
        <Alert className="mb-4 bg-red-50 border-red-200 text-red-800">
          Erreur lors de l'upload de la photo
        </Alert>
      )}

      {createMutation.isSuccess && !rapportId && (
        <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
          Rapport cree avec succes
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
            <option value="">Selectionner une intervention</option>
            {interventionsData.map((intervention: any) => {
              const missionLabel = intervention.mission?.numeroMission || intervention.mission?.titre || '-';
              const technicienNom =
                intervention.techniciens?.[0]?.technicien
                  ? `${intervention.techniciens[0].technicien.prenom || ''} ${intervention.techniciens[0].technicien.nom || ''}`.trim()
                  : '';
              const dateLabel = intervention.dateDebut
                ? new Date(intervention.dateDebut).toLocaleDateString('fr-FR')
                : '-';
              return (
                <option key={intervention.id} value={intervention.id}>
                  {missionLabel}
                  {technicienNom ? ` - ${technicienNom}` : ''}
                  {dateLabel ? ` - ${dateLabel}` : ''}
                </option>
              );
            })}
          </select>
          {errors.interventionId && (
            <p className="mt-1 text-sm text-red-600">{errors.interventionId.message}</p>
          )}
        </div>

        {/* Rédacteur */}
        <div>
          <Label htmlFor="redacteurId">
            Rédacteur <span className="text-gray-500">(optionnel si technicien assigné)</span>
          </Label>
          <select
            id="redacteurId"
            {...register('redacteurId')}
            disabled={!!rapportId}
            className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 text-sm mt-1 disabled:opacity-50"
          >
            <option value="">Sélectionner un technicien</option>
            {techniciensData.map((tech: any) => (
              <option key={tech.id} value={tech.id}>
                {tech.prenom} {tech.nom} {tech.matricule ? `- ${tech.matricule}` : ''}
              </option>
            ))}
          </select>
          {errors.redacteurId && (
            <p className="mt-1 text-sm text-red-600">{errors.redacteurId.message}</p>
          )}
        </div>

        {/* Travaux effectues */}
        <div>
          <Label htmlFor="workDone">
            Travaux effectues <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="workDone"
            rows={6}
            {...register('workDone')}
            disabled={!!rapportId}
            placeholder="Decrivez en detail les travaux realises..."
            className="mt-1"
          />
          {errors.workDone && (
            <p className="mt-1 text-sm text-red-600">{errors.workDone.message}</p>
          )}
        </div>

        {/* Problemes rencontres */}
        <div>
          <Label htmlFor="issuesFound">Problemes rencontres</Label>
          <Textarea
            id="issuesFound"
            rows={4}
            {...register('issuesFound')}
            disabled={!!rapportId}
            placeholder="Listez les problemes ou anomalies constates..."
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
                Formats acceptes: JPG, PNG, GIF. Taille max: 5MB par fichier.
              </p>
            </div>

            {/* Liste des photos uploadees */}
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
                      x
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
                {createMutation.isPending ? 'Creation...' : 'Creer le rapport'}
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
            Rapport cree avec succes. Vous pouvez maintenant ajouter des photos.
          </p>
        </div>
      )}
    </Card>
  );
}

