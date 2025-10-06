import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, User as UserIcon, Phone, Wrench, Mail, PlusCircle, Link as LinkIcon } from 'lucide-react';
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
type CreateTechnicienFormData = FormDataNone | FormDataExisting | FormDataCreate;

interface CreateTechnicienModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTechnicienModal: React.FC<CreateTechnicienModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Spécialités
  const { data: specialites } = useQuery({
    queryKey: ['specialites'],
    queryFn: () => specialiteService.getAll(),
  });

  // Users disponibles (employés sans technicien associé)
  const { data: users } = useQuery({
    queryKey: ['users-available'],
    queryFn: () => userService.getAll({ role: 'EMPLOYEE', hasNoTechnicien: true }),
  });

  // (optionnel) services si tu veux assigner le service lors de la création d'un user
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
  } = useForm<CreateTechnicienFormData>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      accountMode: 'none',
    } as any,
  });

  // garder accountMode en phase avec l'UI
  const watchMode = watch('accountMode');
  React.useEffect(() => {
    setAccountMode(watchMode || 'none');
  }, [watchMode]);

  const createTechnicienMutation = useMutation({
    mutationFn: (payload: any) => technicienService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['techniciens'] });
      queryClient.invalidateQueries({ queryKey: ['users-available'] });
      reset({ accountMode: 'none' } as any);
      onClose();
    },
  });

  // Création séquentielle (création du user si demandé, puis du technicien)
  const onSubmit = async (data: CreateTechnicienFormData) => {
    setIsLoading(true);
    try {
      let utilisateurId: number | undefined = undefined;

      if (data.accountMode === 'existing') {
        utilisateurId = (data as FormDataExisting).utilisateurId;
      }

      if (data.accountMode === 'create') {
        const d = data as FormDataCreate;
        // on génère un prénom/nom → firstName/lastName pour User
        const firstName = (data as any).prenom;
        const lastName = (data as any).nom;

        const newUserPayload = {
          email: d.email,
          firstName,
          lastName,
          role: d.role || 'EMPLOYEE',
          serviceId: d.serviceId, // optionnel
          isActive: true,
          // côté backend, prévois un password aléatoire si non fourni
        };

        const newUserRes = await userService.create(newUserPayload);
        utilisateurId = newUserRes?.data?.user?.id ?? newUserRes?.data?.id;
      }

      // payload technicien — on ne change pas ton API
      const technicienPayload: any = {
        nom: (data as any).nom,
        prenom: (data as any).prenom,
        contact: (data as any).contact,
        specialiteId: Number((data as any).specialiteId),
      };
      if (utilisateurId) technicienPayload.utilisateurId = utilisateurId;

      await createTechnicienMutation.mutateAsync(technicienPayload);
    } catch (error) {
      console.error('Erreur lors de la création du technicien:', error);
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
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <UserIcon className="h-5 w-5 mr-2" />
            Créer un Technicien
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
                  <option key={s.id} value={s.id}>
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
                      <option key={u.id} value={u.id}>
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
                  <PlusCircle className="h-4 w-4" /> Créer un compte maintenant
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

                  {/* (Optionnel) rôle & service */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                    <select
                      {...register('role' as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      defaultValue="EMPLOYEE"
                    >
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="DG">DG</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service (optionnel)</label>
                    <select
                      {...register('serviceId' as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      defaultValue=""
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
