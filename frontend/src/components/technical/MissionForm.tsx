'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface Mission {
  id?: number;
  numeroMission: string;
  titre: string;
  description?: string;
  clientNom: string;
  adresseIntervention: string;
  dateDebut: string;
  dateFin?: string;
  budgetEstime?: number;
  status: 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  priorite: 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';
}

interface MissionFormProps {
  item?: Mission;
  onSubmit: (data: Partial<Mission>) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function MissionForm({ item, onSubmit, onClose, isLoading }: MissionFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<Partial<Mission>>({
    defaultValues: item || {
      numeroMission: '',
      titre: '',
      description: '',
      clientNom: '',
      adresseIntervention: '',
      dateDebut: '',
      dateFin: '',
      budgetEstime: 0,
      status: 'PLANIFIEE',
      priorite: 'NORMALE',
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold">
            {item ? 'Modifier la mission' : 'Nouvelle mission'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Numéro Mission */}
            <div>
              <Label htmlFor="numeroMission">Numéro de mission *</Label>
              <Input
                id="numeroMission"
                {...register('numeroMission', { required: 'Le numéro de mission est obligatoire' })}
                placeholder="MISS-2026-001"
              />
              {errors.numeroMission && (
                <p className="text-sm text-red-600 mt-1">{errors.numeroMission.message}</p>
              )}
            </div>

            {/* Titre */}
            <div>
              <Label htmlFor="titre">Titre *</Label>
              <Input
                id="titre"
                {...register('titre', { required: 'Le titre est obligatoire' })}
                placeholder="Installation système de sécurité"
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
              />
            </div>

            {/* Client Nom */}
            <div>
              <Label htmlFor="clientNom">Nom du client *</Label>
              <Input
                id="clientNom"
                {...register('clientNom', { required: 'Le nom du client est obligatoire' })}
                placeholder="Entreprise XYZ"
              />
              {errors.clientNom && (
                <p className="text-sm text-red-600 mt-1">{errors.clientNom.message}</p>
              )}
            </div>

            {/* Adresse Intervention */}
            <div>
              <Label htmlFor="adresseIntervention">Adresse d&apos;intervention *</Label>
              <Input
                id="adresseIntervention"
                {...register('adresseIntervention', { required: 'L\'adresse d\'intervention est obligatoire' })}
                placeholder="123 Rue de la Paix, 75001 Paris"
              />
              {errors.adresseIntervention && (
                <p className="text-sm text-red-600 mt-1">{errors.adresseIntervention.message}</p>
              )}
            </div>

            {/* Date Début */}
            <div>
              <Label htmlFor="dateDebut">Date de début *</Label>
              <Input
                id="dateDebut"
                type="date"
                {...register('dateDebut', { required: 'La date de début est obligatoire' })}
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
              />
            </div>

            {/* Budget Estimé */}
            <div>
              <Label htmlFor="budgetEstime">Budget estimé (F)</Label>
              <Input
                id="budgetEstime"
                type="number"
                step="0.01"
                {...register('budgetEstime')}
                placeholder="15000.00"
              />
            </div>

            {/* Statut */}
            <div>
              <Label htmlFor="status">Statut *</Label>
              <select
                id="status"
                {...register('status', { required: 'Le statut est obligatoire' })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
              >
                <option value="PLANIFIEE">Planifiée</option>
                <option value="EN_COURS">En cours</option>
                <option value="TERMINEE">Terminée</option>
                <option value="ANNULEE">Annulée</option>
              </select>
              {errors.status && (
                <p className="text-sm text-red-600 mt-1">{errors.status.message}</p>
              )}
            </div>

            {/* Priorité */}
            <div>
              <Label htmlFor="priorite">Priorité *</Label>
              <select
                id="priorite"
                {...register('priorite', { required: 'La priorité est obligatoire' })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
              >
                <option value="BASSE">Basse</option>
                <option value="NORMALE">Normale</option>
                <option value="HAUTE">Haute</option>
                <option value="URGENTE">Urgente</option>
              </select>
              {errors.priorite && (
                <p className="text-sm text-red-600 mt-1">{errors.priorite.message}</p>
              )}
            </div>
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
