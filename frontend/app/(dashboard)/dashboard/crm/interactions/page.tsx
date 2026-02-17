'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useInteractions,
  useCreateInteraction,
  useUpdateInteraction,
  useDeleteInteraction,
  useClients,
  useContacts,
} from '@/hooks/useCrm';
import { Client, Contact, Interaction } from '@/shared/api/crm/types';
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
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';

const TYPE_OPTIONS = [
  'APPEL',
  'EMAIL',
  'REUNION',
  'VISITE',
  'SUPPORT',
  'COMMERCIAL',
  'TECHNIQUE',
  'FORMATION',
  'DEMONSTRATION',
  'PRESENTATION',
  'NEGOCIATION',
];

const CANAL_OPTIONS = [
  'TELEPHONE',
  'EMAIL',
  'EN_PERSONNE',
  'VIDEO',
  'CHAT',
  'RESEAUX_SOCIAUX',
  'PORTAL_CLIENT',
  'MOBILE',
];

const RESULTAT_OPTIONS = [
  'POSITIF',
  'NEUTRE',
  'NEGATIF',
  'A_RELANCER',
  'A_SUIVRE',
  'TERMINE',
  'REPORTE',
  'ANNULE',
];

interface InteractionFormValues {
  clientId: string;
  contactId?: string;
  type: string;
  canal: string;
  sujet: string;
  description?: string;
  dateSuivie?: string;
  dateInteraction?: string;
  dureeMinutes?: string;
  resultat?: string;
  actionRequise?: string;
  confidential?: boolean;
}

export default function InteractionsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);

  const { data: interactions = [], isLoading } = useInteractions({ page: 1, limit: 200 });
  const { data: clients = [] } = useClients({ pageSize: 200 });
  const { data: contacts = [] } = useContacts({ pageSize: 200 });

  const interactionsArray: Interaction[] = Array.isArray(interactions)
    ? (interactions as Interaction[])
    : ((interactions as any)?.data || []);
  const clientsArray: Client[] = Array.isArray(clients)
    ? (clients as Client[])
    : ((clients as any)?.data || []);
  const contactsArray: Contact[] = Array.isArray(contacts)
    ? (contacts as Contact[])
    : ((contacts as any)?.data || []);

  const createMutation = useCreateInteraction();
  const updateMutation = useUpdateInteraction();
  const deleteMutation = useDeleteInteraction();

  const clientMap = useMemo(() => {
    const entries = clientsArray.map((c) => [c.id, c]);
    return new Map(entries);
  }, [clientsArray]);

  const contactMap = useMemo(() => {
    const entries = contactsArray.map((c) => [c.id, c]);
    return new Map(entries);
  }, [contactsArray]);

  const filteredInteractions = useMemo(() => {
    return interactionsArray.filter((interaction: Interaction) => {
      const client = clientMap.get(interaction.clientId);
      const contact = interaction.contactId ? contactMap.get(interaction.contactId) : null;
      const clientName = client?.nom || '';
      const contactName = contact ? `${contact.prenom} ${contact.nom}` : '';
      const matchesSearch =
        interaction.sujet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (interaction.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contactName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || interaction.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [interactionsArray, clientMap, contactMap, searchTerm, typeFilter]);

  const form = useForm<InteractionFormValues>({
    defaultValues: {
      clientId: '',
      contactId: '',
      type: 'APPEL',
      canal: 'TELEPHONE',
      sujet: '',
      description: '',
      dateInteraction: '',
      dateSuivie: '',
      dureeMinutes: '',
      resultat: 'NEUTRE',
      actionRequise: '',
      confidential: false,
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingInteraction) {
      form.reset({
        clientId: editingInteraction.clientId || '',
        contactId: editingInteraction.contactId || '',
        type: editingInteraction.type || 'APPEL',
        canal: editingInteraction.canal || 'TELEPHONE',
        sujet: editingInteraction.sujet || '',
        description: editingInteraction.description || '',
        dateInteraction: editingInteraction.dateInteraction || '',
        dateSuivie: (editingInteraction as any).dateSuivie || '',
        dureeMinutes: (editingInteraction as any).dureeMinutes ? String((editingInteraction as any).dureeMinutes) : '',
        resultat: editingInteraction.resultat || 'NEUTRE',
        actionRequise: (editingInteraction as any).actionRequise || '',
        confidential: !!(editingInteraction as any).confidential,
      });
    } else {
      form.reset({
        clientId: '',
        contactId: '',
        type: 'APPEL',
        canal: 'TELEPHONE',
        sujet: '',
        description: '',
        dateInteraction: '',
        dateSuivie: '',
        dureeMinutes: '',
        resultat: 'NEUTRE',
        actionRequise: '',
        confidential: false,
      });
    }
  }, [dialogOpen, editingInteraction, form]);

  const openCreate = () => {
    setEditingInteraction(null);
    setDialogOpen(true);
  };

  const openEdit = (interaction: Interaction) => {
    setEditingInteraction(interaction);
    setDialogOpen(true);
  };

  const handleDelete = (interaction: Interaction) => {
    if (confirm(`Supprimer l'interaction ${interaction.sujet} ?`)) {
      deleteMutation.mutate(interaction.id, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['crm', 'interactions'] });
        },
      });
    }
  };

  const onSubmit = async (values: InteractionFormValues) => {
    try {
      const payload = {
        ...values,
        contactId: values.contactId || undefined,
        dureeMinutes: values.dureeMinutes ? Number(values.dureeMinutes) : undefined,
      };
      if (editingInteraction) {
        await updateMutation.mutateAsync({ id: editingInteraction.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      queryClient.invalidateQueries({ queryKey: ['crm', 'interactions'] });
      setDialogOpen(false);
      setEditingInteraction(null);
    } catch (error) {
      console.error('Erreur interaction:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Interactions</h1>
        <p className="text-muted-foreground">Historique des interactions clients</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des interactions</CardTitle>
          <CardDescription>Rechercher, modifier et supprimer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
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
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle interaction
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
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Client</th>
                    <th className="text-left p-4 font-medium">Contact</th>
                    <th className="text-left p-4 font-medium">Sujet</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">Canal</th>
                    <th className="text-left p-4 font-medium">Resultat</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInteractions.map((interaction) => {
                    const client = clientMap.get(interaction.clientId);
                    const contact = interaction.contactId ? contactMap.get(interaction.contactId) : null;

                    return (
                      <tr key={interaction.id} className="border-t hover:bg-muted/50">
                        <td className="p-4">
                          {interaction.dateInteraction ? new Date(interaction.dateInteraction).toLocaleString('fr-FR') : '--'}
                        </td>
                        <td className="p-4">{client?.nom || 'Client inconnu'}</td>
                        <td className="p-4">
                          {contact ? `${contact.prenom} ${contact.nom}` : '--'}
                        </td>
                        <td className="p-4">{interaction.sujet}</td>
                        <td className="p-4">
                          <Badge variant="outline">{interaction.type}</Badge>
                        </td>
                        <td className="p-4">{interaction.canal}</td>
                        <td className="p-4">
                          <Badge className="bg-muted">{interaction.resultat || 'NEUTRE'}</Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(interaction)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleDelete(interaction)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredInteractions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        Aucune interaction trouvee
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingInteraction ? 'Modifier interaction' : 'Nouvelle interaction'}
            </DialogTitle>
            <DialogDescription>
              {editingInteraction ? 'Mettez a jour les details de l interaction.' : 'Enregistrez une nouvelle interaction client.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client *</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('clientId', { required: true })}>
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
                <label className="block text-sm font-medium mb-1">Contact</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('contactId')}>
                  <option value="">Selectionner un contact</option>
                  {contactsArray.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.prenom} {contact.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('type')}>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Canal *</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('canal')}>
                  {CANAL_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sujet *</label>
                <Input {...form.register('sujet', { required: true })} />
                {form.formState.errors.sujet && (
                  <p className="text-xs text-red-600">Sujet requis</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date interaction</label>
                <Input type="datetime-local" {...form.register('dateInteraction')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date de suivi</label>
                <Input type="datetime-local" {...form.register('dateSuivie')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Duree (minutes)</label>
                <Input type="number" min="1" {...form.register('dureeMinutes')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Resultat</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('resultat')}>
                  {RESULTAT_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" {...form.register('confidential')} />
                <span className="text-sm">Confidentiel</span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Action requise</label>
                <Input {...form.register('actionRequise')} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea className="w-full px-3 py-2 border rounded-md" rows={3} {...form.register('description')} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingInteraction ? 'Mettre a jour' : 'Creer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
