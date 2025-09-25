import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, User, Phone, Wrench, Mail } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const technicienService = createCrudService('techniciens');
const specialiteService = createCrudService('specialites');
const userService = createCrudService('users');

const createTechnicienSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  prenom: z.string().min(1, 'Prénom requis'),
  contact: z.string().min(1, 'Contact requis'),
  specialiteId: z.number().min(1, 'Spécialité requise'),
  utilisateurId: z.number().optional()
});

type CreateTechnicienFormData = z.infer<typeof createTechnicienSchema>;

interface CreateTechnicienModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTechnicienModal: React.FC<CreateTechnicienModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: specialites } = useQuery({
    queryKey: ['specialites'],
    queryFn: () => specialiteService.getAll()
  });

  const { data: users } = useQuery({
    queryKey: ['users-available'],
    queryFn: () => userService.getAll({ role: 'EMPLOYEE', hasNoTechnicien: true })
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CreateTechnicienFormData>({
    resolver: zodResolver(createTechnicienSchema)
  });

  const createTechnicienMutation = useMutation({
    mutationFn: (data: CreateTechnicienFormData) => technicienService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['techniciens'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateTechnicienFormData) => {
    setIsLoading(true);
    try {
      await createTechnicienMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const specialitesList = specialites?.data?.specialites || [];
  const usersList = users?.data?.users || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Créer un Technicien
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                {...register('prenom')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Prénom"
              />
              {errors.prenom && <p className="mt-1 text-sm text-red-600">{errors.prenom.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                {...register('nom')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nom"
              />
              {errors.nom && <p className="mt-1 text-sm text-red-600">{errors.nom.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                {...register('contact')}
                type="text"
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="+225 07 07 07 07 07"
              />
            </div>
            {errors.contact && <p className="mt-1 text-sm text-red-600">{errors.contact.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Spécialité</label>
            <div className="relative">
              <Wrench className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                {...register('specialiteId', { valueAsNumber: true })}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner une spécialité</option>
                {specialitesList.map((specialite: any) => (
                  <option key={specialite.id} value={specialite.id}>
                    {specialite.libelle}
                  </option>
                ))}
              </select>
            </div>
            {errors.specialiteId && <p className="mt-1 text-sm text-red-600">{errors.specialiteId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Compte utilisateur (optionnel)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                {...register('utilisateurId', { valueAsNumber: true })}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Aucun compte associé</option>
                {usersList.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Création...' : 'Créer le technicien'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};