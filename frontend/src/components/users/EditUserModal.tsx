'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, User, Mail, Shield, Building2, Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { adminUsersService, adminRolesService, adminServicesService } from '@/shared/api/admin/admin.service';

const editUserSchema = z.object({
  email: z.string().email('Email invalide'),
  firstName: z.string().min(2, 'Le prenom doit contenir au moins 2 caracteres'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caracteres'),
  roleId: z.string().optional(),
  serviceId: z.string().optional(),
  enterpriseId: z.string().optional(),
  isActive: z.boolean().default(true),
  changePassword: z.boolean().default(false),
  newPassword: z.string().optional(),
  confirmNewPassword: z.string().optional(),
  phone: z.string().max(50).optional(),
  position: z.string().max(100).optional(),
}).refine((data) => {
  if (data.changePassword && data.newPassword) {
    return data.newPassword.length >= 8;
  }
  return true;
}, {
  message: "Le mot de passe doit contenir au moins 8 caracteres",
  path: ["newPassword"],
}).refine((data) => {
  if (data.changePassword && data.newPassword) {
    return data.newPassword === data.confirmNewPassword;
  }
  return true;
}, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmNewPassword"],
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSuccess?: () => void;
}

import { useAuth } from '@/shared/hooks/useAuth';
import { isServiceManager as isServiceManagerRole } from '@/shared/permissions';
import { isAdminRole } from '@/shared/permissions';
import { useEnterprise } from '@/shared/providers/EnterpriseProvider';

export const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onSuccess }) => {
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const { user: currentUser } = useAuth();
  const { enterprises, selectedEnterprise } = useEnterprise();
  const isServiceManager = isServiceManagerRole(currentUser);
  const isSuperAdmin = isAdminRole(currentUser) && !isServiceManager;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      roleId: '',
      serviceId: '',
      isActive: true,
      changePassword: false,
      phone: '',
      position: '',
    }
  });

  const selectedEnterpriseId = watch('enterpriseId') ?? String(user?.enterpriseId ?? user?.enterprise?.id ?? selectedEnterprise?.id ?? '');

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-roles-edit-modal', selectedEnterpriseId],
    queryFn: () => adminRolesService.getRoles(false, Number(selectedEnterpriseId)),
    enabled: isOpen && !isServiceManager && Boolean(selectedEnterpriseId),
  });

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['admin-services-edit-modal', selectedEnterpriseId],
    queryFn: () => adminServicesService.getServices(true, false, Number(selectedEnterpriseId)),
    enabled: isOpen && !isServiceManager && Boolean(selectedEnterpriseId),
  });

  const roles = Array.isArray(rolesData?.data) ? rolesData.data : [];
  const services = Array.isArray(servicesData?.data) ? servicesData.data : [];
  const enterpriseOptions = enterprises.length > 0
    ? enterprises
    : user?.enterprise ? [user.enterprise]
      : selectedEnterprise ? [selectedEnterprise] : [];

  useEffect(() => {
    if (user && isOpen) {
      reset({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        roleId: user.roleId ? String(user.roleId) : (user.role?.id ? String(user.role.id) : ''),
        serviceId: user.serviceId ? String(user.serviceId) : '',
        enterpriseId: user.enterpriseId || user.enterprise?.id
          ? String(user.enterpriseId || user.enterprise?.id)
          : String(selectedEnterprise?.id ?? ''),
        isActive: user.isActive ?? true,
        changePassword: false,
        newPassword: '',
        confirmNewPassword: '',
        phone: user.phone || '',
        position: user.position || '',
      });
    }
  }, [user, isOpen, reset, selectedEnterprise?.id]);

  const selectedRoleId = watch('roleId');
  const selectedServiceId = watch('serviceId');
  const changePassword = watch('changePassword');
  const selectedRole = roles.find((role: any) => String(role.id) === selectedRoleId);
  const roleRequiresService = ['SERVICE_MANAGER', 'COMMERCIAL', 'PURCHASING_MANAGER', 'TECHNICIAN'].includes(selectedRole?.code || '');
  const canActivateAccount = Boolean(selectedRoleId) && (!roleRequiresService || Boolean(selectedServiceId));
  const requiresService = !isServiceManager;

  const onSubmit = async (data: EditUserFormData) => {
    try {
      const updateData: any = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        ...(isServiceManager ? {
          phone: data.phone?.trim() || '',
          position: data.position?.trim() || '',
        } : { isActive: data.isActive }),
      };

      if (!isServiceManager) {
        updateData.roleId = data.roleId ? parseInt(data.roleId, 10) : null;
      }

      if (!isServiceManager) {
        updateData.serviceId = data.serviceId ? parseInt(data.serviceId, 10) : null;
      }

      if (!isServiceManager && data.enterpriseId === '') {
        updateData.enterpriseId = null;
      } else if (!isServiceManager && data.enterpriseId) {
        updateData.enterpriseId = parseInt(data.enterpriseId, 10);
      }

      if (!isServiceManager && data.changePassword && data.newPassword) {
        updateData.password = data.newPassword;
      }

      await adminUsersService.updateUser(user.id, updateData);
      
      toast.success('Utilisateur modifie avec succes');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      const errorData = error?.response?.data || error?.data;
      const firstValidationError =
        (errorData?.errors && Array.isArray(errorData.errors))
          ? errorData.errors[0]?.msg || errorData.errors[0]?.message
          : (error?.errors && Array.isArray(error.errors))
            ? error.errors[0]?.msg || error.errors[0]?.message
          : null;
      toast.error(
        firstValidationError ||
        errorData?.message ||
        error?.message ||
        'Erreur lors de la modification de l\'utilisateur'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Modifier l'Utilisateur
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
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
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
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {isServiceManager && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
                <input {...register('phone')} type="tel" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fonction</label>
                <input {...register('position')} type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>
          )}

          {!isServiceManager && <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-4">
              <input
                {...register('changePassword')}
                type="checkbox"
                id="changePassword"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="changePassword" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <Lock className="h-4 w-4 mr-2" />
                Modifier le mot de passe
              </label>
            </div>

            {changePassword && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nouveau mot de passe *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      {...register('newPassword')}
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="********"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirmer le nouveau mot de passe *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      {...register('confirmNewPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
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
                  {errors.confirmNewPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmNewPassword.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>}

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Role et Affectation
            </h4>
            {isServiceManager ? (
              <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                Le rôle et le service de ce membre sont gérés par l’administration. Vous pouvez modifier ses coordonnées et ses accès autorisés.
              </div>
            ) : <div className="space-y-4">
              {!user?.roleId && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
                  Ce compte est en attente d’accès. Choisis un profil de cette entreprise, puis active le compte.
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Profil d’accès de l’entreprise *
                </label>
                {rolesLoading ? (
                  <div className="text-sm text-gray-500">Chargement des roles...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {roles.map((role: any) => (
                      <label
                        key={role.id}
                        className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                          watch('roleId') === String(role.id)
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                        }`}
                      >
                        <input
                          {...register('roleId')}
                          type="radio"
                          value={String(role.id)}
                          className="sr-only"
                        />
                        <div className="flex flex-1">
                          <div className="flex flex-col">
                            <span className={`block text-sm font-medium ${
                              watch('roleId') === String(role.id)
                                ? 'text-blue-900 dark:text-blue-200'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {role.name}
                            </span>
                            {role.description && (
                              <span className={`mt-1 flex items-center text-xs ${
                                watch('roleId') === String(role.id)
                                  ? 'text-blue-700 dark:text-blue-300'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {role.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {errors.roleId && (
                  <p className="mt-1 text-sm text-red-600">{errors.roleId.message}</p>
                )}
              </div>

              {requiresService && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Service
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <select
                      {...register('serviceId')}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Aucun service</option>
                      {services.map((service: any) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {servicesLoading ? (
                    <p className="mt-1 text-xs text-gray-500">Chargement des services de l’entreprise…</p>
                  ) : !selectedEnterpriseId ? (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Sélectionnez d’abord une entreprise pour charger ses services.</p>
                  ) : services.length === 0 ? (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      Aucun service n’est rattaché à cette entreprise. Ouvrez <a className="font-medium underline" href="/dashboard/admin/services">Administration &gt; Services</a>, modifiez le service du catalogue et choisissez cette entreprise.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">Certains profils exigent un service. Le service doit appartenir à la même entreprise que le compte.</p>
                  )}
                </div>
              )}

              {isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Entreprise *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <select
                      {...register('enterpriseId')}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Selectionner une entreprise</option>
                      {enterpriseOptions.map((enterprise: any) => (
                        <option key={enterprise.id} value={enterprise.id}>
                          {enterprise.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.enterpriseId && (
                    <p className="mt-1 text-sm text-red-600">{errors.enterpriseId.message}</p>
                  )}
                </div>
              )}
            </div>}
          </div>

          {!isServiceManager && <div className="flex items-center space-x-3">
            <input
              {...register('isActive')}
              type="checkbox"
              id="isActive"
              disabled={!canActivateAccount}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className={`text-sm font-medium ${canActivateAccount ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`}>
              Compte actif {!canActivateAccount && '— choisissez un profil et, si nécessaire, un service'}
            </label>
          </div>}

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
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Modification...
                </>
              ) : (
                'Enregistrer les modifications'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
