// src/components/Modals/Create/CreateInterventionModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, Clock, Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const interventionService = createCrudService('interventions');
const missionService = createCrudService('missions');
const technicienService = createCrudService('techniciens');
const materielService = createCrudService('materiels');

const technicienSchema = z.object({
  technicienId: z.number().min(1, 'Technicien requis'),
  role: z.enum(['Principal', 'Assistant']).default('Principal'),
  commentaire: z.string().optional()
});

const materielSchema = z.object({
  materielId: z.number().min(1, 'Matériel requis'),
  quantite: z.number().min(1, 'Quantité invalide'),
  commentaire: z.string().optional()
});

// ⛔️ Ne pas mettre de "statut" ici (géré côté backend)
const createInterventionSchema = z.object({
  missionId: z.string().min(1, 'Mission requise'),
  dateHeureDebut: z.string().min(1, 'Date de début requise'),
  dateHeureFin: z.string().optional(),
  techniciens: z.array(technicienSchema).min(1, 'Au moins un technicien requis'),
  materiels: z.array(materielSchema).optional(),
  commentaire: z.string().optional()
});

type CreateInterventionFormData = z.infer<typeof createInterventionSchema>;

interface CreateInterventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionId?: string;
}

export const CreateInterventionModal: React.FC<CreateInterventionModalProps> = ({
  isOpen,
  onClose,
  missionId
}) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [stockVerified, setStockVerified] = useState(false);

  // ====== DATA FETCH ======
  const { data: missions, error: missionsError } = useQuery({
    queryKey: ['missions'],
    queryFn: () => missionService.getAll({ limit: 100 }),
    enabled: isOpen
  });

  const { data: techniciens, error: techniciensError } = useQuery({
    queryKey: ['techniciens'],
    queryFn: () => technicienService.getAll({ limit: 100, isActive: true }),
    enabled: isOpen
  });

  const { data: materiels, error: materielsError } = useQuery({
    queryKey: ['materiels'],
    queryFn: () => materielService.getAll({ limit: 100, statut: 'actif' }),
    enabled: isOpen
  });

  // ====== FORM ======
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
    setValue,
    trigger
  } = useForm<CreateInterventionFormData>({
    resolver: zodResolver(createInterventionSchema),
    defaultValues: {
      missionId: missionId || '',
      // datetime-local attend un format local; on met un placeholder correct
      dateHeureDebut: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
      techniciens: [{ technicienId: 0, role: 'Principal', commentaire: '' }],
      materiels: []
    }
  });

  const {
    fields: technicienFields,
    append: appendTechnicien,
    remove: removeTechnicien
  } = useFieldArray({ control, name: 'techniciens' });

  const {
    fields: materielFields,
    append: appendMateriel,
    remove: removeMateriel
  } = useFieldArray({ control, name: 'materiels' });

  // Watched values (toujours avec garde-fous)
  const watchedMateriels = watch('materiels') ?? [];
  const dateHeureDebut = watch('dateHeureDebut') ?? '';
  const dateHeureFin = watch('dateHeureFin') ?? '';

  // ====== MEMO LISTS (évite les remount violents) ======
  const missionsList = useMemo(
    () => missions?.data?.missions || missions?.data?.items || [],
    [missions]
  );
  const techniciensList = useMemo(
    () => techniciens?.data?.techniciens || techniciens?.data?.items || [],
    [techniciens]
  );
  const materielsList = useMemo(
    () => materiels?.data?.materiels || materiels?.data?.items || [],
    [materiels]
  );

  // ====== HELPERS STOCK ======
  const getAvailableStock = (materielId?: number) => {
    if (!materielId || materielId <= 0) return 0;
    const item = materielsList.find((m: any) => m.id === materielId);
    // tolère libellés différents: designation/libelle + quantiteDisponible/stock
    return (
      item?.quantiteDisponible ??
      item?.stockDisponible ??
      item?.stock ??
      0
    );
  };

  const isStockSufficient = (materielId?: number, quantite?: number) => {
    if (!materielId || !quantite) return true;
    return getAvailableStock(materielId) >= quantite;
  };

  // ====== MUTATION ======
  const createInterventionMutation = useMutation({
    mutationFn: (data: CreateInterventionFormData) => {
      const cleanData: any = { ...data };
      // n’envoie jamais "statut"
      delete cleanData.statut;
      return interventionService.create(cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      queryClient.invalidateQueries({ queryKey: ['materiels'] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      reset();
      setStockVerified(false);
      onClose();
    },
    onError: (error: any) => {
      console.error('Erreur création intervention:', error);
      alert(`Erreur: ${error?.response?.data?.message || error?.message || 'Inconnue'}`);
    }
  });

  // ====== SUBMIT ======
  const onSubmit = async (data: CreateInterventionFormData) => {
    setIsLoading(true);
    try {
      const ok = await trigger();
      if (!ok) return;

      // Exige une vérification de stock si au moins 1 matériel saisi
      if (materielFields.length > 0 && !stockVerified) {
        alert("Veuillez vérifier la disponibilité du stock avant de créer l'intervention");
        return;
      }

      await createInterventionMutation.mutateAsync(data);
    } catch (e) {
      console.error('Erreur lors de la création:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // ====== STOCK CHECK ======
  const verifyStock = async () => {
    const ok = await trigger('materiels');
    if (!ok) {
      alert('Veuillez corriger les erreurs dans les matériels avant de vérifier le stock');
      return;
    }

    const hasInsufficient = (watchedMateriels as any[]).some((row) => {
      const id = Number(row?.materielId || 0);
      const q = Number(row?.quantite || 0);
      return id > 0 && q > 0 ? !isStockSufficient(id, q) : false;
    });

    setStockVerified(!hasInsufficient);

    if (!hasInsufficient) alert('✅ Tous les matériels sont disponibles en stock suffisant');
    else alert('❌ Certains matériels ne sont pas disponibles en quantité suffisante');
  };

  // ====== RESET à l’ouverture ======
  useEffect(() => {
    if (isOpen) {
      reset({
        missionId: missionId || '',
        dateHeureDebut: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16),
        techniciens: [{ technicienId: 0, role: 'Principal', commentaire: '' }],
        materiels: []
      });
      setStockVerified(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, missionId]);

  if (!isOpen) return null;

  if (missionsError || techniciensError || materielsError) {
    console.error('Erreurs chargement:', { missionsError, techniciensError, materielsError });
  }

  // ====== DURÉE ======
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

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-medium text-white flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Nouvelle Intervention
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300" type="button">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Mission */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Mission *</label>
            <select
              {...register('missionId')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
              disabled={!!missionId}
            >
              <option value="">Sélectionner une mission</option>
              {missionsList.map((mission: any) => (
                <option key={mission.numIntervention} value={mission.numIntervention}>
                  {mission.numIntervention} - {mission.objectifDuContrat}{' '}
                  ({mission.client?.name || 'Client inconnu'})
                </option>
              ))}
            </select>
            {errors.missionId && <p className="mt-1 text-sm text-red-400">{errors.missionId.message}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Date et Heure de Début *
              </label>
              <input
                {...register('dateHeureDebut')}
                type="datetime-local"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.dateHeureDebut && (
                <p className="mt-1 text-sm text-red-400">{errors.dateHeureDebut.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date et Heure de Fin</label>
              <input
                {...register('dateHeureFin')}
                type="datetime-local"
                min={dateHeureDebut || undefined}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Durée calculée */}
          {calculateDuration() && (
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-400 mr-2" />
                <span className="text-sm font-medium text-blue-300">
                  Durée calculée: {calculateDuration()}
                </span>
              </div>
            </div>
          )}

          {/* Techniciens */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-300">Techniciens assignés *</label>
              <button
                type="button"
                onClick={() => appendTechnicien({ technicienId: 0, role: 'Assistant', commentaire: '' })}
                className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter Technicien
              </button>
            </div>

            <div className="space-y-3">
              {technicienFields.map((field, index) => (
                <div key={field.id} className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-300">Technicien {index + 1}</span>
                    {technicienFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTechnicien(index)}
                        className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Technicien *</label>
                      <select
                        {...register(`techniciens.${index}.technicienId` as const, {
                          valueAsNumber: true,
                          validate: (value) => value > 0 || 'Technicien requis'
                        })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:ring-blue-500 focus:border-blue-500"
                        defaultValue={0}
                      >
                        <option value={0}>Sélectionner un technicien</option>
                        {techniciensList.map((technicien: any) => (
                          <option key={technicien.id} value={technicien.id}>
                            {technicien.prenom} {technicien.nom} - {technicien.specialite?.libelle || 'Non spécifié'}
                          </option>
                        ))}
                      </select>
                      {errors.techniciens?.[index]?.technicienId && (
                        <p className="mt-1 text-xs text-red-400">
                          {errors.techniciens[index]?.technicienId?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Rôle</label>
                      <select
                        {...register(`techniciens.${index}.role` as const)}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                        defaultValue="Principal"
                      >
                        <option value="Principal">Principal</option>
                        <option value="Assistant">Assistant</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Commentaire</label>
                      <input
                        {...register(`techniciens.${index}.commentaire` as const)}
                        type="text"
                        placeholder="Responsabilités..."
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {errors.techniciens && !errors.techniciens.root && (
              <p className="mt-1 text-sm text-red-400">{(errors as any).techniciens?.message}</p>
            )}
          </div>

          {/* Matériel requis */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-300">Matériel requis</label>
              <button
                type="button"
                onClick={() => appendMateriel({ materielId: 0, quantite: 1, commentaire: '' })}
                className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter du matériel
              </button>
            </div>

            <div className="space-y-3">
              {materielFields.map((field, index) => {
                const row = watchedMateriels[index] ?? {};
                const selectedMaterielId = Number(row?.materielId || 0);
                const selectedQuantite = Number(row?.quantite || 0);
                const stockDisponible = getAvailableStock(selectedMaterielId);
                const stockSuffisant = isStockSufficient(selectedMaterielId, selectedQuantite);

                return (
                  <div key={field.id} className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {/* Matériel */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Matériel</label>
                        <select
                          {...register(`materiels.${index}.materielId` as const, {
                            valueAsNumber: true,
                            validate: (value) => value > 0 || 'Matériel requis'
                          })}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:ring-blue-500 focus:border-blue-500"
                          defaultValue={0}
                        >
                          <option value={0}>Sélectionner un matériel</option>
                          {materielsList.map((materiel: any) => (
                            <option key={materiel.id} value={materiel.id}>
                              {(materiel.designation ?? materiel.libelle ?? 'Matériel')}
                              {materiel.reference ? ` (${materiel.reference})` : ''}
                              {' — Stock: '}
                              {materiel.quantiteDisponible ?? materiel.stockDisponible ?? materiel.stock ?? 0}
                            </option>
                          ))}
                        </select>
                        {errors.materiels?.[index]?.materielId && (
                          <p className="mt-1 text-xs text-red-400">
                            {errors.materiels[index]?.materielId?.message}
                          </p>
                        )}
                      </div>

                      {/* Quantité */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Quantité *</label>
                        <input
                          {...register(`materiels.${index}.quantite` as const, {
                            valueAsNumber: true,
                            validate: (value) => value > 0 || 'Quantité invalide'
                          })}
                          type="number"
                          min={1}
                          // on ne met pas max=stock pour éviter que React doive “remonter/descendre” l’input
                          className={`w-full px-3 py-2 border rounded text-white text-sm ${
                            selectedMaterielId > 0 && !stockSuffisant
                              ? 'bg-red-900 border-red-500 focus:ring-red-500 focus:border-red-500'
                              : 'bg-gray-600 border-gray-500 focus:ring-blue-500 focus:border-blue-500'
                          }`}
                        />
                        {/* Conteneur TOUJOURS présent → évite add/remove DOM */}
                        <div
                          className={`text-xs mt-1 flex items-center transition-colors ${
                            selectedMaterielId === 0
                              ? 'text-gray-400'
                              : stockSuffisant
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}
                        >
                          {selectedMaterielId === 0 ? (
                            <span>Sélectionnez un matériel pour voir le stock</span>
                          ) : stockSuffisant ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Stock disponible: {stockDisponible}
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Stock insuffisant: {stockDisponible} disponible
                            </>
                          )}
                        </div>

                        {errors.materiels?.[index]?.quantite && (
                          <p className="mt-1 text-xs text-red-400">
                            {errors.materiels[index]?.quantite?.message}
                          </p>
                        )}
                      </div>

                      {/* Commentaire */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Commentaire</label>
                        <input
                          {...register(`materiels.${index}.commentaire` as const)}
                          type="text"
                          placeholder="Optionnel"
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                        />
                      </div>

                      {/* Supprimer */}
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeMateriel(index)}
                          className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 flex items-center w-full justify-center"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vérification de Disponibilité */}
          {materielFields.length > 0 && (
            <div
              className={`border rounded-lg p-4 ${
                stockVerified ? 'bg-green-900 border-green-700' : 'bg-yellow-900 border-yellow-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full mr-2 ${
                      stockVerified ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                  />
                  <span className="text-sm text-gray-300">
                    {stockVerified ? '✅ Stock vérifié et disponible' : '⚠️ Vérification de disponibilité requise'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={verifyStock}
                  className={`px-4 py-2 rounded-md text-sm ${
                    stockVerified ? 'bg-green-700 text-white hover:bg-green-600' : 'bg-yellow-600 text-white hover:bg-yellow-500'
                  }`}
                >
                  {stockVerified ? 'Re-vérifier le stock' : 'Vérifier le stock'}
                </button>
              </div>
            </div>
          )}

          {/* Commentaire */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Commentaire</label>
            <textarea
              {...register('commentaire')}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
              placeholder="Instructions, objectifs spécifiques, contraintes..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading || (materielFields.length > 0 && !stockVerified)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Création...
                </>
              ) : (
                "Créer l'intervention"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
