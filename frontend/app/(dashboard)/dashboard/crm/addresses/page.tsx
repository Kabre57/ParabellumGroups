'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAdresses,
  useCreateAdresse,
  useUpdateAdresse,
  useDeleteAdresse,
  useSetAdressePrincipal,
  useClients,
} from '@/hooks/useCrm';
import { Address, Client } from '@/shared/api/crm/types';
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
import { Search, Filter, Plus, Edit, Trash2, Star } from 'lucide-react';
import { useForm } from 'react-hook-form';

const TYPE_OPTIONS = [
  'FACTURATION',
  'LIVRAISON',
  'SIEGE_SOCIAL',
  'ETABLISSEMENT',
  'CORRESPONDANCE',
];

interface AddressFormValues {
  clientId: string;
  typeAdresse: string;
  nomAdresse?: string;
  ligne1: string;
  ligne2?: string;
  ligne3?: string;
  codePostal: string;
  ville: string;
  region?: string;
  pays: string;
  isPrincipal: boolean;
}

export default function AddressesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const { data: adresses = [], isLoading } = useAdresses({ page: 1, limit: 200 });
  const { data: clients = [] } = useClients({ pageSize: 200 });

  const adressesArray: Address[] = Array.isArray(adresses)
    ? (adresses as Address[])
    : ((adresses as any)?.data || []);
  const clientsArray: Client[] = Array.isArray(clients)
    ? (clients as Client[])
    : ((clients as any)?.data || []);

  const createMutation = useCreateAdresse();
  const updateMutation = useUpdateAdresse();
  const deleteMutation = useDeleteAdresse();
  const setPrincipalMutation = useSetAdressePrincipal();

  const clientMap = useMemo(() => {
    const entries = clientsArray.map((c) => [c.id, c]);
    return new Map(entries);
  }, [clientsArray]);

  const filteredAddresses = useMemo(() => {
    return adressesArray.filter((adresse: Address) => {
      const client = clientMap.get(adresse.clientId || '');
      const clientName = client?.nom || '';
      const matchesSearch =
        (adresse.nomAdresse || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adresse.ligne1 || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adresse.ville || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || adresse.typeAdresse === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [adressesArray, clientMap, searchTerm, typeFilter]);

  const form = useForm<AddressFormValues>({
    defaultValues: {
      clientId: '',
      typeAdresse: 'FACTURATION',
      nomAdresse: '',
      ligne1: '',
      ligne2: '',
      ligne3: '',
      codePostal: '',
      ville: '',
      region: '',
      pays: 'Cote d Ivoire',
      isPrincipal: false,
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingAddress) {
      form.reset({
        clientId: editingAddress.clientId || '',
        typeAdresse: editingAddress.typeAdresse || 'FACTURATION',
        nomAdresse: editingAddress.nomAdresse || '',
        ligne1: editingAddress.ligne1 || '',
        ligne2: editingAddress.ligne2 || '',
        ligne3: editingAddress.ligne3 || '',
        codePostal: editingAddress.codePostal || '',
        ville: editingAddress.ville || '',
        region: editingAddress.region || '',
        pays: editingAddress.pays || 'Cote d Ivoire',
        isPrincipal: !!editingAddress.isPrincipal,
      });
    } else {
      form.reset({
        clientId: '',
        typeAdresse: 'FACTURATION',
        nomAdresse: '',
        ligne1: '',
        ligne2: '',
        ligne3: '',
        codePostal: '',
        ville: '',
        region: '',
        pays: 'Cote d Ivoire',
        isPrincipal: false,
      });
    }
  }, [dialogOpen, editingAddress, form]);

  const openCreate = () => {
    setEditingAddress(null);
    setDialogOpen(true);
  };

  const openEdit = (adresse: Address) => {
    setEditingAddress(adresse);
    setDialogOpen(true);
  };

  const handleDelete = (adresse: Address) => {
    if (confirm('Supprimer cette adresse ?')) {
      deleteMutation.mutate(adresse.id as string, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['crm', 'adresses'] });
        },
      });
    }
  };

  const handleSetPrincipal = (adresse: Address) => {
    if (!adresse.id) return;
    setPrincipalMutation.mutate(adresse.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['crm', 'adresses'] });
      },
    });
  };

  const onSubmit = async (values: AddressFormValues) => {
    try {
      if (editingAddress?.id) {
        await updateMutation.mutateAsync({ id: editingAddress.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }

      queryClient.invalidateQueries({ queryKey: ['crm', 'adresses'] });
      setDialogOpen(false);
      setEditingAddress(null);
    } catch (error) {
      console.error('Erreur adresse:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Adresses Clients</h1>
        <p className="text-muted-foreground">Gerez les adresses de vos clients</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des adresses</CardTitle>
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
              Nouvelle adresse
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
                    <th className="text-left p-4 font-medium">Client</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">Adresse</th>
                    <th className="text-left p-4 font-medium">Ville</th>
                    <th className="text-left p-4 font-medium">Pays</th>
                    <th className="text-left p-4 font-medium">Principal</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAddresses.map((adresse) => (
                    <tr key={adresse.id} className="border-t hover:bg-muted/50">
                      <td className="p-4">{clientMap.get(adresse.clientId || '')?.nom || '-'}</td>
                      <td className="p-4">
                        <Badge variant="outline">{adresse.typeAdresse}</Badge>
                      </td>
                      <td className="p-4">{adresse.ligne1}</td>
                      <td className="p-4">{adresse.ville}</td>
                      <td className="p-4">{adresse.pays}</td>
                      <td className="p-4">
                        {adresse.isPrincipal ? (
                          <Badge className="bg-green-100 text-green-800">Oui</Badge>
                        ) : (
                          <Badge variant="secondary">Non</Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(adresse)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleSetPrincipal(adresse)}>
                            <Star className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleDelete(adresse)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAddresses.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucune adresse trouvee
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
            <DialogTitle>{editingAddress ? 'Modifier adresse' : 'Nouvelle adresse'}</DialogTitle>
            <DialogDescription>
              {editingAddress ? 'Mettez a jour l adresse client.' : 'Ajoutez une adresse pour un client.'}
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
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('typeAdresse')}>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nom adresse</label>
                <Input {...form.register('nomAdresse')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ligne 1 *</label>
                <Input {...form.register('ligne1', { required: true })} />
                {form.formState.errors.ligne1 && (
                  <p className="text-xs text-red-600">Ligne 1 requise</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ligne 2</label>
                <Input {...form.register('ligne2')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ligne 3</label>
                <Input {...form.register('ligne3')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Code postal *</label>
                <Input {...form.register('codePostal', { required: true })} />
                {form.formState.errors.codePostal && (
                  <p className="text-xs text-red-600">Code postal requis</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ville *</label>
                <Input {...form.register('ville', { required: true })} />
                {form.formState.errors.ville && (
                  <p className="text-xs text-red-600">Ville requise</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Region</label>
                <Input {...form.register('region')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Pays *</label>
                <Input {...form.register('pays', { required: true })} />
                {form.formState.errors.pays && (
                  <p className="text-xs text-red-600">Pays requis</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" {...form.register('isPrincipal')} />
                <span className="text-sm">Adresse principale</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingAddress ? 'Mettre a jour' : 'Creer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
