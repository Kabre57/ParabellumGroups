'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface Technicien {
  id?: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  specialiteId: number;
  competences?: string;
  certifications?: string;
  tauxHoraire?: number;
  statut: 'DISPONIBLE' | 'OCCUPE' | 'EN_CONGE' | 'INACTIF';
}

interface TechnicienFormProps {
  item?: Technicien;
  onSubmit: (data: Partial<Technicien>) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function TechnicienForm({ item, onSubmit, onClose, isLoading }: TechnicienFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<Partial<Technicien>>({
    defaultValues: item || {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      specialiteId: 0,
      competences: '',
      certifications: '',
      tauxHoraire: 0,
      statut: 'DISPONIBLE',
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold">
            {item ? 'Modifier le technicien' : 'Nouveau technicien'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nom */}
            <div>
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                {...register('nom', { required: 'Le nom est obligatoire' })}
                placeholder="Dupont"
              />
              {errors.nom && (
                <p className="text-sm text-red-600 mt-1">{errors.nom.message}</p>
              )}
            </div>

            {/* Prénom */}
            <div>
              <Label htmlFor="prenom">Prénom *</Label>
              <Input
                id="prenom"
                {...register('prenom', { required: 'Le prénom est obligatoire' })}
                placeholder="Jean"
              />
              {errors.prenom && (
                <p className="text-sm text-red-600 mt-1">{errors.prenom.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email', { 
                  required: 'L\'email est obligatoire',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email invalide',
                  },
                })}
                placeholder="jean.dupont@example.com"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Téléphone */}
            <div>
              <Label htmlFor="telephone">Téléphone *</Label>
              <Input
                id="telephone"
                {...register('telephone', { required: 'Le téléphone est obligatoire' })}
                placeholder="06 12 34 56 78"
              />
              {errors.telephone && (
                <p className="text-sm text-red-600 mt-1">{errors.telephone.message}</p>
              )}
            </div>

            {/* Spécialité ID */}
            <div>
              <Label htmlFor="specialiteId">Spécialité *</Label>
              <select
                id="specialiteId"
                {...register('specialiteId', { 
                  required: 'La spécialité est obligatoire',
                  valueAsNumber: true,
                })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
              >
                <option value={0}>Sélectionner une spécialité</option>
                {/* TODO: Populate with actual specialites */}
              </select>
              {errors.specialiteId && (
                <p className="text-sm text-red-600 mt-1">{errors.specialiteId.message}</p>
              )}
            </div>

            {/* Taux Horaire */}
            <div>
              <Label htmlFor="tauxHoraire">Taux horaire (F/h)</Label>
              <Input
                id="tauxHoraire"
                type="number"
                step="0.01"
                {...register('tauxHoraire', {
                  valueAsNumber: true,
                })}
                placeholder="45.00"
              />
            </div>

            {/* Compétences */}
            <div className="md:col-span-2">
              <Label htmlFor="competences">Compétences (JSON)</Label>
              <textarea
                id="competences"
                {...register('competences')}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
                rows={3}
                placeholder='["Developpement web", "Réseaux informatiques"]'
              />
            </div>

            {/* Certifications */}
            <div className="md:col-span-2">
              <Label htmlFor="certifications">Certifications (JSON)</Label>
              <textarea
                id="certifications"
                {...register('certifications')}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
                rows={3}
                placeholder='["Habilitation électrique B2V", "Certification ISO 9001"]'
              />
            </div>

            {/* Statut */}
            <div>
              <Label htmlFor="statut">Statut *</Label>
              <select
                id="statut"
                {...register('statut', { required: 'Le statut est obligatoire' })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
              >
                <option value="DISPONIBLE">Disponible</option>
                <option value="OCCUPE">Occupé</option>
                <option value="EN_CONGE">En congé</option>
                <option value="INACTIF">Inactif</option>
              </select>
              {errors.statut && (
                <p className="text-sm text-red-600 mt-1">{errors.statut.message}</p>
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
