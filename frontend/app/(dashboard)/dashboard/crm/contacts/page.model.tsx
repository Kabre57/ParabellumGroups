'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useClients,
} from '@/hooks/useCrm';
import { Client, Contact } from '@/shared/api/crm/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  PhoneCall,
  Users,
  Mail,
  Building2,
  Search,
  Filter,
  UserPlus,
  Edit,
  Trash2,
  Star,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';

// État, chargement et actions du parcours d'interface.


export const TYPE_OPTIONS = [
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'TECHNIQUE', label: 'Technique' },
  { value: 'COMPTABLE', label: 'Comptable' },
  { value: 'DIRECTION', label: 'Direction' },
  { value: 'SUPPORT', label: 'Support' },
  { value: 'AUTRE', label: 'Autre' },
];



export const STATUT_OPTIONS = [
  { value: 'ACTIF', label: 'Actif' },
  { value: 'INACTIF', label: 'Inactif' },
  { value: 'PARTI', label: 'Parti' },
];



export const CIVILITE_OPTIONS = [
  { value: 'M.', label: 'M.' },
  { value: 'Mme', label: 'Mme' },
  { value: 'Mlle', label: 'Mlle' },
];



export interface ContactFormValues {
  clientId: string;
  civilite?: string;
  prenom: string;
  nom: string;
  email?: string;
  emailSecondaire?: string;
  telephone?: string;
  mobile?: string;
  poste?: string;
  departement?: string;
  type: string;
  statut: string;
  principal: boolean;
}



export function normalizeOptionalField(value?: string) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function useContactsPageModel() {

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statutFilter, setStatutFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const { canCreate, canUpdate, canDelete } = getCrudVisibility(user, {
    read: ['customers.read', 'customers.read_all', 'customers.read_assigned', 'customers.read_own', 'customers.read_team'],
    create: ['customers.manage_contacts', 'customers.update'],
    update: ['customers.manage_contacts', 'customers.update'],
    remove: ['customers.manage_contacts', 'customers.delete'],
  });

  const { data: contacts = [], isLoading } = useContacts({ pageSize: 200 });
  const { data: clients = [] } = useClients({ pageSize: 200 });

  const contactsArray: Contact[] = Array.isArray(contacts) ? (contacts as Contact[]) : [];
  const clientsArray: Client[] = Array.isArray(clients)
    ? (clients as Client[])
    : ((clients as any)?.data || []);

  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();
  const deleteMutation = useDeleteContact();

  const clientMap = useMemo(() => {
    const entries: Array<[string, Client]> = clientsArray.map((c): [string, Client] => [c.id, c]);
    return new Map(entries);
  }, [clientsArray]);

  const filteredContacts = useMemo(() => {
    return contactsArray.filter((contact: Contact) => {
      const client = clientMap.get(contact.clientId);
      const clientName = client?.nom || '';
      const matchesSearch =
        contact.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.telephone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || contact.type === typeFilter;
      const matchesStatut = statutFilter === 'all' || contact.statut === statutFilter;

      return matchesSearch && matchesType && matchesStatut;
    });
  }, [contactsArray, clientMap, searchTerm, typeFilter, statutFilter]);

  const stats = useMemo(() => {
    const total = contactsArray.length;
    const actifs = contactsArray.filter((c: Contact) => c.statut === 'ACTIF').length;
    const inactifs = contactsArray.filter((c: Contact) => c.statut === 'INACTIF').length;
    const principaux = contactsArray.filter((c: Contact) => c.principal).length;
    return { total, actifs, inactifs, principaux };
  }, [contactsArray]);

  const getStatutBadge = (statut: string) => {
    if (statut === 'ACTIF') return { label: 'Actif', className: 'bg-green-500' };
    if (statut === 'INACTIF') return { label: 'Inactif', className: 'bg-gray-500' };
    return { label: statut, className: 'bg-amber-500' };
  };

  const openCreate = () => {
    setEditingContact(null);
    setDialogOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditingContact(contact);
    setDialogOpen(true);
  };

  const handleDelete = (contact: Contact) => {
    if (confirm(`Supprimer le contact ${contact.prenom} ${contact.nom} ?`)) {
      deleteMutation.mutate(contact.id, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
        },
      });
    }
  };

  const form = useForm<ContactFormValues>({
    defaultValues: {
      clientId: '',
      civilite: 'M.',
      prenom: '',
      nom: '',
      email: '',
      emailSecondaire: '',
      telephone: '',
      mobile: '',
      poste: '',
      departement: '',
      type: 'COMMERCIAL',
      statut: 'ACTIF',
      principal: false,
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingContact) {
      form.reset({
        clientId: editingContact.clientId || '',
        civilite: editingContact.civilite || 'M.',
        prenom: editingContact.prenom || '',
        nom: editingContact.nom || '',
        email: editingContact.email || '',
        emailSecondaire: (editingContact as any).emailSecondaire || '',
        telephone: editingContact.telephone || '',
        mobile: editingContact.mobile || '',
        poste: editingContact.poste || '',
        departement: editingContact.departement || '',
        type: editingContact.type || 'COMMERCIAL',
        statut: editingContact.statut || 'ACTIF',
        principal: !!editingContact.principal,
      });
    } else {
      form.reset({
        clientId: '',
        civilite: 'M.',
        prenom: '',
        nom: '',
        email: '',
        emailSecondaire: '',
        telephone: '',
        mobile: '',
        poste: '',
        departement: '',
        type: 'COMMERCIAL',
        statut: 'ACTIF',
        principal: false,
      });
    }
  }, [dialogOpen, editingContact, form]);

  const onSubmit = async (values: ContactFormValues) => {
    const payload = {
      ...values,
      civilite: normalizeOptionalField(values.civilite),
      prenom: values.prenom.trim(),
      nom: values.nom.trim(),
      email: normalizeOptionalField(values.email),
      emailSecondaire: normalizeOptionalField(values.emailSecondaire),
      telephone: normalizeOptionalField(values.telephone),
      mobile: normalizeOptionalField(values.mobile),
      poste: normalizeOptionalField(values.poste),
      departement: normalizeOptionalField(values.departement),
    };

    try {
      if (editingContact) {
        await updateMutation.mutateAsync({ id: editingContact.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
      setDialogOpen(false);
      setEditingContact(null);
    } catch (error) {
      console.error('Erreur contact:', error);
    }
  };
  return {
    user,
    queryClient,
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    statutFilter,
    setStatutFilter,
    dialogOpen,
    setDialogOpen,
    editingContact,
    setEditingContact,
    canCreate,
    canUpdate,
    canDelete,
    contacts,
    isLoading,
    clients,
    contactsArray,
    clientsArray,
    createMutation,
    updateMutation,
    deleteMutation,
    clientMap,
    filteredContacts,
    stats,
    getStatutBadge,
    openCreate,
    openEdit,
    handleDelete,
    form,
    onSubmit,
  };
}
