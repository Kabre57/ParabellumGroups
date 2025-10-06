import React, { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, User as UserIcon, Phone, Wrench, Mail, Link as LinkIcon, Save } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const technicienService = createCrudService('techniciens');
const specialiteService = createCrudService('specialites');
const userService = createCrudService('users');

// 3 modes pour le compte utilisateur
const AccountModeEnum = z.enum(['none', 'existing', 'create']);

const baseSchema = z.object({
  prenom: z.string().min(1, 'Prénom requis'),
  nom: z.string().min(1, 'Nom requis'),
  contact: z.string().min(1, 'Contact requis'),
  specialiteId: z.number({ invalid_type_error: 'Spécialité invalide' }).min(1, 'Spécialité requise'),
  accountMode: AccountModeEnum,
});

const schemaExisting = baseSchema.extend({
  utilisateurId: z
    .number({ invalid_type_error: 'Utilisateur invalide' })
    .min(1, 'Sélectionner un utilisateur')
});

const schemaCreate = baseSchema.extend({
  // champs minimaux pour créer un user
  email: z.string().email('Email invalide'),
  // on peut préremplir à partir de prénom/nom
  role: z.string().default('EMPLOYEE'),
  serviceId: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().int().positive().optional()
  ),
});

type FormDataNone = z.infer<typeof baseSchema> & { accountMode: 'none' };
type FormDataExisting = z.infer<typeof schemaExisting> & { accountMode: 'existing' };
type FormDataCreate = z.infer<typeof schemaCreate> & { accountMode: 'create' };
type EditTechnicienFormData = FormDataNone | FormDataExisting | FormDataCreate;

interface EditTechnicienModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicien: any; // Données du technicien à modifier
}

export const EditTechnicienModal: React.FC<EditTechnicienModalProps> = ({ 
  isOpen, 
  onClose, 
  technicien 
}) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Spécialités
  const { data: specialites } = useQuery({
    queryKey: ['specialites'],
    queryFn: () => specialiteService.getAll(),
  });

  // Users disponibles (employés sans technicien associé) + l'utilisateur actuel du technicien
  const { data: users } = useQuery({
    queryKey: ['users-available'],
    queryFn: () => userService.getAll({ 
      role: 'EMPLOYEE', 
      hasNoTechnicien: true,
      includeCurrent: technicien?.utilisateurId // Inclure l'utilisateur actuel même s'il est déjà associé
    }),
  });

  // Services
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => createCrudService('services').getAll(),
  });

  // Choix dynamique du schéma selon le mode
  const [accountMode, setAccountMode] = useState<'none' | 'existing' | 'create'>('none');
  const currentSchema = useMemo(() => {
    if (accountMode === 'existing') return schemaExisting;
    if (accountMode === 'create') return schemaCreate;
    return baseSchema;
  }, [accountMode]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
  } = useForm<EditTechnicienFormData>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      accountMode: 'none',
    } as any,
  });

  // Initialiser le formulaire avec les données du technicien
  useEffect(() => {
    if (technicien && isOpen) {
      // Déterminer le mode de compte
      let initialAccountMode: 'none' | 'existing' | 'create' = 'none';
      if (technicien.utilisateurId) {
        initialAccountMode = 'existing';
      }

      // Pré-remplir les champs
      const initialValues: any = {
        prenom: technicien.prenom || '',
        nom: technicien.nom || '',
        contact: technicien.contact || '',
        specialiteId: technicien.specialiteId || '',
        accountMode: initialAccountMode,
      };

      if (technicien.utilisateurId) {
        initialValues.utilisateurId = technicien.utilisateurId;
      }

      // Si le technicien a un utilisateur associé, pré-remplir les infos pour le mode "create"
      if (technicien.utilisateur) {
        initialValues.email = technicien.utilisateur.email || '';
        initialValues.role = technicien.utilisateur.role || 'EMPLOYEE';
        initialValues.serviceId = technicien.utilisateur.serviceId || '';
      }

      reset(initialValues);
      setAccountMode(initialAccountMode);
    }
  }, [technicien, isOpen, reset]);

  // garder accountMode en phase avec l'UI
  const watchMode = watch('accountMode');
  React.useEffect(() => {
    setAccountMode(watchMode || 'none');
  }, [watchMode]);

  // Mutation pour mettre à jour le technicien
  const updateTechnicienMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => 
      technicienService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['techniciens'] });
      queryClient.invalidateQueries({ queryKey: ['users-available'] });
      onClose();
    },
    onError: (error: any) => {
      console.error('Erreur lors de la mise à jour:', error);
      // Gérer les erreurs spécifiques
      if (error.response?.data?.message?.includes('unique')) {
        setError('root', { 
          type: 'manual', 
          message: 'Ce technicien existe déjà ou une contrainte unique est violée' 
        });
      }
    },
  });

  // Mise à jour du technicien
  const onSubmit = async (data: EditTechnicienFormData) => {
    if (!technicien?.id) return;

    setIsLoading(true);
    clearErrors('root');

    try {
      let utilisateurId: number | undefined | null = undefined;

      // Gestion du compte utilisateur selon le mode
      if (data.accountMode === 'none') {
        utilisateurId = null; // Dissocier l'utilisateur existant
      }
      else if (data.accountMode === 'existing') {
        utilisateurId = (data as FormDataExisting).utilisateurId;
      }
      else if (data.accountMode === 'create') {
        const d = data as FormDataCreate;
        
        // Si le technicien a déjà un utilisateur, on le met à jour
        if (technicien.utilisateurId) {
          await userService.update(technicien.utilisateurId, {
            email: d.email,
            firstName: (data as any).prenom,
            lastName: (data as any).nom,
            role: d.role || 'EMPLOYEE',
            serviceId: d.serviceId,
          });
          utilisateurId = technicien.utilisateurId;
        } else {
          // Sinon, créer un nouvel utilisateur
          const newUserPayload = {
            email: d.email,
            firstName: (data as any).prenom,
            lastName: (data as any).nom,
            role: d.role || 'EMPLOYEE',
            serviceId: d.serviceId,
            isActive: true,
          };

          const newUserRes = await userService.create(newUserPayload);
          utilisateurId = newUserRes?.data?.user?.id ?? newUserRes?.data?.id;
        }
      }

      // Payload de mise à jour du technicien
      const technicienPayload: any = {
        nom: (data as any).nom,
        prenom: (data as any).prenom,
        contact: (data as any).contact,
        specialiteId: Number((data as any).specialiteId),
      };

      // Gérer la liaison/déliaison de l'utilisateur
      if (utilisateurId !== undefined) {
        technicienPayload.utilisateurId = utilisateurId;
      }

      await updateTechnicienMutation.mutateAsync({
        id: technicien.id,
        payload: technicienPayload
      });

    } catch (error) {
      console.error('Erreur lors de la mise à jour du technicien:', error);
      setError('root', { 
        type: 'manual', 
        message: 'Erreur lors de la mise à jour. Veuillez réessayer.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const specialitesList = specialites?.data?.specialites || specialites?.data || [];
  const usersList = users?.data?.users || users?.data || [];
  const servicesList = services?.data?.services || services?.data || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <UserIcon className="h-5 w-5 mr-2" />
            Modifier le Technicien
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" type="button">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          {/* Identité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                {...register('prenom')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Prénom"
              />
              {errors?.prenom && <p className="mt-1 text-sm text-red-600">{(errors as any).prenom.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                {...register('nom')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nom"
              />
              {errors?.nom && <p className="mt-1 text-sm text-red-600">{(errors as any).nom.message}</p>}
            </div>
          </div>

          {/* Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                {...register('contact')}
                type="text"
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="+225 07 07 07 07 07"
              />
            </div>
            {errors?.contact && <p className="mt-1 text-sm text-red-600">{(errors as any).contact.message}</p>}
          </div>

          {/* Spécialité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Spécialité</label>
            <div className="relative">
              <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                {...register('specialiteId', { valueAsNumber: true })}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner une spécialité</option>
                {specialitesList.map((s: any) => (
                  <option key={s.id} value={s.id} selected={s.id === technicien?.specialiteId}>
                    {s.libelle ?? s.name ?? `#${s.id}`}
                  </option>
                ))}
              </select>
            </div>
            {errors?.specialiteId && <p className="mt-1 text-sm text-red-600">{(errors as any).specialiteId.message}</p>}
          </div>

          {/* Choix du mode de compte utilisateur */}
          <fieldset className="border rounded-md p-3">
            <legend className="text-sm font-medium text-gray-700">Compte utilisateur</legend>

            <div className="space-y-2 mt-2">
              <label className="flex items-center gap-2">
                <input type="radio" value="none" {...register('accountMode')} />
                <span>Aucun compte (accès application non requis)</span>
              </label>

              <label className="flex items-center gap-2">
                <input type="radio" value="existing" {...register('accountMode')} />
                <span className="inline-flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" /> Associer un compte existant
                </span>
              </label>

              {accountMode === 'existing' && (
                <div className="relative ml-6">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <select
                    {...register('utilisateurId', { valueAsNumber: true } as any)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sélectionner un utilisateur</option>
                    {usersList.map((u: any) => (
                      <option 
                        key={u.id} 
                        value={u.id}
                        selected={u.id === technicien?.utilisateurId}
                      >
                        {(u.firstName ?? u.prenom) || ''} {(u.lastName ?? u.nom) || ''} ({u.email})
                      </option>
                    ))}
                  </select>
                  {errors && (errors as any).utilisateurId && (
                    <p className="mt-1 text-sm text-red-600">{(errors as any).utilisateurId.message}</p>
                  )}
                </div>
              )}

              <label className="flex items-center gap-2">
                <input type="radio" value="create" {...register('accountMode')} />
                <span className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Modifier/créer un compte
                </span>
              </label>

              {accountMode === 'create' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        {...register('email' as any)}
                        type="email"
                        className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ex: jean.dupont@exemple.com"
                      />
                    </div>
                    {errors && (errors as any).email && (
                      <p className="mt-1 text-sm text-red-600">{(errors as any).email.message}</p>
                    )}
                  </div>

                  {/* Rôle & service */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                    <select
                      {...register('role' as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="SERVICE_MANAGER">SERVICE_MANAGER</option>
                      <option value="GENERAL_DIRECTOR">GENERAL_DIRECTOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service (optionnel)</label>
                    <select
                      {...register('serviceId' as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- Aucun --</option>
                      {servicesList.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name || s.libelle || `Service #${s.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          {/* Message d'erreur global */}
          {errors.root && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{errors.root.message}</p>
            </div>
          )}

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};