'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import CustomerForm from '@/components/customers/CustomerForm';
import {
  useAdresses,
  useContacts,
  useCreateAdresse,
  useCreateContact,
  useCreateInteraction,
  useDeleteAdresse,
  useDeleteContact,
  useDeleteInteraction,
  useInteractions,
  useSetAdressePrincipal,
  useSetContactPrincipal,
  useUpdateAdresse,
  useUpdateContact,
  useUpdateInteraction,
} from '@/hooks/useCrm';
import { crmService, type Address, type Client, type Contact, type Interaction } from '@/shared/api/crm';
import { getCrudVisibility } from '@/shared/action-visibility';
import { useAuth } from '@/shared/hooks/useAuth';
import { hasPermission } from '@/shared/permissions';

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

const CONTACT_TYPES = ['COMMERCIAL', 'TECHNIQUE', 'COMPTABLE', 'DIRECTION', 'SUPPORT', 'AUTRE'];
const CONTACT_STATUSES = ['ACTIF', 'INACTIF', 'PARTI'];
const ADDRESS_TYPES = ['FACTURATION', 'LIVRAISON', 'SIEGE_SOCIAL', 'ETABLISSEMENT', 'CORRESPONDANCE'];
const INTERACTION_TYPES = ['APPEL', 'EMAIL', 'REUNION', 'VISITE', 'SUPPORT', 'COMMERCIAL', 'TECHNIQUE'];
const INTERACTION_CHANNELS = ['TELEPHONE', 'EMAIL', 'EN_PERSONNE', 'VIDEO', 'CHAT', 'PORTAL_CLIENT', 'MOBILE'];
const INTERACTION_RESULTS = ['POSITIF', 'NEUTRE', 'NEGATIF', 'A_SUIVRE', 'A_RELANCER', 'TERMINE'];

const formatAddress = (address: Address) =>
  [
    address.nomAdresse,
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

const compactPayload = <T extends Record<string, any>>(payload: T): T =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ) as T;

export default function CustomerDetailPage() {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIF':
        return <Badge variant="success">Actif</Badge>;
      case 'PROSPECT':
        return <Badge variant="warning">Prospect</Badge>;
      case 'INACTIF':
        return <Badge variant="secondary">Inactif</Badge>;
      case 'ARCHIVE':
        return <Badge variant="outline">Archivé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="py-12 text-center text-gray-500 dark:text-gray-400">
        Client non trouvé
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{customer.nom}</h1>
            {getStatusBadge(customer.status)}
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Référence: {customer.reference} | ID: {customer.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Retour
          </Button>
          {canUpdate && (
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              Modifier
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={archiveMutation.isPending}
              className="text-red-600 hover:text-red-700"
            >
              Archiver
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="addresses">Adresses</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Informations générales</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Nom / Raison sociale</label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {customer.nom} {customer.raisonSociale ? `(${customer.raisonSociale})` : ''}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Type de client</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.typeClient?.libelle || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Telephone</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.telephone || customer.mobile || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Site web</label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {customer.siteWeb ? (
                    <a href={customer.siteWeb} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {customer.siteWeb}
                    </a>
                  ) : (
                    '-'
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Priorite</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.priorite}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">IDU</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.idu || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">NCC</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.ncc || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">RCCM</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.rccm || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Code activite</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.codeActivite || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Fax</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.fax || '-'}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Statistiques</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-xs text-gray-500">Contacts</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
                <p className="text-2xl font-bold">{addresses.length}</p>
                <p className="text-xs text-gray-500">Adresses</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
                <p className="text-2xl font-bold">{interactions.length}</p>
                <p className="text-xs text-gray-500">Interactions</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
                <p className="text-2xl font-bold">{customer._count?.opportunites || 0}</p>
                <p className="text-xs text-gray-500">Opportunités</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Contacts ({contacts.length})</h3>
              {canManageContacts && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingContact(null);
                    setContactDialogOpen(true);
                  }}
                >
                  Ajouter un contact
                </Button>
              )}
            </div>
            {isLoadingContacts ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : contacts.length > 0 ? (
              <div className="space-y-4">
                {contacts.map((contact) => (
                  <div key={contact.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {contact.prenom} {contact.nom}{' '}
                          {contact.principal && <Badge className="ml-2">Principal</Badge>}
                        </p>
                        <p className="text-sm text-gray-500">{contact.poste || 'Poste non renseigné'}</p>
                        <p className="text-sm text-gray-500">{contact.email || 'Email non renseigné'}</p>
                        <p className="text-sm text-gray-500">{contact.mobile || contact.telephone || 'Aucun téléphone'}</p>
                      </div>
                      {canManageContacts && (
                        <div className="flex flex-wrap gap-2">
                          {!contact.principal && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setContactPrincipalMutation.mutate(
                                  { id: contact.id, principal: true },
                                  {
                                    onSuccess: () => {
                                      toast.success('Contact principal mis à jour');
                                      refreshCustomer();
                                    },
                                    onError: () => toast.error('Impossible de définir ce contact comme principal'),
                                  }
                                )
                              }
                            >
                              Définir principal
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingContact(contact);
                              setContactDialogOpen(true);
                            }}
                          >
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              if (confirm(`Supprimer le contact ${contact.prenom} ${contact.nom} ?`)) {
                                deleteContactMutation.mutate(contact.id, {
                                  onSuccess: () => {
                                    toast.success('Contact supprimé');
                                    refreshCustomer();
                                  },
                                  onError: () => toast.error('Impossible de supprimer ce contact'),
                                });
                              }
                            }}
                          >
                            Supprimer
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">Aucun contact enregistré</div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="addresses">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Adresses ({addresses.length})</h3>
              {canManageAddresses && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingAddress(null);
                    setAddressDialogOpen(true);
                  }}
                >
                  Ajouter une adresse CI
                </Button>
              )}
            </div>
            {isLoadingAddresses ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : addresses.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {addresses.map((address) => (
                  <div key={address.id} className="relative rounded-lg border p-4">
                    {address.isPrincipal && (
                      <Badge className="absolute right-4 top-4" variant="success">
                        Principale
                      </Badge>
                    )}
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{address.typeAdresse}</p>
                    <p className="mt-2 font-medium text-gray-900 dark:text-white">{address.nomAdresse || 'Adresse client'}</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{formatAddress(address)}</p>
                    {(address.coordonneesGps || address.informationsAcces) && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {[address.coordonneesGps, address.informationsAcces].filter(Boolean).join(' | ')}
                      </p>
                    )}
                    {canManageAddresses && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {!address.isPrincipal && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setAddressPrincipalMutation.mutate(address.id as string, {
                                onSuccess: () => {
                                  toast.success('Adresse principale mise à jour');
                                  refreshCustomer();
                                },
                                onError: () => toast.error('Impossible de définir cette adresse comme principale'),
                              })
                            }
                          >
                            Définir principale
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingAddress(address);
                            setAddressDialogOpen(true);
                          }}
                        >
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            if (confirm('Supprimer cette adresse ?')) {
                              deleteAddressMutation.mutate(address.id as string, {
                                onSuccess: () => {
                                  toast.success('Adresse supprimée');
                                  refreshCustomer();
                                },
                                onError: () => toast.error('Impossible de supprimer cette adresse'),
                              });
                            }
                          }}
                        >
                          Supprimer
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">Aucune adresse enregistrée</div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="interactions">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Interactions ({interactions.length})</h3>
              {canManageInteractions && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingInteraction(null);
                    setInteractionDialogOpen(true);
                  }}
                >
                  Nouvelle interaction
                </Button>
              )}
            </div>
            {isLoadingInteractions ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : interactions.length > 0 ? (
              <div className="space-y-4">
                {interactions.map((interaction) => (
                  <div key={interaction.id} className="rounded-lg border-l-4 border-blue-500 bg-gray-50 p-4 dark:bg-gray-800">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{interaction.sujet}</p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{interaction.description || 'Aucune description'}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="outline">{interaction.type}</Badge>
                          <Badge variant="outline">{interaction.canal}</Badge>
                          {interaction.resultat && <Badge variant="outline">{interaction.resultat}</Badge>}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        {new Date(interaction.dateInteraction).toLocaleString('fr-FR')}
                      </div>
                    </div>
                    {canManageInteractions && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingInteraction(interaction);
                            setInteractionDialogOpen(true);
                          }}
                        >
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            if (confirm(`Supprimer l’interaction ${interaction.sujet} ?`)) {
                              deleteInteractionMutation.mutate(interaction.id, {
                                onSuccess: () => {
                                  toast.success('Interaction supprimée');
                                  refreshCustomer();
                                },
                                onError: () => toast.error('Impossible de supprimer cette interaction'),
                              });
                            }
                          }}
                        >
                          Supprimer
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">Aucune interaction enregistrée</div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {canUpdate && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le client</DialogTitle>
              <DialogDescription>Mettez à jour les informations du client.</DialogDescription>
            </DialogHeader>
            <CustomerForm
              customer={customer}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                refreshCustomer();
              }}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Modifier le contact' : 'Ajouter un contact'}</DialogTitle>
            <DialogDescription>Ce contact sera rattaché au client CRM courant.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitContact} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Prénom</label>
                <Input {...contactForm.register('prenom', { required: true })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Nom</label>
                <Input {...contactForm.register('nom', { required: true })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <Input type="email" {...contactForm.register('email')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Téléphone</label>
                <Input {...contactForm.register('telephone')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Mobile</label>
                <Input {...contactForm.register('mobile')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Poste</label>
                <Input {...contactForm.register('poste')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Département</label>
                <Input {...contactForm.register('departement')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <select {...contactForm.register('type')} className="w-full rounded-md border px-3 py-2">
                  {CONTACT_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Statut</label>
                <select {...contactForm.register('statut')} className="w-full rounded-md border px-3 py-2">
                  {CONTACT_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...contactForm.register('principal')} />
              Définir comme contact principal
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setContactDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">{editingContact ? 'Enregistrer' : 'Créer'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingAddress ? "Modifier l'adresse" : 'Ajouter une adresse CI'}</DialogTitle>
            <DialogDescription>On capture ici une adresse</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitAddress} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Nom de l'adresse</label>
                <Input {...addressForm.register('nomAdresse')} placeholder="Siege social, depot Vridi..." />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <select {...addressForm.register('typeAdresse')} className="w-full rounded-md border px-3 py-2">
                  {ADDRESS_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Quartier</label>
                <Input {...addressForm.register('ligne1', { required: true })} placeholder="Ex: Angre 7e tranche" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Rue / residence</label>
                <Input {...addressForm.register('ligne2')} placeholder="Ex: Rue L125, Residence Soleil" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Repere visuel</label>
                <Input {...addressForm.register('ligne3')} placeholder="Ex: Non loin de la pharmacie" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Boite postale (BP)</label>
                <Input {...addressForm.register('codePostal')} placeholder="Ex: 01 BP 456" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Commune / ville</label>
                <Input {...addressForm.register('ville', { required: true })} placeholder="Ex: Cocody" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">District</label>
                <Input {...addressForm.register('region')} placeholder="Ex: District d'Abidjan" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Pays</label>
                <Input {...addressForm.register('pays', { required: true })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Coordonnees GPS</label>
                <Input {...addressForm.register('coordonneesGps')} placeholder="Ex: 5.348,-4.030" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Infos d'acces</label>
                <Input {...addressForm.register('informationsAcces')} placeholder="Ex: Pres de l'allocodrome, portail gris" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...addressForm.register('isPrincipal')} />
              Définir comme adresse principale
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddressDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">{editingAddress ? 'Enregistrer' : 'Créer'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={interactionDialogOpen} onOpenChange={setInteractionDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingInteraction ? 'Modifier l’interaction' : 'Nouvelle interaction'}</DialogTitle>
            <DialogDescription>Historisez les échanges avec ce client.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitInteraction} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Sujet</label>
                <Input {...interactionForm.register('sujet', { required: true })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Date</label>
                <Input type="datetime-local" {...interactionForm.register('dateInteraction')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <select {...interactionForm.register('type')} className="w-full rounded-md border px-3 py-2">
                  {INTERACTION_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Canal</label>
                <select {...interactionForm.register('canal')} className="w-full rounded-md border px-3 py-2">
                  {INTERACTION_CHANNELS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Contact lié</label>
                <select {...interactionForm.register('contactId')} className="w-full rounded-md border px-3 py-2">
                  <option value="">Aucun contact</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.prenom} {contact.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Résultat</label>
                <select {...interactionForm.register('resultat')} className="w-full rounded-md border px-3 py-2">
                  {INTERACTION_RESULTS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Description</label>
                <Textarea rows={4} {...interactionForm.register('description')} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setInteractionDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">{editingInteraction ? 'Enregistrer' : 'Créer'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
