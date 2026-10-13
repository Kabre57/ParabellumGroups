'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { toast } from 'sonner';
import { useCreateMission, useResyncMissionFromCrm, useUpdateMission } from '@/hooks/useTechnical';
import { useClients } from '@/hooks/useCrm';
import { crmService, type Address, type Client } from '@/shared/api/crm';
import { technicalService, type Mission } from '@/shared/api/technical';
import { useAuth } from '@/shared/hooks/useAuth';
import { hasAnyPermission } from '@/shared/permissions';


export const createMissionSchema = z.object({
  titre: z.string().min(1, 'Titre requis'),
  description: z.string().optional(),
  clientId: z.string().min(1, 'Sélectionnez un client CRM'),
  clientNom: z.string().min(1, 'Nom du client requis'),
  nomAdresseChantier: z.string().optional(),
  clientContact: z.string().optional(),
  adresseId: z.string().min(1, 'Sélectionnez l’adresse du chantier'),
  adresse: z.string().min(1, 'Adresse du chantier requise'),
  dateDebut: z.string().min(1, 'Date de début requise'),
  dateFin: z.string().optional(),
  priorite: z.enum(['BASSE', 'MOYENNE', 'HAUTE', 'URGENTE']).default('MOYENNE'),
  budgetEstime: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateMissionFormData = z.infer<typeof createMissionSchema>;

export interface CreateMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (mission: any) => void;
  item?: Mission;
}

export const formatAddressLabel = (address: Address) => {
  const header = [address.nomAdresse, address.typeAdresse].filter(Boolean).join(' - ');
  const location = [
    address.ligne1,
    address.ligne2,
    address.ligne3,
    address.codePostal,
    address.ville,
    address.region,
    address.pays,
  ]
    .filter(Boolean)
    .join(', ');

  return header ? `${header}: ${location}` : location;
};

export const formatAddressValue = (address: Address) =>
  [address.ligne1, address.ligne2, address.ligne3, address.codePostal, address.ville, address.region, address.pays]
    .filter(Boolean)
    .join(', ');

export const getAddressSiteName = (address?: Address) =>
  address?.nomAdresse?.trim() || [address?.ligne1, address?.ville].filter(Boolean).join(', ');

export const formatDateForInput = (dateString?: string) => {
  if (!dateString) return '';
  return new Date(dateString).toISOString().split('T')[0];
};


export function useCreateMissionModalModel(props: CreateMissionModalProps) {
  const { isOpen, onClose, onCreated, item } = props;

const { user } = useAuth();

const isEditMode = Boolean(item?.id);

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

const updateMutation = useUpdateMission();

const resyncMutation = useResyncMissionFromCrm();

const isSubmitting = createMutation.isPending || updateMutation.isPending;

const [selectedClient, setSelectedClient] = useState<Client | null>(null);

const [isLoadingClientDetail, setIsLoadingClientDetail] = useState(false);

const [clientSearch, setClientSearch] = useState(item?.clientNom || '');

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
      nomAdresseChantier: '',
      clientContact: '',
      adresseId: '',
      adresse: '',
      description: '',
      dateFin: '',
      budgetEstime: '',
      notes: '',
      titre: '',
    },
  });

const selectedAddressId = watch('adresseId');

const resetEmpty = () => {
    reset({
      priorite: 'MOYENNE',
      dateDebut: new Date().toISOString().split('T')[0],
      clientId: '',
      clientNom: '',
      nomAdresseChantier: '',
      clientContact: '',
      adresseId: '',
      adresse: '',
      description: '',
      dateFin: '',
      budgetEstime: '',
      notes: '',
      titre: '',
    });
    setSelectedClient(null);
    setClientSearch('');
  };

const handleClientSelect = async (clientId: string) => {
    if (!clientId) {
      setSelectedClient(null);
      setValue('clientId', '');
      setValue('clientNom', '');
      setValue('nomAdresseChantier', '');
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
      const defaultAddress = clientAddresses.find((entry: Address) => entry.isPrincipal) || clientAddresses[0];

      setSelectedClient(client);
      setValue('clientId', client.id);
      setValue('clientNom', client.nom);
      setValue('nomAdresseChantier', getAddressSiteName(defaultAddress));
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
    const address = addresses.find((entry) => entry.id === addressId);
    setValue('adresseId', addressId);
    setValue('nomAdresseChantier', getAddressSiteName(address));
    setValue('adresse', address ? formatAddressValue(address) : '');
  };

const handleResyncFromCrm = async () => {
    if (!item?.id) return;

    try {
      const response = await resyncMutation.mutateAsync(item.id);
      const syncedMission = (response as any)?.data ?? response;
      setValue('clientId', syncedMission?.crmClientId || '');
      setValue('clientNom', syncedMission?.clientNom || '');
      setValue('nomAdresseChantier', syncedMission?.nomAdresseChantier || '');
      setValue('clientContact', syncedMission?.clientContact || '');
      setValue('adresseId', syncedMission?.crmAdresseId || '');
      setValue('adresse', syncedMission?.adresse || '');
      toast.success('Mission resynchronisée depuis le CRM');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Impossible de resynchroniser la mission depuis le CRM');
    }
  };

useEffect(() => {
    if (!isOpen) return;

    if (!item) {
      resetEmpty();
      return;
    }

    reset({
      titre: item.titre || '',
      description: item.description || '',
      clientId: item.crmClientId || '',
      clientNom: item.clientNom || '',
      nomAdresseChantier: item.nomAdresseChantier || '',
      clientContact: item.clientContact || '',
      adresseId: item.crmAdresseId || '',
      adresse: item.adresse || '',
      dateDebut: formatDateForInput(item.dateDebut),
      dateFin: formatDateForInput(item.dateFin),
      priorite: item.priorite || 'MOYENNE',
      budgetEstime: item.budgetEstime ? String(item.budgetEstime) : '',
      notes: item.notes || '',
    });
    setSelectedClient(null);
    setClientSearch(item.clientNom || '');
  }, [isOpen, item, reset]);

useEffect(() => {
    if (!isOpen || !item || !canReadCustomers) return;

    let cancelled = false;

    const loadClientFromMission = async () => {
      try {
        setIsLoadingClientDetail(true);
        let client = null;

        if (item.crmClientId) {
          const detailResponse = await crmService.getClient(item.crmClientId);
          client = (detailResponse as any)?.data || detailResponse;
        }

        if (!client) {
          const response = await crmService.getClients({ pageSize: 100, search: item.clientNom || '' });
          const list = Array.isArray((response as any)?.data)
            ? (response as any).data
            : Array.isArray(response)
              ? response
              : [];

          const matchedClient =
            list.find((entry: Client) => entry.id === item.crmClientId) ||
            list.find((entry: Client) => entry.nom === item.clientNom) ||
            list.find((entry: Client) => entry.nom?.toLowerCase() === item.clientNom?.toLowerCase()) ||
            list[0];

          if (!matchedClient?.id || cancelled) return;

          const detailResponse = await crmService.getClient(matchedClient.id);
          client = (detailResponse as any)?.data || detailResponse;
        }

        if (!client || cancelled) return;

        const clientAddresses = Array.isArray(client.adresses) ? client.adresses : [];
        const matchedAddress =
          clientAddresses.find((address: Address) => address.id === item.crmAdresseId) ||
          clientAddresses.find((address: Address) => address.nomAdresse === item.nomAdresseChantier) ||
          clientAddresses.find((address: Address) => formatAddressValue(address) === item.adresse) ||
          clientAddresses.find((address: Address) => getAddressSiteName(address) === item.nomAdresseChantier) ||
          clientAddresses.find((address: Address) => address.isPrincipal) ||
          clientAddresses[0];

        setSelectedClient(client);
        setValue('clientId', client.id);
        setValue('clientNom', client.nom || item.clientNom || '');
        setValue('clientContact', client.telephone || client.mobile || client.email || item.clientContact || '');
        setValue('nomAdresseChantier', matchedAddress ? getAddressSiteName(matchedAddress) : item.nomAdresseChantier || '');
        setValue('adresseId', matchedAddress?.id || '');
        setValue('adresse', matchedAddress ? formatAddressValue(matchedAddress) : item.adresse || '');
      } catch (error) {
        console.error('Impossible de rattacher la mission à son client CRM courant:', error);
      } finally {
        if (!cancelled) {
          setIsLoadingClientDetail(false);
        }
      }
    };

    void loadClientFromMission();

    return () => {
      cancelled = true;
    };
  }, [isOpen, item, canReadCustomers, setValue]);

const onSubmit = async (data: CreateMissionFormData) => {
    if (!canReadCustomers) {
      toast.error('La mission doit sélectionner un client et une adresse depuis le CRM');
      return;
    }

    try {
      const payload = {
        titre: data.titre,
        description: data.description,
        clientId: data.clientId,
        adresseId: data.adresseId,
        clientNom: data.clientNom,
        nomAdresseChantier: data.nomAdresseChantier || undefined,
        clientContact: data.clientContact || undefined,
        adresse: data.adresse,
        dateDebut: data.dateDebut,
        dateFin: data.dateFin || undefined,
        priorite: data.priorite,
        budgetEstime: data.budgetEstime ? parseFloat(data.budgetEstime) : undefined,
        notes: data.notes,
      } as any;

      const response = isEditMode && item?.id
        ? await updateMutation.mutateAsync({ id: item.id, data: payload })
        : await createMutation.mutateAsync(payload);

      const savedMission = (response as any)?.data ?? response;
      let fullMission = savedMission;

      if (savedMission?.id) {
        try {
          const fullMissionResponse = await technicalService.getMission(savedMission.id);
          fullMission = (fullMissionResponse as any)?.data ?? fullMissionResponse;
        } catch (printLoadError) {
          console.error('Erreur chargement mission après sauvegarde:', printLoadError);
        }
      }

      toast.success(isEditMode ? 'Mission mise à jour avec succès' : 'Mission créée avec succès');
      onCreated?.(fullMission);
      resetEmpty();
      onClose();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
        error?.message ||
        (isEditMode ? 'Erreur lors de la mise à jour de la mission' : 'Erreur lors de la création de la mission')
      );
    }
  };

  return {
    user,
    isEditMode,
    canReadCustomers,
    createMutation,
    updateMutation,
    resyncMutation,
    isSubmitting,
    selectedClient,
    setSelectedClient,
    isLoadingClientDetail,
    setIsLoadingClientDetail,
    clientSearch,
    setClientSearch,
    isClientPickerOpen,
    setIsClientPickerOpen,
    clientsData,
    isLoadingClients,
    clients,
    addresses,
    register,
    handleSubmit,
    errors,
    reset,
    setValue,
    watch,
    selectedAddressId,
    resetEmpty,
    handleClientSelect,
    handleAddressSelect,
    handleResyncFromCrm,
    onSubmit,
  };
}
