'use client';

import React, { useState } from 'react';
import { X, Package, AlertCircle, FileText } from 'lucide-react';
import { useMateriel } from '@/hooks/useTechnical';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { technicalService } from '@/shared/api/technical';

interface AddMaterielModalProps {
  isOpen: boolean;
  onClose: () => void;
  interventionId: string;
  existingMateriels: Array<{
    materiel: { id: string; nom: string; reference?: string };
    quantite: number;
    notes?: string;
    technicien?: { prenom: string; nom: string };
  }>;
  technicienId: string;
  onSuccess?: () => void;
}

export const AddMaterielModal: React.FC<AddMaterielModalProps> = ({
  isOpen,
  onClose,
  interventionId,
  existingMateriels,
  technicienId,
  onSuccess
}) => {
  const [selectedMaterielId, setSelectedMaterielId] = useState('');
  const [quantite, setQuantite] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: materiels = [] } = useMateriel({ pageSize: 100 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMaterielId) {
      toast.error('Veuillez sélectionner un matériel');
      return;
    }

    if (quantite < 1) {
      toast.error('La quantité doit être supérieure à 0');
      return;
    }

    if (!technicienId) {
      toast.error('Aucun technicien assigné à cette intervention');
      return;
    }

    // Vérifier le stock disponible
    const materiel = materiels.find((m: any) => m.id === selectedMaterielId);
    if (!materiel) {
      toast.error('Matériel non trouvé');
      return;
    }

    const stockDisponible = materiel.quantiteDisponible ?? materiel.quantiteStock ?? 0;
    if (stockDisponible < quantite) {
      toast.error(`Stock insuffisant. Disponible : ${stockDisponible}`);
      return;
    }

    setIsSubmitting(true);

    try {
      await technicalService.addMaterielToIntervention(interventionId, {
        materielId: selectedMaterielId,
        quantite,
        notes: notes || undefined,
        technicienId
      });

      toast.success('Matériel ajouté avec succès');
      setSelectedMaterielId('');
      setQuantite(1);
      setNotes('');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Erreur ajout matériel:', error);
      toast.error(error?.response?.data?.error || error?.message || 'Erreur lors de l\'ajout du matériel');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full my-8">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Package className="h-5 w-5 mr-2 text-green-600" />
            Ajouter du Matériel
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Rapport du matériel déjà sorti */}
          {existingMateriels.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start mb-3">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                    Matériel déjà sorti pour cette intervention
                  </h4>
                  <div className="space-y-2">
                    {existingMateriels.map((item, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded p-3 border border-blue-100 dark:border-blue-800"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.materiel.nom}
                              {item.materiel.reference && (
                                <span className="text-gray-500 dark:text-gray-400 ml-2">
                                  ({item.materiel.reference})
                                </span>
                              )}
                            </p>
                            {item.technicien && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Retiré par : {item.technicien.prenom} {item.technicien.nom}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Note : {item.notes}
                              </p>
                            )}
                          </div>
                          <div className="ml-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                              Qté : {item.quantite}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Formulaire d'ajout */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Matériel *
              </label>
              <select
                value={selectedMaterielId}
                onChange={(e) => setSelectedMaterielId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Sélectionner un matériel</option>
                {materiels.map((materiel: any) => {
                  const stock = materiel.quantiteDisponible ?? materiel.quantiteStock ?? 0;
                  return (
                    <option key={materiel.id} value={materiel.id} disabled={stock < 1}>
                      {materiel.nom} - Stock : {stock}
                      {materiel.reference && ` (${materiel.reference})`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantité *
              </label>
              <input
                type="number"
                min="1"
                value={quantite}
                onChange={(e) => setQuantite(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              {selectedMaterielId && (() => {
                const materiel = materiels.find((m: any) => m.id === selectedMaterielId);
                const stock = materiel?.quantiteDisponible ?? materiel?.quantiteStock ?? 0;
                return stock < quantite ? (
                  <div className="mt-2 flex items-start bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 dark:text-red-300">
                      Stock insuffisant. Disponible : {stock}
                    </p>
                  </div>
                ) : null;
              })()}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="État du matériel, conditions d'utilisation..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                disabled={isSubmitting}
              >
                Annuler
              </button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedMaterielId || quantite < 1}
                className="px-4 py-2 bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Ajout en cours...
                  </>
                ) : (
                  'Ajouter le matériel'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
