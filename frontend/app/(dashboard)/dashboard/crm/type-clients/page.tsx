'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  useTypeClients,
  useCreateTypeClient,
  useUpdateTypeClient,
  useDeleteTypeClient,
  useToggleTypeClient,
} from '@/hooks/useCrm';
import { TypeClient } from '@/shared/api/crm/types';
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
import { Search, Filter, Plus, Edit, Trash2, Power, Tags } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface TypeClientFormValues {
  code: string;
  libelle: string;
  description?: string;
}

export default function TypeClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<TypeClient | null>(null);

  const { data: typeClients = [], isLoading } = useTypeClients();
  const typeClientsArray: TypeClient[] = Array.isArray(typeClients)
    ? (typeClients as TypeClient[])
    : ((typeClients as any)?.data || []);

  const createMutation = useCreateTypeClient();
  const updateMutation = useUpdateTypeClient();
  const deleteMutation = useDeleteTypeClient();
  const toggleMutation = useToggleTypeClient();

  const form = useForm<TypeClientFormValues>({
    defaultValues: {
      code: '',
      libelle: '',
      description: '',
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingType) {
      form.reset({
        code: editingType.code || '',
        libelle: editingType.libelle || '',
        description: editingType.description || '',
      });
    } else {
      form.reset({
        code: '',
        libelle: '',
        description: '',
      });
    }
  }, [dialogOpen, editingType, form]);

  const filteredTypes = useMemo(() => {
    return typeClientsArray.filter((typeClient) => {
      const matchesSearch =
        typeClient.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        typeClient.libelle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeClient.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const isActive = typeClient.isActive ?? true;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [typeClientsArray, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = typeClientsArray.length;
    const actifs = typeClientsArray.filter((t) => t.isActive ?? true).length;
    const inactifs = total - actifs;
    return { total, actifs, inactifs };
  }, [typeClientsArray]);

  const openCreate = () => {
    setEditingType(null);
    setDialogOpen(true);
  };

  const openEdit = (typeClient: TypeClient) => {
    setEditingType(typeClient);
    setDialogOpen(true);
  };

  const handleDelete = (typeClient: TypeClient) => {
    if (confirm(`Supprimer le type "${typeClient.libelle}" ?`)) {
      deleteMutation.mutate(typeClient.id);
    }
  };

  const handleToggle = (typeClient: TypeClient) => {
    toggleMutation.mutate(typeClient.id);
  };

  const onSubmit = async (values: TypeClientFormValues) => {
    try {
      if (editingType) {
        await updateMutation.mutateAsync({ id: editingType.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setDialogOpen(false);
      setEditingType(null);
    } catch (error) {
      console.error('Erreur type client:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Types de clients</h1>
        <p className="text-muted-foreground">Gerez les types pour classifier vos clients</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total types</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
            <Badge className="bg-green-100 text-green-800">OK</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.actifs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactifs</CardTitle>
            <Badge variant="secondary">OFF</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactifs}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des types</CardTitle>
          <CardDescription>Rechercher, modifier et activer ou desactiver</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par code ou libelle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                className="border rounded-md px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tous</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau type
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Code</th>
                  <th className="text-left p-4 font-medium">Libelle</th>
                  <th className="text-left p-4 font-medium">Description</th>
                  <th className="text-left p-4 font-medium">Statut</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTypes.map((typeClient) => (
                  <tr key={typeClient.id} className="border-t hover:bg-muted/50">
                    <td className="p-4 font-medium">{typeClient.code}</td>
                    <td className="p-4">{typeClient.libelle}</td>
                    <td className="p-4 text-sm text-muted-foreground">{typeClient.description || '-'}</td>
                    <td className="p-4">
                      {typeClient.isActive ?? true ? (
                        <Badge className="bg-green-100 text-green-800">Actif</Badge>
                      ) : (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleToggle(typeClient)}>
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(typeClient)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDelete(typeClient)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTypes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      Aucun type trouve
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Modifier le type' : 'Nouveau type'}
            </DialogTitle>
            <DialogDescription>
              {editingType ? 'Mettez a jour les informations du type.' : 'Ajoutez un type de client.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Code *</label>
              <Input {...form.register('code', { required: true })} />
              {form.formState.errors.code && (
                <p className="text-xs text-red-600">Code requis</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Libelle *</label>
              <Input {...form.register('libelle', { required: true })} />
              {form.formState.errors.libelle && (
                <p className="text-xs text-red-600">Libelle requis</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input {...form.register('description')} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingType ? 'Mettre a jour' : 'Creer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
