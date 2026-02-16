'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, FileText, Calendar, User, AlertCircle, Search, List } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateMission } from '@/hooks/useTechnical';
import { useClients, useCreateClient, useCreateAdresse, useTypeClients } from '@/hooks/useCrm';
import { Client } from '@/shared/api/crm/types';
import { useAuth } from '@/shared/hooks/useAuth';
import { hasPermission } from '@/shared/permissions';

// Utiliser les mêmes valeurs que le backend: BASSE, MOYENNE, HAUTE, URGENTE
const createMissionSchema = z.object({
  titre: z.string().min(1, 'Titre requis'),
  description: z.string().optional(),
  clientId: z.string().optional(),
  clientNom: z.string().min(1, 'Nom du client requis'),
  clientContact: z.string().optional(),
  adresse: z.string().optional(),
  dateDebut: z.string().min(1, 'Date de début requise'),
  dateFin: z.string().optional(),
  priorite: z.enum(['BASSE', 'MOYENNE', 'HAUTE', 'URGENTE']).default('MOYENNE'),
  budgetEstime: z.string().optional(),
  notes: z.string().optional(),
  useManualClient: z.boolean().default(false),
  createInCrm: z.boolean().default(false),
  manualContactName: z.string().optional(),
  manualEmail: z.string().optional(),
  manualPhone: z.string().optional(),
  manualAddressLine1: z.string().optional(),
  manualAddressLine2: z.string().optional(),
  manualPostalCode: z.string().optional(),
  manualCity: z.string().optional(),
  manualCountry: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.useManualClient) {
    if (!data.manualAddressLine1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Adresse requise',
        path: ['manualAddressLine1'],
      });
    }
    if (!data.manualPostalCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Code postal requis',
        path: ['manualPostalCode'],
      });
    }
    if (!data.manualCity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ville requise',
        path: ['manualCity'],
      });
    }
    if (!data.manualCountry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pays requis',
        path: ['manualCountry'],
      });
    }
    if (!data.manualEmail && !data.manualPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Téléphone ou email requis',
        path: ['manualPhone'],
      });
    }
    if (data.createInCrm && !data.manualEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email requis pour créer le client dans le CRM',
        path: ['manualEmail'],
      });
    }
  } else {
    if (!data.clientId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sélectionnez un client du CRM',
        path: ['clientNom'],
      });
    }
    if (!data.adresse) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Adresse requise',
        path: ['adresse'],
      });
    }
  }
});

type CreateMissionFormData = z.infer<typeof createMissionSchema>;

interface CreateMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateMissionModal: React.FC<CreateMissionModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const canReadCustomers = hasPermission(user, 'customers.read');
  const createMutation = useCreateMission();
  const createClientMutation = useCreateClient();
  const createAdresseMutation = useCreateAdresse();
  const { data: typeClientsResponse } = useTypeClients({ enabled: canReadCustomers });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientTableModal, setShowClientTableModal] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  const { data: clientsData, isLoading: isLoadingClients } = useClients(
    {
      pageSize: 50,
      ...(showClientTableModal && tableSearch ? { search: tableSearch } : {})
    },
    { enabled: canReadCustomers }
  );

  const clients = Array.isArray(clientsData) ? clientsData : (clientsData as any)?.data || [];
  const typeClients = typeClientsResponse?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<CreateMissionFormData>({
    resolver: zodResolver(createMissionSchema),
    defaultValues: {
      priorite: 'MOYENNE',
      dateDebut: new Date().toISOString().split('T')[0],
      useManualClient: false,
      createInCrm: false,
      manualContactName: '',
      manualEmail: '',
      manualPhone: '',
      manualAddressLine1: '',
      manualAddressLine2: '',
      manualPostalCode: '',
      manualCity: '',
      manualCountry: 'Cote dIvoire'
    }
  });

  const useManualClient = watch('useManualClient');
  const clientId = watch('clientId');

  useEffect(() => {
    if (!canReadCustomers) {
      setValue('useManualClient', true);
      setValue('createInCrm', false);
      setSelectedClient(null);
      setShowClientTableModal(false);
    }

    if (useManualClient) {
      setSelectedClient(null);
      setShowClientTableModal(false);
      setValue('clientId', '');
      setValue('clientNom', '');
      setValue('clientContact', '');
      setValue('adresse', '');
    } else {
      setValue('manualContactName', '');
      setValue('manualEmail', '');
      setValue('manualPhone', '');
      setValue('manualAddressLine1', '');
      setValue('manualAddressLine2', '');
      setValue('manualPostalCode', '');
      setValue('manualCity', '');
      setValue('manualCountry', 'Cote dIvoire');
    }
  }, [useManualClient, setValue, canReadCustomers]);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setShowClientTableModal(false);
    setTableSearch('');
    
    setValue('useManualClient', false);
    setValue('clientId', client.id);
    setValue('clientNom', client.nom);
    setValue('clientContact', client.telephone || client.mobile || client.email || '');
    
    if (client.adresses && client.adresses.length > 0) {
      const principalAddr = client.adresses.find(a => a.isPrincipal) || client.adresses[0];
      const adresseComplete = [
        principalAddr.ligne1,
        principalAddr.codePostal,
        principalAddr.ville,
        principalAddr.pays
      ].filter(Boolean).join(', ');
      setValue('adresse', adresseComplete);
    }
  };


  const onSubmit = async (data: CreateMissionFormData) => {
    try {
      let clientNom = data.clientNom;
      let clientContact = data.clientContact || '';
      let adresse = data.adresse;
      let clientId = data.clientId;

      if (data.useManualClient) {
        const contactParts = [];
        if (data.manualContactName) contactParts.push(data.manualContactName);
        const phoneOrEmail = data.manualPhone || data.manualEmail;
        if (phoneOrEmail) contactParts.push(phoneOrEmail);
        clientContact = contactParts.join(' - ');

        adresse = [
          data.manualAddressLine1,
          data.manualAddressLine2,
          data.manualPostalCode,
          data.manualCity,
          data.manualCountry
        ].filter(Boolean).join(', ');

        clientId = undefined;

        if (data.createInCrm) {
          const typeClient = typeClients.find((item: any) => item?.isActive !== false) || typeClients[0];
          if (!typeClient) {
            toast.error('Aucun type de client disponible dans le CRM');
            return;
          }

          const createdClient = await createClientMutation.mutateAsync({
            nom: clientNom,
            email: data.manualEmail,
            telephone: data.manualPhone || undefined,
            typeClientId: typeClient.id,
          });

          const createdClientId = (createdClient as any)?.data?.id;
          if (createdClientId) {
            await createAdresseMutation.mutateAsync({
              clientId: createdClientId,
              typeAdresse: 'ETABLISSEMENT',
              ligne1: data.manualAddressLine1,
              ligne2: data.manualAddressLine2 || undefined,
              codePostal: data.manualPostalCode,
              ville: data.manualCity,
              pays: data.manualCountry || '',
              isPrincipal: true,
            });
            clientId = createdClientId;
          }
        }
      }

      const payload = {
        titre: data.titre,
        description: data.description,
        clientNom,
        clientContact: clientContact || undefined,
        adresse,
        dateDebut: data.dateDebut,
        dateFin: data.dateFin || undefined,
        priorite: data.priorite,
        budgetEstime: data.budgetEstime ? parseFloat(data.budgetEstime) : undefined,
        notes: data.notes,
        clientId,
      };

      await createMutation.mutateAsync(payload);
      toast.success('Mission créee avec succès');
      reset();
      onClose();
    } catch (error: any) {
      console.error('Erreur détaillée création mission:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Erreur inconnue';
      toast.error(`Erreur: ${errorMessage}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600" />
            Creer une Mission
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            type="button"
            disabled={createMutation.isPending}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Titre de la Mission *
            </label>
            <input
              {...register('titre')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Ex: Installation électrique bâtiment A"
              disabled={createMutation.isPending}
            />
            {errors.titre && <p className="mt-1 text-sm text-red-600">{errors.titre.message}</p>}
          </div>

          {/* Client */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
  <input
    id="useManualClient"
    type="checkbox"
    {...register('useManualClient')}
    disabled={createMutation.isPending || !canReadCustomers}
  />
  <label htmlFor="useManualClient" className="text-sm text-gray-700 dark:text-gray-300">
    Ajouter un nouveau client (saisie manuelle)
  </label>
</div>
{!canReadCustomers && (
  <p className="text-xs text-amber-600">Acc?s CRM manquant: mode manuel uniquement.</p>
)}

            {useManualClient && canReadCustomers && (
              <div className="flex items-center gap-2">
                <input
                  id="createInCrm"
                  type="checkbox"
                  {...register('createInCrm')}
                  disabled={createMutation.isPending}
                />
                <label htmlFor="createInCrm" className="text-sm text-gray-700 dark:text-gray-300">
                  Creer ce client dans le CRM
                </label>
              </div>
            )}

            <input type="hidden" {...register('clientId')} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom du Client *
                </label>

                {useManualClient ? (
                  <input
                    {...register('clientNom')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Nom du client"
                    disabled={createMutation.isPending}
                  />
                ) : (
                  <div className="space-y-2">
                    <input type="hidden" {...register('clientNom')} />
                    <select
                      value={selectedClient?.id || ''}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) {
                          setSelectedClient(null);
                          setValue('clientId', '');
                          setValue('clientNom', '');
                          setValue('clientContact', '');
                          setValue('adresse', '');
                          return;
                        }
                        const client = clients.find((c: Client) => c.id === id);
                        if (client) handleClientSelect(client);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      disabled={createMutation.isPending || isLoadingClients}
                    >
                      <option value="">Sélectionner un client</option>
                      {clients.map((client: Client) => (
                        <option key={client.id} value={client.id}>
                          {client.nom} {client.telephone || client.mobile || client.email ? `- ${client.telephone || client.mobile || client.email}` : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowClientTableModal(true)}
                      className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      disabled={createMutation.isPending}
                    >
                      <List className="h-4 w-4" />
                      Choisir dans la liste complète
                    </button>
                    {showClientTableModal && (
                      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[60]">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white">Sélectionner un client</h4>
                            <button
                              type="button"
                              onClick={() => { setShowClientTableModal(false); setTableSearch(''); }}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <X className="h-6 w-6" />
                            </button>
                          </div>
                          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <input
                                type="text"
                                value={tableSearch}
                                onChange={(e) => setTableSearch(e.target.value)}
                                placeholder="Rechercher un client..."
                                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nom</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contact</th>
                                  <th className="px-4 py-2 w-20"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {clients.map((client: Client) => (
                                  <tr
                                    key={client.id}
                                    onClick={() => handleClientSelect(client)}
                                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{client.nom}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                      {client.telephone || client.mobile || client.email || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                      <button type="button" className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                                        Sélectionner
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {clients.length === 0 && !isLoadingClients && (
                                  <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                      {tableSearch ? 'Aucun client trouvé' : 'Aucun client'}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {errors.clientNom && <p className="mt-1 text-sm text-red-600">{errors.clientNom.message}</p>}
                {!useManualClient && !selectedClient && (
                  <p className="mt-1 text-xs text-gray-500">Selectionnez un client dans la liste.</p>
                )}
              </div>

                {!useManualClient ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Client
                    </label>
                  <input
                    {...register('clientContact')}
                    type="text"
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Telephone ou email"
                    disabled={createMutation.isPending || !selectedClient}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contact Client
                  </label>
                  <input
                    {...register('manualContactName')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Nom du contact"
                    disabled={createMutation.isPending}
                  />
                </div>
              )}
            </div>

            {useManualClient && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telephone
                  </label>
                  <input
                    {...register('manualPhone')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Telephone"
                    disabled={createMutation.isPending}
                  />
                  {errors.manualPhone && (
                    <p className="mt-1 text-sm text-red-600">{errors.manualPhone.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    {...register('manualEmail')}
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Email"
                    disabled={createMutation.isPending}
                  />
                  {errors.manualEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.manualEmail.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Adresse */}
              {!useManualClient ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Adresse du Chantier *
                  </label>
              <input
                {...register('adresse')}
                type="text"
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Adresse complete du lieu d'intervention"
                disabled={createMutation.isPending || !selectedClient}
              />
              {errors.adresse && <p className="mt-1 text-sm text-red-600">{errors.adresse.message}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Adresse du Chantier *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <input
                    {...register('manualAddressLine1')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Rue"
                    disabled={createMutation.isPending}
                  />
                  {errors.manualAddressLine1 && (
                    <p className="mt-1 text-sm text-red-600">{errors.manualAddressLine1.message}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <input
                    {...register('manualAddressLine2')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Complement d'adresse"
                    disabled={createMutation.isPending}
                  />
                </div>
                <div>
                  <input
                    {...register('manualPostalCode')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Code postal"
                    disabled={createMutation.isPending}
                  />
                  {errors.manualPostalCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.manualPostalCode.message}</p>
                  )}
                </div>
                <div>
                  <input
                    {...register('manualCity')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ville"
                    disabled={createMutation.isPending}
                  />
                  {errors.manualCity && (
                    <p className="mt-1 text-sm text-red-600">{errors.manualCity.message}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <input
                    {...register('manualCountry')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Pays"
                    disabled={createMutation.isPending}
                  />
                  {errors.manualCountry && (
                    <p className="mt-1 text-sm text-red-600">{errors.manualCountry.message}</p>
                  )}
                </div>
              </div>
              <input type="hidden" {...register('adresse')} />
              <input type="hidden" {...register('clientContact')} />
            </div>
          )}

          {/* Dates et Priorité */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date de Début *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  {...register('dateDebut')}
                  type="date"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={createMutation.isPending}
                />
              </div>
              {errors.dateDebut && <p className="mt-1 text-sm text-red-600">{errors.dateDebut.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date de Fin
              </label>
              <input
                {...register('dateFin')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min={watch('dateDebut')}
                disabled={createMutation.isPending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priorité *
              </label>
              <div className="relative">
                <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  {...register('priorite')}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={createMutation.isPending}
                >
                  <option value="BASSE">Basse</option>
                  <option value="MOYENNE">Moyenne</option>
                  <option value="HAUTE">Haute</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>
              {errors.priorite && <p className="mt-1 text-sm text-red-600">{errors.priorite.message}</p>}
            </div>
          </div>

          {/* Budget Estimé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Budget Estimé (FCFA)
            </label>
            <input
              {...register('budgetEstime')}
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Montant estimé"
              disabled={createMutation.isPending}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Description détaillée de la mission..."
              disabled={createMutation.isPending}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes Complémentaires
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Notes, contraintes, informations supplémentaires..."
              disabled={createMutation.isPending}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={createMutation.isPending}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || (!useManualClient && !clientId)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Création...
                </span>
              ) : (
                'Créer la mission'
              )}
            </button>
          </div>

          {/* Debug info */}
          {createMutation.isError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">
                Erreur: {createMutation.error instanceof Error ? createMutation.error.message : 'Erreur inconnue'}
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
