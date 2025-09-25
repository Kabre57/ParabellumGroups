import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, Clock, FileText, Users, Plus, Trash2, Package, AlertTriangle, CheckCircle } from 'lucide-react';
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

  const { data: missions } = useQuery({
    queryKey: ['missions'],
    queryFn: () => missionService.getAll({ limit: 100 })
  });

  const { data: techniciens } = useQuery({
    queryKey: ['techniciens'],
    queryFn: () => technicienService.getAll({ limit: 100, isActive: true })
  });

  const { data: materiels } = useQuery({
    queryKey: ['materiels'],
    queryFn: () => materielService.getAll({ limit: 100, statut: 'actif' })
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
    setValue
  } = useForm<CreateInterventionFormData>({
    resolver: zodResolver(createInterventionSchema),
    defaultValues: {
      missionId,
      dateHeureDebut: new Date().toISOString().slice(0, 16),
      techniciens: [{ technicienId: 0, role: 'Principal', commentaire: '' }],
      materiels: []
    }
  });

  const { fields: technicienFields, append: appendTechnicien, remove: removeTechnicien } = useFieldArray({
    control,
    name: 'techniciens'
  });

  const { fields: materielFields, append: appendMateriel, remove: removeMateriel } = useFieldArray({
    control,
    name: 'materiels'
  });

  const watchedMateriels = watch('materiels');
  const dateHeureDebut = watch('dateHeureDebut');
  const dateHeureFin = watch('dateHeureFin');

  const createInterventionMutation = useMutation({
    mutationFn: (data: CreateInterventionFormData) => interventionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      queryClient.invalidateQueries({ queryKey: ['materiels'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateInterventionFormData) => {
    setIsLoading(true);
    try {
      await createInterventionMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDuration = () => {
    if (dateHeureDebut && dateHeureFin) {
      const debut = new Date(dateHeureDebut);
      const fin = new Date(dateHeureFin);
      const diffMs = fin.getTime() - debut.getTime();
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      
      if (diffMinutes > 0) {
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        return `${hours}h${minutes.toString().padStart(2, '0')}`;
      }
    }
    return null;
  };

  const getAvailableStock = (materielId: number) => {
    const materiel = materielsList.find((m: any) => m.id === materielId);
    return materiel?.quantiteDisponible || 0;
  };

  const isStockSufficient = (materielId: number, quantite: number) => {
    return getAvailableStock(materielId) >= quantite;
  };

  const verifyStock = () => {
    const hasInsufficientStock = watchedMateriels?.some((materiel: any) => 
      materiel.materielId && !isStockSufficient(materiel.materielId, materiel.quantite || 0)
    );
    setStockVerified(!hasInsufficientStock);
  };

  if (!isOpen) return null;

  const missionsList = missions?.data?.missions || [];
  const techniciensList = techniciens?.data?.techniciens || [];
  const materielsList = materiels?.data?.materiels || [];

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-medium text-white flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Nouvelle Intervention
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
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
                  {mission.numIntervention} - {mission.objectifDuContrat} ({mission.client?.name})
                </option>
              ))}
            </select>
            {errors.missionId && <p className="mt-1 text-sm text-red-400">{errors.missionId.message}</p>}
          </div>

          {/* Date et Heure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date et Heure de Début *</label>
              <input
                {...register('dateHeureDebut')}
                type="datetime-local"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.dateHeureDebut && <p className="mt-1 text-sm text-red-400">{errors.dateHeureDebut.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date et Heure de Fin</label>
              <input
                {...register('dateHeureFin')}
                type="datetime-local"
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

          {/* Techniciens assignés */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-300">Techniciens assignés</label>
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
                    <span className="text-sm font-medium text-gray-300">Technicien</span>
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
                      <label className="block text-xs text-gray-400 mb-1">Technicien</label>
                      <select
                        {...register(`techniciens.${index}.technicienId` as const, { valueAsNumber: true })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      >
                        <option value="">Sélectionner</option>
                        {techniciensList.map((technicien: any) => (
                          <option key={technicien.id} value={technicien.id}>
                            {technicien.prenom} {technicien.nom} - {technicien.specialite?.libelle}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Rôle</label>
                      <select
                        {...register(`techniciens.${index}.role` as const)}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
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
                const selectedMaterielId = watchedMateriels?.[index]?.materielId;
                const selectedQuantite = watchedMateriels?.[index]?.quantite || 0;
                const stockDisponible = getAvailableStock(selectedMaterielId);
                const stockSuffisant = isStockSufficient(selectedMaterielId, selectedQuantite);

                return (
                  <div key={field.id} className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Matériel</label>
                        <select
                          {...register(`materiels.${index}.materielId` as const, { valueAsNumber: true })}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                        >
                          <option value="">Sélectionner</option>
                          {materielsList.map((materiel: any) => (
                            <option key={materiel.id} value={materiel.id}>
                              {materiel.designation} ({materiel.reference}) - Stock: {materiel.quantiteDisponible}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Quantité</label>
                        <input
                          {...register(`materiels.${index}.quantite` as const, { valueAsNumber: true })}
                          type="number"
                          min="1"
                          className={`w-full px-3 py-2 border rounded text-white text-sm ${
                            selectedMaterielId && !stockSuffisant 
                              ? 'bg-red-900 border-red-500' 
                              : 'bg-gray-600 border-gray-500'
                          }`}
                          defaultValue={1}
                        />
                        {selectedMaterielId && (
                          <div className={`text-xs mt-1 ${stockSuffisant ? 'text-green-400' : 'text-red-400'}`}>
                            {stockSuffisant ? (
                              `✓ Stock disponible: ${stockDisponible}`
                            ) : (
                              <div className="flex items-center">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Stock insuffisant: {stockDisponible}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Commentaire</label>
                        <input
                          {...register(`materiels.${index}.commentaire` as const)}
                          type="text"
                          placeholder="Optionnel"
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeMateriel(index)}
                          className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 flex items-center"
                        >
                          <Trash2 className="h-4 w-4" />
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
            <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${stockVerified ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  <span className="text-sm text-gray-300">Vérification de Disponibilité</span>
                </div>
                <button
                  type="button"
                  onClick={verifyStock}
                  className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700"
                >
                  Vérification...
                </button>
              </div>
            </div>
          )}

          {/* Commentaire général */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Commentaire</label>
            <textarea
              {...register('commentaire')}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
              placeholder="Instructions, objectifs spécifiques, contraintes..."
            />
          </div>

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading || (materielFields.length > 0 && !stockVerified)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};