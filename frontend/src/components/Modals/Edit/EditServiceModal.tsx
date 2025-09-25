import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Building2, FileText } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const serviceService = createCrudService('services');

const editServiceSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional()
});

type EditServiceFormData = z.infer<typeof editServiceSchema>;

interface EditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: any;
}

export const EditServiceModal: React.FC<EditServiceModalProps> = ({ isOpen, onClose, service }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<EditServiceFormData>({
    resolver: zodResolver(editServiceSchema),
    defaultValues: {
      name: service?.name || '',
      description: service?.description || ''
    }
  });

  const updateServiceMutation = useMutation({
    mutationFn: (data: EditServiceFormData) => serviceService.update(service.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: EditServiceFormData) => {
    setIsLoading(true);
    try {
      await updateServiceMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Modifier le Service
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du service</label>
            <input
              {...register('name')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Service Commercial"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
              <textarea
                {...register('description')}
                rows={3}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Description du service..."
              />
            </div>
          </div>

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
              {isLoading ? 'Modification...' : 'Modifier le service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

