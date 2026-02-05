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
  interventionId: string;
  onSuccess?: () => void;
}

export default function MaterielSortie({ interventionId, onSuccess }: MaterielSortieProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    materielId: '',
    quantity: 1,
    technicienId: '',
    notes: '',
  });

  const { data: materielData = [], isLoading } = useQuery({
    queryKey: ['materiel'],
    queryFn: async () => {
      return await technicalService.getMateriel({ pageSize: 100 });
    },
  });

  const sortirMutation = useMutation({
    mutationFn: (data: SortirMaterielRequest) => technicalService.sortirMateriel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiel'] });
      queryClient.invalidateQueries({ queryKey: ['intervention', interventionId] });
      setFormData({
        materielId: '',
        quantity: 1,
        technicienId: '',
        notes: '',
      });
      if (onSuccess) onSuccess();
    },
  });

  const selectedMateriel = materielData.find(
    (m: Materiel) => m.id === formData.materielId
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.materielId) {
      return;
    }

    const payload: SortirMaterielRequest = {
      materielId: formData.materielId,
      interventionId,
      quantite: formData.quantity,
      technicienId: formData.technicienId || undefined,
      notes: formData.notes || undefined,
    };

    sortirMutation.mutate(payload);
  };

  const isQuantityValid =
    selectedMateriel &&
    formData.quantity > 0 &&
    formData.quantity <= (selectedMateriel.availableQuantity ?? selectedMateriel.quantiteDisponible ?? 0);

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
        Sortie de materiel
      </h2>

      {sortirMutation.isError && (
        <Alert className="mb-4 bg-red-50 border-red-200 text-red-800">
          Une erreur est survenue lors de la sortie du materiel
        </Alert>
      )}

      {sortirMutation.isSuccess && (
        <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
          Materiel sorti avec succes. Le stock a ete mis a jour automatiquement.
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selection du materiel */}
        <div>
          <Label htmlFor="materielId">
            Materiel <span className="text-red-500">*</span>
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
            <option value="">Selectionner un materiel</option>
            {materielData.map((materiel: Materiel) => (
              <option
                key={materiel.id}
                value={materiel.id}
                disabled={(materiel.availableQuantity ?? 0) === 0}
              >
                {materiel.name || materiel.nom} - {materiel.reference} (
                {materiel.availableQuantity ?? materiel.quantiteDisponible ?? 0} {materiel.unit || 'u'} disponible
                {(materiel.availableQuantity ?? 0) > 1 ? 's' : ''})
              </option>
            ))}
          </select>
        </div>

        {/* Informations sur le materiel selectionne */}
        {selectedMateriel && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Categorie</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedMateriel.category || selectedMateriel.categorie}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Stock total</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedMateriel.quantity ?? selectedMateriel.quantiteTotale ?? 0} {selectedMateriel.unit || 'u'}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Disponible</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedMateriel.availableQuantity ?? selectedMateriel.quantiteDisponible ?? 0} {selectedMateriel.unit || 'u'}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Statut</p>
                <Badge variant="success">{selectedMateriel.status || selectedMateriel.statut}</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Quantite */}
        <div>
          <Label htmlFor="quantity">
            Quantite <span className="text-red-500">*</span>
          </Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            max={selectedMateriel?.availableQuantity || 999}
            value={formData.quantity}
            onChange={(e) =>
              setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })
            }
            required
            disabled={!formData.materielId}
          />
          {selectedMateriel && !isQuantityValid && formData.quantity > 0 && (
            <p className="mt-1 text-sm text-red-600">
              Quantite non disponible (max: {selectedMateriel.availableQuantity ?? 0})
            </p>
          )}
        </div>

        {/* Technicien */}
        <div>
          <Label htmlFor="technicienId">Technicien (optionnel)</Label>
          <Input
            id="technicienId"
            type="text"
            placeholder="ID du technicien"
            value={formData.technicienId}
            onChange={(e) => setFormData({ ...formData, technicienId: e.target.value })}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Identifiant du technicien qui recupere le materiel
          </p>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes (optionnel)</Label>
          <Textarea
            id="notes"
            rows={3}
            placeholder="Informations complementaires sur la sortie..."
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
                technicienId: '',
                notes: '',
              })
            }
          >
            Reinitialiser
          </Button>
        </div>
      </form>

      {/* Info mise a jour automatique */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Le stock disponible sera automatiquement mis a jour lors de la validation
          de la sortie.
        </p>
      </div>
    </Card>
  );
}
