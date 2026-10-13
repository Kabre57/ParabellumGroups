/**
 * Charge le client, ses relations CRM, les formulaires et les actions de gestion.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAdresses, useContacts, useCreateAdresse, useCreateContact, useCreateInteraction, useDeleteAdresse, useDeleteContact, useDeleteInteraction, useInteractions, useSetAdressePrincipal, useSetContactPrincipal, useUpdateAdresse, useUpdateContact, useUpdateInteraction } from '@/hooks/useCrm';
import { crmService, type Address, type Client, type Contact, type Interaction } from '@/shared/api/crm';
import { getCrudVisibility } from '@/shared/action-visibility';
import { useAuth } from '@/shared/hooks/useAuth';
import { hasPermission } from '@/shared/permissions';
import { compactPayload } from './customer-detail.utils';

type ContactFormValues = {
  clientId: string;
  civilite?: string;
  prenom: string;
  nom: string;
  email?: string;
  telephone?: string;
  mobile?: string;
  poste?: string;
  departement?: string;
  type: string;
  statut: string;
  principal: boolean;
};

type AddressFormValues = {
  clientId: string;
  typeAdresse: string;
  nomAdresse?: string;
  ligne1: string;
  ligne2?: string;
  ligne3?: string;
  codePostal?: string;
  ville: string;
  region?: string;
  pays: string;
  coordonneesGps?: string;
  informationsAcces?: string;
  isPrincipal: boolean;
};

type InteractionFormValues = {
  clientId: string;
  contactId?: string;
  type: string;
  canal: string;
  sujet: string;
  description?: string;
  dateInteraction?: string;
  resultat?: string;
};

export function useCustomerDetail() {

  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const customerId = params.id as string;
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);
  const { canUpdate, canDelete, canManageContacts, canManageAddresses } = getCrudVisibility(user, {
    read: ['customers.read', 'customers.read_all', 'customers.read_assigned', 'customers.read_own', 'customers.read_team'],
    update: ['customers.update'],
    remove: ['customers.delete'],
    extras: {
      canManageContacts: ['customers.manage_contacts', 'customers.update'],
      canManageAddresses: ['customers.manage_addresses', 'customers.update'],
    },
  });
  const canManageInteractions =
    canUpdate || hasPermission(user, 'customers.update') || hasPermission(user, 'prospects.manage_activities');

  const { data: customerResponse, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => crmService.getClient(customerId),
    enabled: !!customerId,
  });

  const customer = customerResponse?.data as Client | undefined;

  const { data: contactsData = [], isLoading: isLoadingContacts } = useContacts({ pageSize: 200, clientId: customerId });
  const { data: addressesData = [], isLoading: isLoadingAddresses } = useAdresses({ page: 1, limit: 200, clientId: customerId });
  const { data: interactionsData = [], isLoading: isLoadingInteractions } = useInteractions({ page: 1, limit: 200, clientId: customerId });

  const contacts = useMemo(
    () => (Array.isArray(contactsData) ? contactsData : (contactsData as any)?.data || []),
    [contactsData]
  ) as Contact[];
  const addresses = useMemo(
    () => (Array.isArray(addressesData) ? addressesData : (addressesData as any)?.data || []),
    [addressesData]
  ) as Address[];
  const interactions = useMemo(
    () => (Array.isArray(interactionsData) ? interactionsData : (interactionsData as any)?.data || []),
    [interactionsData]
  ) as Interaction[];

  const archiveMutation = useMutation({
    mutationFn: () => crmService.deleteClient(customerId),
    onSuccess: () => {
      toast.success('Client archivé');
      router.push('/dashboard/crm/clients');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Impossible d’archiver ce client');
    },
  });

  const createContactMutation = useCreateContact();
  const updateContactMutation = useUpdateContact();
  const deleteContactMutation = useDeleteContact();
  const setContactPrincipalMutation = useSetContactPrincipal();

  const createAddressMutation = useCreateAdresse();
  const updateAddressMutation = useUpdateAdresse();
  const deleteAddressMutation = useDeleteAdresse();
  const setAddressPrincipalMutation = useSetAdressePrincipal();

  const createInteractionMutation = useCreateInteraction();
  const updateInteractionMutation = useUpdateInteraction();
  const deleteInteractionMutation = useDeleteInteraction();

  const contactForm = useForm<ContactFormValues>({
    defaultValues: {
      clientId: customerId,
      civilite: 'M.',
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      mobile: '',
      poste: '',
      departement: '',
      type: 'COMMERCIAL',
      statut: 'ACTIF',
      principal: false,
    },
  });

  const addressForm = useForm<AddressFormValues>({
    defaultValues: {
      clientId: customerId,
      typeAdresse: 'FACTURATION',
      nomAdresse: '',
      ligne1: '',
      ligne2: '',
      ligne3: '',
      codePostal: '',
      ville: '',
      region: '',
      pays: "Cote d'Ivoire",
      coordonneesGps: '',
      informationsAcces: '',
      isPrincipal: false,
    },
  });

  const interactionForm = useForm<InteractionFormValues>({
    defaultValues: {
      clientId: customerId,
      contactId: '',
      type: 'APPEL',
      canal: 'TELEPHONE',
      sujet: '',
      description: '',
      dateInteraction: '',
      resultat: 'NEUTRE',
    },
  });

  useEffect(() => {
    if (!contactDialogOpen) return;
    contactForm.reset(
      editingContact
        ? {
            clientId: customerId,
            civilite: editingContact.civilite || 'M.',
            prenom: editingContact.prenom || '',
            nom: editingContact.nom || '',
            email: editingContact.email || '',
            telephone: editingContact.telephone || '',
            mobile: editingContact.mobile || '',
            poste: editingContact.poste || '',
            departement: editingContact.departement || '',
            type: editingContact.type || 'COMMERCIAL',
            statut: editingContact.statut || 'ACTIF',
            principal: !!editingContact.principal,
          }
        : {
            clientId: customerId,
            civilite: 'M.',
            prenom: '',
            nom: '',
            email: '',
            telephone: '',
            mobile: '',
            poste: '',
            departement: '',
            type: 'COMMERCIAL',
            statut: 'ACTIF',
            principal: false,
          }
    );
  }, [contactDialogOpen, editingContact, customerId, contactForm]);

  useEffect(() => {
    if (!addressDialogOpen) return;
    addressForm.reset(
      editingAddress
        ? {
            clientId: customerId,
            typeAdresse: editingAddress.typeAdresse || 'FACTURATION',
            nomAdresse: editingAddress.nomAdresse || '',
            ligne1: editingAddress.ligne1 || '',
            ligne2: editingAddress.ligne2 || '',
            ligne3: editingAddress.ligne3 || '',
            codePostal: editingAddress.codePostal || '',
            ville: editingAddress.ville || '',
            region: editingAddress.region || '',
            pays: editingAddress.pays || "Cote d'Ivoire",
            coordonneesGps: editingAddress.coordonneesGps || '',
            informationsAcces: editingAddress.informationsAcces || '',
            isPrincipal: !!editingAddress.isPrincipal,
          }
        : {
            clientId: customerId,
            typeAdresse: 'FACTURATION',
            nomAdresse: '',
            ligne1: '',
            ligne2: '',
            ligne3: '',
            codePostal: '',
            ville: '',
            region: '',
            pays: "Cote d'Ivoire",
            coordonneesGps: '',
            informationsAcces: '',
            isPrincipal: addresses.length === 0,
          }
    );
  }, [addressDialogOpen, editingAddress, customerId, addressForm, addresses.length]);

  useEffect(() => {
    if (!interactionDialogOpen) return;
    interactionForm.reset(
      editingInteraction
        ? {
            clientId: customerId,
            contactId: editingInteraction.contactId || '',
            type: editingInteraction.type || 'APPEL',
            canal: editingInteraction.canal || 'TELEPHONE',
            sujet: editingInteraction.sujet || '',
            description: editingInteraction.description || '',
            dateInteraction: editingInteraction.dateInteraction?.slice(0, 16) || '',
            resultat: editingInteraction.resultat || 'NEUTRE',
          }
        : {
            clientId: customerId,
            contactId: '',
            type: 'APPEL',
            canal: 'TELEPHONE',
            sujet: '',
            description: '',
            dateInteraction: new Date().toISOString().slice(0, 16),
            resultat: 'NEUTRE',
          }
    );
  }, [interactionDialogOpen, editingInteraction, customerId, interactionForm]);

  const refreshCustomer = () => {
    queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
    queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
    queryClient.invalidateQueries({ queryKey: ['crm', 'adresses'] });
    queryClient.invalidateQueries({ queryKey: ['crm', 'interactions'] });
  };

  const handleDelete = () => {
    if (confirm('Êtes-vous sûr de vouloir archiver ce client ?')) {
      archiveMutation.mutate();
    }
  };

  const submitContact = contactForm.handleSubmit(async (values) => {
    try {
      const payload = compactPayload({
        ...values,
        clientId: customerId,
      });
      if (editingContact?.id) {
        await updateContactMutation.mutateAsync({ id: editingContact.id, data: payload });
        toast.success('Contact mis à jour');
      } else {
        await createContactMutation.mutateAsync(payload);
        toast.success('Contact ajouté');
      }
      setContactDialogOpen(false);
      setEditingContact(null);
      refreshCustomer();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Impossible d’enregistrer ce contact');
    }
  });

  const submitAddress = addressForm.handleSubmit(async (values) => {
    try {
      const payload = compactPayload({
        ...values,
        clientId: customerId,
        pays: values.pays || "Cote d'Ivoire",
      });
      if (editingAddress?.id) {
        await updateAddressMutation.mutateAsync({ id: editingAddress.id, data: payload });
        toast.success('Adresse mise à jour');
      } else {
        await createAddressMutation.mutateAsync(payload);
        toast.success('Adresse ajoutée');
      }
      setAddressDialogOpen(false);
      setEditingAddress(null);
      refreshCustomer();
    } catch (error: any) {
      const message =
        error?.response?.data?.errors?.[0]?.msg ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Impossible d’enregistrer cette adresse';
      toast.error(message);
    }
  });

  const submitInteraction = interactionForm.handleSubmit(async (values) => {
    try {
      const payload = {
        ...values,
        clientId: customerId,
        contactId: values.contactId || undefined,
        dateInteraction: values.dateInteraction || new Date().toISOString(),
      };
      if (editingInteraction?.id) {
        await updateInteractionMutation.mutateAsync({ id: editingInteraction.id, data: payload });
        toast.success('Interaction mise à jour');
      } else {
        await createInteractionMutation.mutateAsync(payload);
        toast.success('Interaction enregistrée');
      }
      setInteractionDialogOpen(false);
      setEditingInteraction(null);
      refreshCustomer();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Impossible d’enregistrer cette interaction');
    }
  });
  return {
    router,
    setIsEditDialogOpen,
    setContactDialogOpen,
    setAddressDialogOpen,
    setInteractionDialogOpen,
    setEditingContact,
    setEditingAddress,
    setEditingInteraction,
    canUpdate,
    canDelete,
    canManageContacts,
    canManageAddresses,
    canManageInteractions,
    isLoading,
    customer,
    isLoadingContacts,
    isLoadingAddresses,
    isLoadingInteractions,
    contacts,
    addresses,
    interactions,
    archiveMutation,
    deleteContactMutation,
    setContactPrincipalMutation,
    deleteAddressMutation,
    setAddressPrincipalMutation,
    deleteInteractionMutation,
    refreshCustomer,
    handleDelete,
    isEditDialogOpen,
    contactDialogOpen,
    addressDialogOpen,
    interactionDialogOpen,
    editingContact,
    editingAddress,
    editingInteraction,
    contactForm,
    addressForm,
    interactionForm,
    submitContact,
    submitAddress,
    submitInteraction,
  };
}

export type CustomerDetailModel = ReturnType<typeof useCustomerDetail>;
