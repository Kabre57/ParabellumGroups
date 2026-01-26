'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { technicalService, Materiel, SortirMaterielRequest } from '@/shared/api/services/technical';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';

interface MaterielSortieProps {
  missionNum: string;
  onSuccess?: () => void;
}

export default function MaterielSortie({ missionNum, onSuccess }: MaterielSortieProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    materielId: '',
    quantity: 1,
    technicianId: '',
    notes: '',
  });

  const { data: materielData, isLoading } = useQuery({
    queryKey: ['materiel'],
    queryFn: async () => {
      return await technicalService.getMateriel({ pageSize: 100 });
    },
  });

  const sortirMutation = useMutation({
    mutationFn: (data: SortirMaterielRequest) => technicalService.sortirMateriel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiel'] });
      queryClient.invalidateQueries({ queryKey: ['mission', missionNum] });
      setFormData({
        materielId: '',
        quantity: 1,
        technicianId: '',
        notes: '',
      });
      if (onSuccess) onSuccess();
    },
  });

  const selectedMateriel = materielData?.data.find(
    (m: Materiel) => m.id === formData.materielId
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.materielId) {
      return;
    }

    const payload: SortirMaterielRequest = {
      materielId: formData.materielId,
      missionNum,
      quantity: formData.quantity,
      technicianId: formData.technicianId || undefined,
      notes: formData.notes || undefined,
    };

    sortirMutation.mutate(payload);
  };

  const isQuantityValid =
    selectedMateriel &&
    formData.quantity > 0 &&
    formData.quantity <= selectedMateriel.availableQuantity;

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Spinner className="w-8 h-8" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Sortie de matériel
      </h2>

      {sortirMutation.isError && (
        <Alert className="mb-4 bg-red-50 border-red-200 text-red-800">
          Une erreur est survenue lors de la sortie du matériel
        </Alert>
      )}

      {sortirMutation.isSuccess && (
        <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
          Matériel sorti avec succès. Le stock a été mis à jour automatiquement.
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sélection du matériel */}
        <div>
          <Label htmlFor="materielId">
            Matériel <span className="text-red-500">*</span>
          </Label>
          <select
            id="materielId"
            value={formData.materielId}
            onChange={(e) =>
              setFormData({ ...formData, materielId: e.target.value, quantity: 1 })
            }
            className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 text-sm"
            required
          >
            <option value="">Sélectionner un matériel</option>
            {materielData?.data?.map((materiel: Materiel) => (
              <option
                key={materiel.id}
                value={materiel.id}
                disabled={materiel.availableQuantity === 0}
              >
                {materiel.name} - {materiel.reference} (
                {materiel.availableQuantity} {materiel.unit} disponible
                {materiel.availableQuantity > 1 ? 's' : ''})
              </option>
            ))}
          </select>
        </div>

        {/* Informations sur le matériel sélectionné */}
        {selectedMateriel && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Catégorie</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedMateriel.category}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Stock total</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedMateriel.quantity} {selectedMateriel.unit}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Disponible</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedMateriel.availableQuantity} {selectedMateriel.unit}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Statut</p>
                <Badge variant="success">{selectedMateriel.status}</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Quantité */}
        <div>
          <Label htmlFor="quantity">
            Quantité <span className="text-red-500">*</span>
          </Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            max={selectedMateriel?.availableQuantity || 999}
            value={formData.quantity}
            onChange={(e) =>
              setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
            }
            required
            disabled={!formData.materielId}
          />
          {selectedMateriel && !isQuantityValid && formData.quantity > 0 && (
            <p className="mt-1 text-sm text-red-600">
              Quantité non disponible (max: {selectedMateriel.availableQuantity})
            </p>
          )}
        </div>

        {/* Technicien */}
        <div>
          <Label htmlFor="technicianId">Technicien (optionnel)</Label>
          <Input
            id="technicianId"
            type="text"
            placeholder="ID du technicien"
            value={formData.technicianId}
            onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Identifiant du technicien qui récupère le matériel
          </p>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes (optionnel)</Label>
          <Textarea
            id="notes"
            rows={3}
            placeholder="Informations complémentaires sur la sortie..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            disabled={
              !formData.materielId ||
              !isQuantityValid ||
              sortirMutation.isPending
            }
            className="flex-1"
          >
            {sortirMutation.isPending ? 'Sortie en cours...' : 'Valider la sortie'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFormData({
                materielId: '',
                quantity: 1,
                technicianId: '',
                notes: '',
              })
            }
          >
            Réinitialiser
          </Button>
        </div>
      </form>

      {/* Info mise à jour automatique */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Le stock disponible sera automatiquement mis à jour lors de la validation
          de la sortie.
        </p>
      </div>
    </Card>
  );
}
