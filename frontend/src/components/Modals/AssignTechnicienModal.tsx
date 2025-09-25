import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Users, User, Wrench } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../services/api';

const technicienService = createCrudService('techniciens');

const assignTechnicienSchema = z.object({
  technicienId: z.number().min(1, 'Technicien requis'),
  role: z.enum(['Principal', 'Assistant']).default('Assistant'),
  commentaire: z.string().optional()
});

type AssignTechnicienFormData = z.infer<typeof assignTechnicienSchema>;

interface AssignTechnicienModalProps {
  isOpen: boolean;
  onClose: () => void;
  intervention: any;
}

export const AssignTechnicienModal: React.FC<AssignTechnicienModalProps> = ({ 
  isOpen, 
  onClose, 
  intervention 
}) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: techniciens } = useQuery({
    queryKey: ['techniciens'],
    queryFn: () => technicienService.getAll({ limit: 100, isActive: true })
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<AssignTechnicienFormData>({
    resolver: zodResolver(assignTechnicienSchema),
    defaultValues: {
      role: 'Assistant',
      commentaire: ''
    }
  });

  const assignTechnicienMutation = useMutation({
    mutationFn: (data: AssignTechnicienFormData) =>
      fetch(`/api/v1/interventions/${intervention.id}/assign-technicien`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: AssignTechnicienFormData) => {
    setIsLoading(true);
    try {
      await assignTechnicienMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !intervention) return null;

  const techniciensList = techniciens?.data?.techniciens || [];
  const assignedTechnicienIds = intervention.techniciens?.map((t: any) => t.technicienId) || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Assigner un Technicien
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technicien *</label>
            <select
              {...register('technicienId', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner un technicien</option>
              {techniciensList
                .filter((technicien: any) => !assignedTechnicienIds.includes(technicien.id))
                .map((technicien: any) => (
                  <option key={technicien.id} value={technicien.id}>
                    {technicien.prenom} {technicien.nom} - {technicien.specialite?.libelle}
                  </option>
                ))}
            </select>
            {errors.technicienId && <p className="mt-1 text-sm text-red-600">{errors.technicienId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select
              {...register('role')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Principal">Principal</option>
              <option value="Assistant">Assistant</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire (optionnel)</label>
            <textarea
              {...register('commentaire')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Responsabilités spécifiques..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
              {isLoading ? 'Assignation...' : 'Assigner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};