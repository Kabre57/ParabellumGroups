'use client';

import React, { useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import { useTechniciens } from '@/hooks/useTechnical';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { technicalService } from '@/shared/api/technical';

interface AddTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  interventionId: string;
  existingTechnicienIds: string[];
  onSuccess?: () => void;
}

export const AddTechnicianModal: React.FC<AddTechnicianModalProps> = ({
  isOpen,
  onClose,
  interventionId,
  existingTechnicienIds,
  onSuccess
}) => {
  const [selectedTechnicienId, setSelectedTechnicienId] = useState('');
  const [role, setRole] = useState<'Principal' | 'Assistant'>('Assistant');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: techniciens = [] } = useTechniciens({ pageSize: 100 });

  // Filtrer les techniciens déjà assignés
  const availableTechniciens = techniciens.filter(
    (tech: any) => !existingTechnicienIds.includes(tech.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTechnicienId) {
      toast.error('Veuillez sélectionner un technicien');
      return;
    }

    if (existingTechnicienIds.includes(selectedTechnicienId)) {
      toast.error('Ce technicien est déjà assigné à cette intervention');
      return;
    }

    setIsSubmitting(true);

    try {
      await technicalService.assignTechnicien(interventionId, selectedTechnicienId, role);

      toast.success('Technicien ajouté avec succès');
      setSelectedTechnicienId('');
      setRole('Assistant');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Erreur ajout technicien:', error);
      toast.error(error?.response?.data?.error || error?.message || 'Erreur lors de l\'ajout du technicien');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <UserPlus className="h-5 w-5 mr-2 text-blue-600" />
            Ajouter un Technicien
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {availableTechniciens.length === 0 ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-300">
                  Tous les techniciens disponibles sont déjà assignés à cette intervention.
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Technicien *
                </label>
                <select
                  value={selectedTechnicienId}
                  onChange={(e) => setSelectedTechnicienId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Sélectionner un technicien</option>
                  {availableTechniciens.map((technicien: any) => (
                    <option key={technicien.id} value={technicien.id}>
                      {technicien.prenom} {technicien.nom}
                      {technicien.specialite?.nom && ` - ${technicien.specialite.nom}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rôle
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'Principal' | 'Assistant')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Principal">Principal</option>
                  <option value="Assistant">Assistant</option>
                </select>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            {availableTechniciens.length > 0 && (
              <Button
                type="submit"
                disabled={isSubmitting || !selectedTechnicienId}
                className="px-4 py-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Ajout en cours...
                  </>
                ) : (
                  'Ajouter le technicien'
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
