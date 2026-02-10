'use client';

import React, { useEffect } from 'react'; // Ajout de useEffect
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Mission } from '@/shared/api/technical';

interface MissionFormProps {
  item?: Mission;
  onSubmit: (data: Partial<Mission>) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function MissionForm({ item, onSubmit, onClose, isLoading }: MissionFormProps) {
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<Partial<Mission>>({
    defaultValues: {
      titre: '',
      description: '',
      clientNom: '',
      clientContact: '',
      adresse: '',
      dateDebut: new Date().toISOString().split('T')[0],
      dateFin: '',
      budgetEstime: undefined,
      priorite: 'MOYENNE',
      notes: ''
    },
  });

  // Réinitialiser le formulaire quand 'item' change
  useEffect(() => {
    if (item) {
      console.log('MissionForm: Chargement des données de la mission', item);
      
      // Formater les dates pour l'input type="date" (YYYY-MM-DD)
      const formatDateForInput = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };

      reset({
        titre: item.titre || '',
        description: item.description || '',
        clientNom: item.clientNom || '',
        clientContact: item.clientContact || '',
        adresse: item.adresse || '',
        dateDebut: formatDateForInput(item.dateDebut),
        dateFin: formatDateForInput(item.dateFin),
        budgetEstime: item.budgetEstime || undefined,
        priorite: item.priorite || 'MOYENNE',
        notes: item.notes || ''
      });
    } else {
      // Réinitialiser pour création
      reset({
        titre: '',
        description: '',
        clientNom: '',
        clientContact: '',
        adresse: '',
        dateDebut: new Date().toISOString().split('T')[0],
        dateFin: '',
        budgetEstime: undefined,
        priorite: 'MOYENNE',
        notes: ''
      });
    }
  }, [item, reset]);

  const handleFormSubmit = (data: Partial<Mission>) => {
    console.log('MissionForm data submitted:', data);
    console.log('Mission item original:', item);
    
    // Validation
    if (!data.titre?.trim()) {
      toast.error('Le titre est requis');
      return;
    }
    if (!data.clientNom?.trim()) {
      toast.error('Le nom du client est requis');
      return;
    }
    if (!data.adresse?.trim()) {
      toast.error('L\'adresse est requise');
      return;
    }
    if (!data.dateDebut) {
      toast.error('La date de début est requise');
      return;
    }
    
    // Pour l'édition, on garde l'ID
    const payload = {
      ...data,
      id: item?.id, // Important pour l'édition
      budgetEstime: data.budgetEstime ? Number(data.budgetEstime) : undefined,
      priorite: data.priorite || 'MOYENNE'
    };
    
    console.log('MissionForm payload envoyé:', payload);
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold">
            {item ? `Modifier la mission: ${item.numeroMission}` : 'Nouvelle mission'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
          {/* Afficher le numéro de mission en mode édition */}
          {item && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-semibold">Numéro de mission:</span> {item.numeroMission}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Ce numéro est généré automatiquement et ne peut pas être modifié.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Titre */}
            <div className="md:col-span-2">
              <Label htmlFor="titre">Titre *</Label>
              <Input
                id="titre"
                {...register('titre', { required: 'Le titre est obligatoire' })}
                placeholder="Installation système de sécurité"
                disabled={isLoading}
              />
              {errors.titre && (
                <p className="text-sm text-red-600 mt-1">{errors.titre.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                {...register('description')}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
                rows={3}
                placeholder="Description détaillée de la mission..."
                disabled={isLoading}
              />
            </div>

            {/* Client Nom */}
            <div>
              <Label htmlFor="clientNom">Nom du client *</Label>
              <Input
                id="clientNom"
                {...register('clientNom', { required: 'Le nom du client est obligatoire' })}
                placeholder="Entreprise XYZ"
                disabled={isLoading}
              />
              {errors.clientNom && (
                <p className="text-sm text-red-600 mt-1">{errors.clientNom.message}</p>
              )}
            </div>

            {/* Client Contact */}
            <div>
              <Label htmlFor="clientContact">Contact client</Label>
              <Input
                id="clientContact"
                {...register('clientContact')}
                placeholder="Téléphone ou email"
                disabled={isLoading}
              />
            </div>

            {/* Adresse */}
            <div className="md:col-span-2">
              <Label htmlFor="adresse">Adresse d&apos;intervention *</Label>
              <Input
                id="adresse"
                {...register('adresse', { required: 'L\'adresse d\'intervention est obligatoire' })}
                placeholder="123 Rue de la Paix, 75001 Paris"
                disabled={isLoading}
              />
              {errors.adresse && (
                <p className="text-sm text-red-600 mt-1">{errors.adresse.message}</p>
              )}
            </div>

            {/* Date Début */}
            <div>
              <Label htmlFor="dateDebut">Date de début *</Label>
              <Input
                id="dateDebut"
                type="date"
                {...register('dateDebut', { required: 'La date de début est obligatoire' })}
                disabled={isLoading}
              />
              {errors.dateDebut && (
                <p className="text-sm text-red-600 mt-1">{errors.dateDebut.message}</p>
              )}
            </div>

            {/* Date Fin */}
            <div>
              <Label htmlFor="dateFin">Date de fin</Label>
              <Input
                id="dateFin"
                type="date"
                {...register('dateFin')}
                min={watch('dateDebut')}
                disabled={isLoading}
              />
            </div>

            {/* Budget Estimé */}
            <div>
              <Label htmlFor="budgetEstime">Budget estimé (FCFA)</Label>
              <Input
                id="budgetEstime"
                type="number"
                step="0.01"
                {...register('budgetEstime')}
                placeholder="15000.00"
                disabled={isLoading}
              />
            </div>

            {/* Priorité */}
            <div>
              <Label htmlFor="priorite">Priorité *</Label>
              <select
                id="priorite"
                {...register('priorite', { required: 'La priorité est obligatoire' })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
                disabled={isLoading}
              >
                <option value="BASSE">Basse</option>
                <option value="MOYENNE">Moyenne</option>
                <option value="HAUTE">Haute</option>
                <option value="URGENTE">Urgente</option>
              </select>
              {errors.priorite && (
                <p className="text-sm text-red-600 mt-1">{errors.priorite.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes complémentaires</Label>
            <textarea
              id="notes"
              {...register('notes')}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
              rows={2}
              placeholder="Notes, contraintes, informations supplémentaires..."
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enregistrement...' : (item ? 'Mettre à jour' : 'Créer')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
