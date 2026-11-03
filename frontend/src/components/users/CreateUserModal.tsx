'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, User, Mail, Lock, Shield, Building2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { adminUsersService, adminServicesService } from '@/shared/api/admin/admin.service';

const DEFAULT_INITIAL_PASSWORD = '12345678';

const createUserSchema = z.object({
  email: z.string().email('Email invalide'),
  firstName: z.string().min(2, 'Le prenom doit contenir au moins 2 caracteres'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caracteres'),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caracteres')
    .refine((password) => password === DEFAULT_INITIAL_PASSWORD || /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password), 'Utilisez le mot de passe provisoire 12345678 ou ajoutez une majuscule, une minuscule et un chiffre.'),
  confirmPassword: z.string(),
  enterpriseId: z.string().optional(),
  serviceId: z.string().optional(),
  phone: z.string().max(50).optional(),
  position: z.string().max(100).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

import { useAuth } from '@/shared/hooks/useAuth';
import { isAdminRole, isServiceManager as isServiceManagerRole } from '@/shared/permissions';
import { useEnterprise } from '@/shared/providers/EnterpriseProvider';

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  
  const { user: currentUser } = useAuth();
  const { selectedEnterprise, enterprises } = useEnterprise();
  const isGlobalAdmin = isAdminRole(currentUser);
  const isServiceManager = isServiceManagerRole(currentUser);

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['admin-services-modal', selectedEnterprise?.id],
    queryFn: () => adminServicesService.getServices(),
    enabled: isOpen && isServiceManager,
  });

  const services = Array.isArray(servicesData?.data) ? servicesData.data : [];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      password: DEFAULT_INITIAL_PASSWORD,
      confirmPassword: DEFAULT_INITIAL_PASSWORD,
      enterpriseId: '',
    }
  });

  const selectedServiceId = watch('serviceId');

  React.useEffect(() => {
    if (isServiceManager && services.length === 1 && !selectedServiceId) {
      setValue('serviceId', String(services[0].id));
    }
  }, [isServiceManager, selectedServiceId, services, setValue]);

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      if (!isServiceManager && isGlobalAdmin && !data.enterpriseId) {
        toast.error('Sélectionnez l’entreprise de rattachement du compte.');
        return;
      }
      if (!isServiceManager && !isGlobalAdmin && !selectedEnterprise) {
        toast.error('Sélectionnez une entreprise dans le tableau de bord avant de créer le compte.');
        return;
      }
      if (isServiceManager && !data.serviceId) {
        toast.error('Le service est requis');
        return;
      }
      
      await adminUsersService.createUser({
        email: data.email,
        password: isServiceManager ? DEFAULT_INITIAL_PASSWORD : data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        serviceId: data.serviceId ? parseInt(data.serviceId) : undefined,
        enterpriseId: !isServiceManager
          ? Number(data.enterpriseId || selectedEnterprise?.id)
          : undefined,
        isActive: isServiceManager,
        phone: data.phone?.trim() || undefined,
        position: data.position?.trim() || undefined,
      });
      
      toast.success(isServiceManager
        ? 'Utilisateur créé dans votre service.'
        : 'Compte créé en attente d’attribution des accès.');
      reset();
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Erreur creation utilisateur:', error);
      toast.error(error?.message || 'Erreur lors de la creation de l\'utilisateur');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Creer un Nouvel Utilisateur
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" type="button">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Informations Personnelles
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prenom *
                </label>
                <input
                  {...register('firstName')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Jean"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom *
                </label>
                <input
                  {...register('lastName')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Dupont"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="+225 ..."
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fonction</label>
                <input
                  {...register('position')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ex. Technicien"
                />
                {errors.position && <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Adresse Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                {...register('email')}
                type="email"
                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="utilisateur@parabellum.fr"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Lock className="h-4 w-4 mr-2" />
              Securite
            </h4>
            {!isServiceManager && <p className="mb-4 text-sm text-blue-700 dark:text-blue-300">
              Le mot de passe provisoire par défaut est 12345678. L’utilisateur devra le modifier lors de sa première connexion.
            </p>}
            {isServiceManager ? (
              <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                Le compte sera créé avec le mot de passe provisoire <strong>12345678</strong>. La personne devra le modifier à sa première connexion.
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mot de passe *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="********"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirmer le mot de passe *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    {...register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="********"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Accès au compte
            </h4>
            <div className="space-y-4">
              {isServiceManager ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Service de rattachement *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <select
                      {...register('serviceId')}
                      required={isServiceManager}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Selectionner un service</option>
                      {services.map((service: any) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.serviceId && (
                    <p className="mt-1 text-sm text-red-600">{errors.serviceId.message}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
                  {isGlobalAdmin ? (
                    <>
                      <label className="mb-2 block font-medium" htmlFor="new-user-enterprise">Entreprise de rattachement *</label>
                      <select
                        id="new-user-enterprise"
                        {...register('enterpriseId')}
                        required
                        className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-gray-900"
                      >
                        <option value="">Sélectionner une entreprise</option>
                        {enterprises.map((enterprise) => (
                          <option key={enterprise.id} value={enterprise.id}>{enterprise.name}</option>
                        ))}
                      </select>
                      {errors.enterpriseId && <p className="mt-1 text-red-700">Sélectionnez une entreprise.</p>}
                    </>
                  ) : (
                    <>Entreprise : <strong>{selectedEnterprise?.name || 'aucune entreprise sélectionnée'}</strong>.</>
                  )}
                  <p className="mt-2">Le compte sera créé sans rôle et restera désactivé jusqu’à ce que vous lui attribuiez un profil dans Modifier.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!isServiceManager && !isGlobalAdmin && !selectedEnterprise) || (!isServiceManager && isGlobalAdmin && enterprises.length === 0) || (isServiceManager && servicesLoading)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creation...
                </>
              ) : (
                'Creer l\'utilisateur'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
