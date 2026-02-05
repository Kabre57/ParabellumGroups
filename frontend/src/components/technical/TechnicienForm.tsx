'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { Technicien } from '@/shared/api/services/technical';
import { useSpecialites } from '@/hooks/useTechnical';

interface TechnicienFormValues {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  specialiteId: string;
  competences?: string;
  certifications?: string;
  tauxHoraire?: number;
  status: Technicien['status'];
}

interface TechnicienFormProps {
  item?: Technicien;
  onSubmit: (data: Partial<Technicien>) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const statusOptions: Array<{ value: Technicien['status']; label: string }> = [
  { value: 'AVAILABLE', label: 'Disponible' },
  { value: 'ON_MISSION', label: 'En mission' },
  { value: 'ON_LEAVE', label: 'En conge' },
  { value: 'SICK', label: 'Malade' },
  { value: 'TRAINING', label: 'Formation' },
];

export function TechnicienForm({ item, onSubmit, onClose, isLoading }: TechnicienFormProps) {
  const { data: specialites = [] } = useSpecialites();

  const defaultValues: TechnicienFormValues = item
    ? {
        nom: item.nom || '',
        prenom: item.prenom || '',
        email: item.email || '',
        telephone: item.telephone || '',
        specialiteId: item.specialiteId || '',
        competences: item.competences?.join(', ') || '',
        certifications: item.certifications?.join(', ') || '',
        tauxHoraire: item.tauxHoraire,
        status: item.status || 'AVAILABLE',
      }
    : {
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        specialiteId: '',
        competences: '',
        certifications: '',
        tauxHoraire: 0,
        status: 'AVAILABLE',
      };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TechnicienFormValues>({
    defaultValues,
  });

  const handleFormSubmit = (values: TechnicienFormValues) => {
    const payload: Partial<Technicien> = {
      nom: values.nom,
      prenom: values.prenom,
      email: values.email,
      telephone: values.telephone,
      specialiteId: values.specialiteId,
      tauxHoraire: values.tauxHoraire,
      status: values.status,
      competences: values.competences
        ? values.competences.split(',').map((item) => item.trim()).filter(Boolean)
        : [],
      certifications: values.certifications
        ? values.certifications.split(',').map((item) => item.trim()).filter(Boolean)
        : [],
    };

    onSubmit(payload);
  };

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

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
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

            {/* Prenom */}
            <div>
              <Label htmlFor="prenom">Prenom *</Label>
              <Input
                id="prenom"
                {...register('prenom', { required: 'Le prenom est obligatoire' })}
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
                  required: "L'email est obligatoire",
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

            {/* Telephone */}
            <div>
              <Label htmlFor="telephone">Telephone *</Label>
              <Input
                id="telephone"
                {...register('telephone', { required: 'Le telephone est obligatoire' })}
                placeholder="06 12 34 56 78"
              />
              {errors.telephone && (
                <p className="text-sm text-red-600 mt-1">{errors.telephone.message}</p>
              )}
            </div>

            {/* Specialite */}
            <div>
              <Label htmlFor="specialiteId">Specialite *</Label>
              <select
                id="specialiteId"
                {...register('specialiteId', {
                  required: 'La specialite est obligatoire',
                })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
              >
                <option value="">Selectionner une specialite</option>
                {specialites.map((specialite: any) => (
                  <option key={specialite.id} value={specialite.id}>
                    {specialite.nom}
                  </option>
                ))}
              </select>
              {errors.specialiteId && (
                <p className="text-sm text-red-600 mt-1">{errors.specialiteId.message}</p>
              )}
            </div>

            {/* Taux Horaire */}
            <div>
              <Label htmlFor="tauxHoraire">Taux horaire</Label>
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

            {/* Competences */}
            <div className="md:col-span-2">
              <Label htmlFor="competences">Competences (separees par des virgules)</Label>
              <textarea
                id="competences"
                {...register('competences')}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
                rows={3}
                placeholder="Developpement web, Reseaux informatiques"
              />
            </div>

            {/* Certifications */}
            <div className="md:col-span-2">
              <Label htmlFor="certifications">Certifications (separees par des virgules)</Label>
              <textarea
                id="certifications"
                {...register('certifications')}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
                rows={3}
                placeholder="Habilitation electrique B2V, Certification ISO 9001"
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
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.status && (
                <p className="text-sm text-red-600 mt-1">{errors.status.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enregistrement...' : item ? 'Mettre a jour' : 'Creer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
