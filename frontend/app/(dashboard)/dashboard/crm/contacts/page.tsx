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

const TYPE_OPTIONS = [
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'TECHNIQUE', label: 'Technique' },
  { value: 'COMPTABLE', label: 'Comptable' },
  { value: 'DIRECTION', label: 'Direction' },
  { value: 'SUPPORT', label: 'Support' },
  { value: 'AUTRE', label: 'Autre' },
];

const STATUT_OPTIONS = [
  { value: 'ACTIF', label: 'Actif' },
  { value: 'INACTIF', label: 'Inactif' },
  { value: 'PARTI', label: 'Parti' },
];

const CIVILITE_OPTIONS = [
  { value: 'M.', label: 'M.' },
  { value: 'Mme', label: 'Mme' },
  { value: 'Mlle', label: 'Mlle' },
];

interface ContactFormValues {
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

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statutFilter, setStatutFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

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
    const entries = clientsArray.map((c) => [c.id, c]);
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
    try {
      if (editingContact) {
        await updateMutation.mutateAsync({ id: editingContact.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }

      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
      setDialogOpen(false);
      setEditingContact(null);
    } catch (error) {
      console.error('Erreur contact:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contacts Clients</h1>
        <p className="text-muted-foreground">Gerez votre annuaire de contacts professionnels</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Dans votre annuaire</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.actifs}</div>
            <p className="text-xs text-muted-foreground">Contacts actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactifs</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactifs}</div>
            <p className="text-xs text-muted-foreground">Contacts inactifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Principaux</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.principaux}</div>
            <p className="text-xs text-muted-foreground">Contacts principaux</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Annuaire de Contacts</CardTitle>
          <CardDescription>Liste complete de vos contacts professionnels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, entreprise, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Tous types</option>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select
                value={statutFilter}
                onChange={(e) => setStatutFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Tous statuts</option>
                {STATUT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <Button onClick={openCreate}>
              <UserPlus className="mr-2 h-4 w-4" />
              Nouveau Contact
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Spinner />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Nom</th>
                    <th className="text-left p-4 font-medium">Client</th>
                    <th className="text-left p-4 font-medium">Poste</th>
                    <th className="text-left p-4 font-medium">Contact</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">Statut</th>
                    <th className="text-left p-4 font-medium">Principal</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact) => {
                    const statutBadge = getStatutBadge(contact.statut);
                    const client = clientMap.get(contact.clientId);

                    return (
                      <tr key={contact.id} className="border-t hover:bg-muted/50">
                        <td className="p-4 font-medium">
                          {contact.civilite ? `${contact.civilite} ` : ''}{contact.prenom} {contact.nom}
                        </td>
                        <td className="p-4">
                          {client?.nom || contact.clientId}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {contact.poste || '-'}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1 text-sm">
                            {contact.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </span>
                            )}
                            {(contact.telephone || contact.mobile) && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <PhoneCall className="h-3 w-3" />
                                {contact.telephone || contact.mobile}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          {TYPE_OPTIONS.find((t) => t.value === contact.type)?.label || contact.type}
                        </td>
                        <td className="p-4">
                          <Badge className={statutBadge.className}>{statutBadge.label}</Badge>
                        </td>
                        <td className="p-4">
                          {contact.principal ? (
                            <Badge variant="secondary">Oui</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(contact)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Modifier
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleDelete(contact)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {!isLoading && filteredContacts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucun contact trouve
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Modifier le contact' : 'Nouveau contact'}
            </DialogTitle>
            <DialogDescription>
              {editingContact ? 'Mettez a jour les informations du contact.' : 'Ajoutez un nouveau contact client.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client *</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  {...form.register('clientId', { required: true })}
                >
                  <option value="">Selectionner un client</option>
                  {clientsArray.map((client) => (
                    <option key={client.id} value={client.id}>{client.nom}</option>
                  ))}
                </select>
                {form.formState.errors.clientId && (
                  <p className="text-xs text-red-600">Client requis</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Civilite</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  {...form.register('civilite')}
                >
                  {CIVILITE_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Prenom *</label>
                <Input {...form.register('prenom', { required: true })} />
                {form.formState.errors.prenom && (
                  <p className="text-xs text-red-600">Prenom requis</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nom *</label>
                <Input {...form.register('nom', { required: true })} />
                {form.formState.errors.nom && (
                  <p className="text-xs text-red-600">Nom requis</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input type="email" {...form.register('email')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email secondaire</label>
                <Input type="email" {...form.register('emailSecondaire')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Telephone</label>
                <Input {...form.register('telephone')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mobile</label>
                <Input {...form.register('mobile')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Poste</label>
                <Input {...form.register('poste')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Departement</label>
                <Input {...form.register('departement')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('type')}>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Statut *</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('statut')}>
                  {STATUT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" {...form.register('principal')} />
                <span className="text-sm">Contact principal</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingContact ? 'Mettre a jour' : 'Creer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
