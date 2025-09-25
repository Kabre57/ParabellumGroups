import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, MessageSquare, User, FileText, AlertTriangle, Send } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const messageService = createCrudService('messages');
const userService = createCrudService('users');

const createMessageSchema = z.object({
  recipientId: z.number().min(1, 'Destinataire requis'),
  subject: z.string().min(1, 'Sujet requis'),
  content: z.string().min(1, 'Contenu requis'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  type: z.enum(['internal', 'external', 'system']).default('internal')
});

type CreateMessageFormData = z.infer<typeof createMessageSchema>;

interface CreateMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId?: number;
  replyTo?: any;
}

export const CreateMessageModal: React.FC<CreateMessageModalProps> = ({ 
  isOpen, 
  onClose, 
  recipientId,
  replyTo 
}) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getAll({ limit: 100 })
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<CreateMessageFormData>({
    resolver: zodResolver(createMessageSchema),
    defaultValues: {
      recipientId,
      priority: 'normal',
      type: 'internal',
      subject: replyTo ? `Re: ${replyTo.subject}` : '',
      content: replyTo ? `\n\n--- Message original ---\n${replyTo.content}` : ''
    }
  });

  const priority = watch('priority');

  const createMessageMutation = useMutation({
    mutationFn: (data: CreateMessageFormData) => messageService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateMessageFormData) => {
    setIsLoading(true);
    try {
      await createMessageMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const usersList = users?.data?.users || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            {replyTo ? 'Répondre au Message' : 'Nouveau Message'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Destinataire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destinataire</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                {...register('recipientId', { valueAsNumber: true })}
                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={!!recipientId}
              >
                <option value="">Sélectionner un destinataire</option>
                {usersList.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email}) - {user.service?.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.recipientId && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.recipientId.message}</p>}
          </div>

          {/* Sujet et priorité */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sujet</label>
              <input
                {...register('subject')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Objet du message"
              />
              {errors.subject && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.subject.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priorité</label>
              <div className="relative">
                <AlertTriangle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  {...register('priority')}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="low">Basse</option>
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>
          </div>

          {/* Alerte priorité urgente */}
          {priority === 'urgent' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                <span className="text-sm font-medium text-red-800 dark:text-red-200">
                  Message marqué comme urgent - Le destinataire recevra une notification immédiate
                </span>
              </div>
            </div>
          )}

          {/* Type de message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de message</label>
            <select
              {...register('type')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="internal">Interne</option>
              <option value="external">Externe</option>
              <option value="system">Système</option>
            </select>
          </div>

          {/* Contenu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
              <textarea
                {...register('content')}
                rows={8}
                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Tapez votre message ici..."
              />
            </div>
            {errors.content && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.content.message}</p>}
          </div>

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>{isLoading ? 'Envoi...' : 'Envoyer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};