'use client';

import React, { useState } from 'react';
import { useTypeClients, useCreateTypeClient, useUpdateTypeClient, useDeleteTypeClient, useToggleTypeClient } from '@/hooks/useCrm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Pencil, Trash2, Plus, Power } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const typeClientSchema = z.object({
  code: z.string().min(1, 'Code requis'),
  libelle: z.string().min(1, 'Libellé requis'),
  description: z.string().optional(),
});

type TypeClientFormData = z.infer<typeof typeClientSchema>;

export default function TypeClientsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTypeClient, setEditingTypeClient] = useState<any>(null);

  const { data: typeClientsResponse, isLoading } = useTypeClients();
  const typeClients = Array.isArray(typeClientsResponse) 
    ? typeClientsResponse 
    : Array.isArray((typeClientsResponse as any)?.data) 
    ? (typeClientsResponse as any).data 
    : [];
  
  const createMutation = useCreateTypeClient();
  const updateMutation = useUpdateTypeClient();
  const deleteMutation = useDeleteTypeClient();
  const toggleMutation = useToggleTypeClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TypeClientFormData>({
    resolver: zodResolver(typeClientSchema),
  });

  const handleOpenCreate = () => {
    reset({ code: '', libelle: '', description: '' });
    setEditingTypeClient(null);
    setIsCreateDialogOpen(true);
  };

  const handleOpenEdit = (typeClient: any) => {
    reset({
      code: typeClient.code,
      libelle: typeClient.libelle,
      description: typeClient.description || '',
    });
    setEditingTypeClient(typeClient);
    setIsCreateDialogOpen(true);
  };

  const onSubmit = async (data: TypeClientFormData) => {
    try {
      if (editingTypeClient) {
        await updateMutation.mutateAsync({
          id: editingTypeClient.id,
          data,
        });
        toast.success('Type de client modifié avec succès');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Type de client créé avec succès');
      }
      setIsCreateDialogOpen(false);
      reset();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string, nom: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le type "${nom}" ?`)) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Type de client supprimé');
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Erreur lors de la suppression');
      }
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleMutation.mutateAsync(id);
      toast.success('Statut modifié avec succès');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erreur lors de la modification');
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Types de Clients
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Gérez les types de clients pour la catégorisation
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau type
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {typeClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  Aucun type de client trouvé
                </TableCell>
              </TableRow>
            ) : (
              typeClients.map((typeClient: any) => (
                <TableRow key={typeClient.id}>
                  <TableCell className="font-medium">{typeClient.code}</TableCell>
                  <TableCell>{typeClient.libelle}</TableCell>
                  <TableCell>{typeClient.description || '-'}</TableCell>
                  <TableCell>
                    {typeClient.isActive ? (
                      <Badge variant="success">Actif</Badge>
                    ) : (
                      <Badge variant="secondary">Inactif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(typeClient.id)}
                        title={typeClient.actif ? 'Désactiver' : 'Activer'}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(typeClient)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(typeClient.id, typeClient.nom)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent aria-describedby="type-client-dialog-description">
          <DialogHeader>
            <DialogTitle>
              {editingTypeClient ? 'Modifier le type de client' : 'Nouveau type de client'}
            </DialogTitle>
            <p id="type-client-dialog-description" className="text-sm text-gray-500">
              {editingTypeClient ? 'Modifiez les informations du type de client' : 'Créez un nouveau type de client pour catégoriser vos clients'}
            </p>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Code *
              </label>
              <Input
                {...register('code')}
                placeholder="Ex: PART, ENTR, GOV"
                disabled={createMutation.isPending || updateMutation.isPending}
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Libellé *
              </label>
              <Input
                {...register('libelle')}
                placeholder="Ex: Particulier, Entreprise"
                disabled={createMutation.isPending || updateMutation.isPending}
              />
              {errors.libelle && (
                <p className="mt-1 text-sm text-red-600">{errors.libelle.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <Input
                {...register('description')}
                placeholder="Description du type de client"
                disabled={createMutation.isPending || updateMutation.isPending}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Spinner size="sm" />
                ) : editingTypeClient ? (
                  'Modifier'
                ) : (
                  'Créer'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
