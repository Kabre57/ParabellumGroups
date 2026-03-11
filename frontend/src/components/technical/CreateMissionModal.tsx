'use client';

import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, FileText, Loader2, MapPin, Search, List } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateMission } from '@/hooks/useTechnical';
import { useClients } from '@/hooks/useCrm';
import { crmService, type Address, type Client } from '@/shared/api/crm';
import { technicalService } from '@/shared/api/technical';
import { useAuth } from '@/shared/hooks/useAuth';
import { hasAnyPermission, hasPermission } from '@/shared/permissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const createMissionSchema = z.object({
  titre: z.string().min(1, 'Titre requis'),
  description: z.string().optional(),
  clientId: z.string().min(1, 'Sélectionnez un client CRM'),
  clientNom: z.string().min(1, 'Nom du client requis'),
  clientContact: z.string().optional(),
  adresseId: z.string().min(1, 'Sélectionnez l’adresse du chantier'),
  adresse: z.string().min(1, 'Adresse du chantier requise'),
  dateDebut: z.string().min(1, 'Date de début requise'),
  dateFin: z.string().optional(),
  priorite: z.enum(['BASSE', 'MOYENNE', 'HAUTE', 'URGENTE']).default('MOYENNE'),
  budgetEstime: z.string().optional(),
  notes: z.string().optional(),
});

type CreateMissionFormData = z.infer<typeof createMissionSchema>;

interface CreateMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (mission: any) => void;
}

const formatAddressLabel = (address: Address) => {
  const header = [address.nomAdresse, address.typeAdresse].filter(Boolean).join(' - ');
  const location = [address.ligne1, address.ligne2, address.codePostal, address.ville, address.pays]
    .filter(Boolean)
    .join(', ');

  return header ? `${header}: ${location}` : location;
};

const formatAddressValue = (address: Address) =>
  [address.ligne1, address.ligne2, address.codePostal, address.ville, address.pays]
    .filter(Boolean)
    .join(', ');

export const CreateMissionModal: React.FC<CreateMissionModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { user } = useAuth();
  const canReadCustomers = hasAnyPermission(user, [
    'customers.read',
    'customers.read_all',
    'customers.read_assigned',
    'customers.read_own',
    'customers.read_team',
    'missions.read',
    'missions.create',
    'missions.update',
    'missions.assign',
  ]);
  const createMutation = useCreateMission();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isLoadingClientDetail, setIsLoadingClientDetail] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);

  const { data: clientsData, isLoading: isLoadingClients } = useClients(
    {
      pageSize: 100,
      ...(clientSearch.trim() ? { search: clientSearch.trim() } : {}),
    },
    { enabled: canReadCustomers && isOpen }
  );

  const clients = Array.isArray(clientsData) ? clientsData : (clientsData as any)?.data || [];
  const addresses = useMemo(() => selectedClient?.adresses || [], [selectedClient]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateMissionFormData>({
    resolver: zodResolver(createMissionSchema),
    defaultValues: {
      priorite: 'MOYENNE',
      dateDebut: new Date().toISOString().split('T')[0],
      clientId: '',
      clientNom: '',
      clientContact: '',
      adresseId: '',
      adresse: '',
    },
  });

  const selectedAddressId = watch('adresseId');

  const handleClientSelect = async (clientId: string) => {
    if (!clientId) {
      setSelectedClient(null);
      setValue('clientId', '');
      setValue('clientNom', '');
      setValue('clientContact', '');
      setValue('adresseId', '');
      setValue('adresse', '');
      return;
    }

    try {
      setIsLoadingClientDetail(true);
      const response = await crmService.getClient(clientId);
      const client = response?.data || (response as any);
      const clientAddresses = client?.adresses || [];
      const defaultAddress = clientAddresses.find((item: Address) => item.isPrincipal) || clientAddresses[0];

      setSelectedClient(client);
      setValue('clientId', client.id);
      setValue('clientNom', client.nom);
      setValue('clientContact', client.telephone || client.mobile || client.email || '');
      setValue('adresseId', defaultAddress?.id || '');
      setValue('adresse', defaultAddress ? formatAddressValue(defaultAddress) : '');
      setIsClientPickerOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Impossible de charger le client CRM sélectionné');
    } finally {
      setIsLoadingClientDetail(false);
    }
  };

  const handleAddressSelect = (addressId: string) => {
    const address = addresses.find((item) => item.id === addressId);
    setValue('adresseId', addressId);
    setValue('adresse', address ? formatAddressValue(address) : '');
  };

  const onSubmit = async (data: CreateMissionFormData) => {
    if (!canReadCustomers) {
      toast.error('La création de mission exige l’accès CRM pour sélectionner un client et son adresse');
      return;
    }

    try {
      const createdResponse = await createMutation.mutateAsync({
        titre: data.titre,
        description: data.description,
        clientId: data.clientId,
        clientNom: data.clientNom,
        clientContact: data.clientContact || undefined,
        adresse: data.adresse,
        dateDebut: data.dateDebut,
        dateFin: data.dateFin || undefined,
        priorite: data.priorite,
        budgetEstime: data.budgetEstime ? parseFloat(data.budgetEstime) : undefined,
        notes: data.notes,
      } as any);

      const createdMission = (createdResponse as any)?.data ?? createdResponse;
      let printableMission = createdMission;

      if (createdMission?.id) {
        try {
          const fullMissionResponse = await technicalService.getMission(createdMission.id);
          printableMission = (fullMissionResponse as any)?.data ?? fullMissionResponse;
        } catch (printLoadError) {
          console.error('Erreur chargement mission pour impression:', printLoadError);
        }
      }

      toast.success('Mission créée avec succès');
      onCreated?.(printableMission);
      reset();
      setSelectedClient(null);
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Erreur lors de la création de la mission');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 p-4">
      <div className="max-h-screen w-full max-w-[1200px] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 className="flex items-center text-lg font-medium text-gray-900 dark:text-white">
            <FileText className="mr-2 h-5 w-5 text-blue-600" />
            Créer une Mission
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-4">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Titre de la Mission *
            </label>
            <input
              {...register('titre')}
              type="text"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Ex: Installation électrique bâtiment A"
              disabled={createMutation.isPending}
            />
            {errors.titre && <p className="mt-1 text-sm text-red-600">{errors.titre.message}</p>}
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">Client CRM</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Les clients et leurs adresses sont gérés uniquement dans le CRM. La mission réutilise ces données.
              </p>
            </div>

            {!canReadCustomers ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                Accès CRM requis: vous devez sélectionner un client existant et l’une de ses adresses.
              </div>
            ) : (
              <>
                <input type="hidden" {...register('clientId')} />
                <input type="hidden" {...register('clientNom')} />
                <input type="hidden" {...register('adresseId')} />

                <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedClient ? selectedClient.nom : 'Aucun client CRM sélectionné'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedClient
                          ? selectedClient.email || selectedClient.telephone || 'Aucun contact principal'
                          : 'Choisissez un client existant dans le CRM'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsClientPickerOpen(true)}
                  className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      disabled={createMutation.isPending || isLoadingClients}
                    >
                      <List className="mr-2 h-4 w-4" />
                      Choisir dans la liste complète
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Client *
                    </label>
                    <select
                      value={selectedClient?.id || ''}
                      onChange={(event) => void handleClientSelect(event.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      disabled={createMutation.isPending || isLoadingClients || isLoadingClientDetail}
                    >
                      <option value="">Sélectionner un client CRM</option>
                      {clients.map((client: Client) => (
                        <option key={client.id} value={client.id}>
                          {client.nom} {client.email ? `(${client.email})` : ''}
                        </option>
                      ))}
                    </select>
                    {errors.clientId && <p className="mt-1 text-sm text-red-600">{errors.clientId.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Contact client
                    </label>
                    <input
                      {...register('clientContact')}
                      type="text"
                      readOnly
                      className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="Téléphone ou email"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Adresse du Chantier *
                  </label>
                  <select
                    value={selectedAddressId || ''}
                    onChange={(event) => handleAddressSelect(event.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    disabled={createMutation.isPending || !selectedClient || isLoadingClientDetail || addresses.length === 0}
                  >
                    <option value="">
                      {selectedClient
                        ? addresses.length > 0
                          ? 'Sélectionner une adresse CRM'
                          : 'Ce client n’a aucune adresse CRM'
                        : 'Sélectionner d’abord un client CRM'}
                    </option>
                    {addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {formatAddressLabel(address)}
                      </option>
                    ))}
                  </select>
                  {errors.adresseId && <p className="mt-1 text-sm text-red-600">{errors.adresseId.message}</p>}
                  {selectedClient && addresses.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      Ce client doit d’abord avoir une adresse enregistrée dans le CRM avant de pouvoir être utilisé dans une mission.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Adresse retenue pour la mission
                  </label>
                  <div className="flex items-start rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <MapPin className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                    <textarea
                      {...register('adresse')}
                      readOnly
                      rows={2}
                      className="w-full resize-none bg-transparent outline-none"
                      placeholder="L’adresse sélectionnée dans le CRM sera utilisée pour la mission"
                    />
                  </div>
                  {errors.adresse && <p className="mt-1 text-sm text-red-600">{errors.adresse.message}</p>}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              {...register('description')}
              rows={6}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Description détaillée de la mission"
              disabled={createMutation.isPending}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes internes</label>
            <textarea
              {...register('notes')}
              rows={5}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Notes internes"
              disabled={createMutation.isPending}
            />
          </div>
            </div>

            <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Date de Début *</label>
              <input
                {...register('dateDebut')}
                type="date"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                disabled={createMutation.isPending}
              />
              {errors.dateDebut && <p className="mt-1 text-sm text-red-600">{errors.dateDebut.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Date de Fin</label>
              <input
                {...register('dateFin')}
                type="date"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                disabled={createMutation.isPending}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Priorité *</label>
              <select
                {...register('priorite')}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                disabled={createMutation.isPending}
              >
                <option value="BASSE">Basse</option>
                <option value="MOYENNE">Moyenne</option>
                <option value="HAUTE">Haute</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Budget Estimé (FCFA)</label>
            <input
              {...register('budgetEstime')}
              type="number"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Montant estimé"
              disabled={createMutation.isPending}
            />
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300">
            <p className="font-medium text-gray-900 dark:text-white">Rappel CRM</p>
            <p className="mt-2">
              Le client et l’adresse du chantier sont pilotés par le CRM. Cette mission réutilise ces informations sans créer de fiche client locale.
            </p>
          </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              disabled={createMutation.isPending}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={
                createMutation.isPending ||
                !canReadCustomers ||
                isLoadingClientDetail ||
                !selectedClient ||
                addresses.length === 0
              }
            >
              {createMutation.isPending ? (
                <span className="inline-flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </span>
              ) : (
                'Créer la mission'
              )}
            </button>
          </div>
        </form>
      </div>

      <Dialog open={isClientPickerOpen} onOpenChange={setIsClientPickerOpen}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sélectionner un client CRM</DialogTitle>
            <DialogDescription>
              Le client et l’adresse du chantier sont gérés dans le CRM. Sélectionnez ici le bon dossier client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={clientSearch}
                onChange={(event) => setClientSearch(event.target.value)}
                placeholder="Rechercher un client CRM"
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Client</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Téléphone</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Adresses CRM</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingClients ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        Chargement des clients...
                      </td>
                    </tr>
                  ) : clients.length > 0 ? (
                    clients.map((client: Client) => (
                      <tr key={client.id} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{client.nom}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{client.email || '-'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {client.telephone || client.mobile || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {client.adresses?.length || 0}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void handleClientSelect(client.id)}
                            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            disabled={isLoadingClientDetail}
                          >
                            Sélectionner
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        Aucun client CRM trouvé pour cette recherche
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
