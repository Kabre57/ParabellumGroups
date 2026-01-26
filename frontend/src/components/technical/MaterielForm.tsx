'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Materiel } from '@/shared/api/services/technical';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface MaterielFormProps {
  materiel?: Materiel;
  onSubmit: (data: Partial<Materiel>) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function MaterielForm({ materiel, onSubmit, onClose, isLoading }: MaterielFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<Partial<Materiel>>({
    defaultValues: materiel || {
      reference: '',
      nom: '',
      description: '',
      categorie: '',
      quantiteStock: 1,
      seuilAlerte: 10,
      seuilRupture: 5,
      prixUnitaire: 0,
      fournisseur: '',
      emplacementStock: '',
      notes: '',
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold">
            {materiel ? 'Modifier le matériel' : 'Nouveau matériel'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Référence */}
            <div>
              <Label htmlFor="reference">Référence *</Label>
              <Input
                id="reference"
                {...register('reference', { required: 'La référence est obligatoire' })}
                placeholder="MAT-001"
              />
              {errors.reference && (
                <p className="text-sm text-red-600 mt-1">{errors.reference.message}</p>
              )}
            </div>

            {/* Nom */}
            <div>
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                {...register('nom', { required: 'Le nom est obligatoire' })}
                placeholder="Perceuse sans fil"
              />
              {errors.nom && (
                <p className="text-sm text-red-600 mt-1">{errors.nom.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                {...register('description')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
                placeholder="Description détaillée du matériel..."
              />
            </div>

            {/* Catégorie */}
            <div>
              <Label htmlFor="categorie">Catégorie *</Label>
              <Input
                id="categorie"
                {...register('categorie', { required: 'La catégorie est obligatoire' })}
                placeholder="Outillage électrique"
              />
              {errors.categorie && (
                <p className="text-sm text-red-600 mt-1">{errors.categorie.message}</p>
              )}
            </div>

            {/* Fournisseur */}
            <div>
              <Label htmlFor="fournisseur">Fournisseur</Label>
              <Input
                id="fournisseur"
                {...register('fournisseur')}
                placeholder="Nom du fournisseur"
              />
            </div>

            {/* Quantité en stock */}
            <div>
              <Label htmlFor="quantiteStock">Quantité en stock *</Label>
              <Input
                id="quantiteStock"
                type="number"
                {...register('quantiteStock', { 
                  required: 'La quantité est obligatoire',
                  min: { value: 0, message: 'La quantité doit être positive' },
                  valueAsNumber: true
                })}
              />
              {errors.quantiteStock && (
                <p className="text-sm text-red-600 mt-1">{errors.quantiteStock.message}</p>
              )}
            </div>

            {/* Seuil alerte */}
            <div>
              <Label htmlFor="seuilAlerte">Seuil d&apos;alerte *</Label>
              <Input
                id="seuilAlerte"
                type="number"
                {...register('seuilAlerte', { 
                  required: 'Le seuil d\'alerte est obligatoire',
                  valueAsNumber: true
                })}
                placeholder="10"
              />
              {errors.seuilAlerte && (
                <p className="text-sm text-red-600 mt-1">{errors.seuilAlerte.message}</p>
              )}
            </div>

            {/* Seuil rupture */}
            <div>
              <Label htmlFor="seuilRupture">Seuil de rupture *</Label>
              <Input
                id="seuilRupture"
                type="number"
                {...register('seuilRupture', { 
                  required: 'Le seuil de rupture est obligatoire',
                  valueAsNumber: true
                })}
                placeholder="5"
              />
              {errors.seuilRupture && (
                <p className="text-sm text-red-600 mt-1">{errors.seuilRupture.message}</p>
              )}
            </div>

            {/* Prix unitaire */}
            <div>
              <Label htmlFor="prixUnitaire">Prix unitaire (FCFA)</Label>
              <Input
                id="prixUnitaire"
                type="number"
                step="0.01"
                {...register('prixUnitaire', { valueAsNumber: true })}
                placeholder="450.00"
              />
            </div>

            {/* Emplacement */}
            <div>
              <Label htmlFor="emplacementStock">Emplacement</Label>
              <Input
                id="emplacementStock"
                {...register('emplacementStock')}
                placeholder="Entrepôt A - Étagère 3"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                {...register('notes')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={2}
                placeholder="Notes complémentaires..."
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enregistrement...' : (materiel ? 'Mettre à jour' : 'Créer')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
