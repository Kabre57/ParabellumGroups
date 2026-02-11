'use client';

import React, { useState } from 'react';
import { useMateriel, useCreateMateriel, useUpdateMateriel, useDeleteMateriel } from '@/hooks/useTechnical';
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
import { Pencil, Trash2, Plus, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const materielSchema = z.object({
  reference: z.string().min(1, 'Référence requise'),
  nom: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  categorie: z.string().min(1, 'Catégorie requise'),
  quantiteStock: z.number().min(0, 'Quantité minimale: 0'),
  seuilAlerte: z.number().min(0, 'Seuil minimal: 0'),
  seuilRupture: z.number().min(0, 'Seuil minimal: 0'),
  prixUnitaire: z.number().optional(),
  fournisseur: z.string().optional(),
  emplacementStock: z.string().optional(),
  notes: z.string().optional(),
});

type MaterielFormData = z.infer<typeof materielSchema>;

export default function MaterielPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMateriel, setEditingMateriel] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: materiels = [], isLoading } = useMateriel({ pageSize: 100 });
  const createMutation = useCreateMateriel();
  const updateMutation = useUpdateMateriel();
  const deleteMutation = useDeleteMateriel();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MaterielFormData>({
    resolver: zodResolver(materielSchema),
  });

  const handleOpenCreate = () => {
    reset({
      reference: '',
      nom: '',
      description: '',
      categorie: '',
      quantiteStock: 0,
      seuilAlerte: 10,
      seuilRupture: 5,
      prixUnitaire: 0,
      fournisseur: '',
      emplacementStock: '',
      notes: '',
    });
    setEditingMateriel(null);
    setIsCreateDialogOpen(true);
  };

  const handleOpenEdit = (materiel: any) => {
    reset({
      reference: materiel.reference,
      nom: materiel.nom,
      description: materiel.description || '',
      categorie: materiel.categorie,
      quantiteStock: materiel.quantiteStock,
      seuilAlerte: materiel.seuilAlerte,
      seuilRupture: materiel.seuilRupture,
      prixUnitaire: materiel.prixUnitaire || 0,
      fournisseur: materiel.fournisseur || '',
      emplacementStock: materiel.emplacementStock || '',
      notes: materiel.notes || '',
    });
    setEditingMateriel(materiel);
    setIsCreateDialogOpen(true);
  };

  const onSubmit = async (data: MaterielFormData) => {
    try {
      if (editingMateriel) {
        await updateMutation.mutateAsync({
          id: editingMateriel.id,
          data,
        });
        toast.success('Matériel modifié avec succès');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Matériel créé avec succès');
      }
      setIsCreateDialogOpen(false);
      reset();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string, nom: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${nom}" ?`)) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Matériel supprimé');
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Erreur lors de la suppression');
      }
    }
  };

  const getStockBadge = (materiel: any) => {
    const stock = materiel.quantiteDisponible ?? materiel.quantiteStock ?? 0;
    if (stock <= materiel.seuilRupture) {
      return <Badge variant="destructive">Rupture</Badge>;
    }
    if (stock <= materiel.seuilAlerte) {
      return <Badge variant="warning">Alerte</Badge>;
    }
    return <Badge variant="success">Disponible</Badge>;
  };

  const filteredMateriels = materiels.filter((m: any) =>
    m.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.categorie?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Package className="h-8 w-8 mr-3 text-blue-600" />
            Gestion du Matériel
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Gérez votre stock de matériel technique
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau matériel
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <Input
          placeholder="Rechercher par nom, référence ou catégorie..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Disponible</TableHead>
              <TableHead>Seuil Alerte</TableHead>
              <TableHead>Emplacement</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMateriels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500">
                  Aucun matériel trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredMateriels.map((materiel: any) => (
                <TableRow key={materiel.id}>
                  <TableCell className="font-medium">{materiel.reference}</TableCell>
                  <TableCell>{materiel.nom}</TableCell>
                  <TableCell>{materiel.categorie}</TableCell>
                  <TableCell>{materiel.quantiteStock || 0}</TableCell>
                  <TableCell>{materiel.quantiteDisponible ?? materiel.quantiteStock ?? 0}</TableCell>
                  <TableCell>
                    {materiel.seuilAlerte}
                    {(materiel.quantiteDisponible ?? materiel.quantiteStock ?? 0) <= materiel.seuilAlerte && (
                      <AlertTriangle className="inline h-4 w-4 ml-1 text-yellow-500" />
                    )}
                  </TableCell>
                  <TableCell>{materiel.emplacementStock || '-'}</TableCell>
                  <TableCell>{getStockBadge(materiel)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(materiel)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(materiel.id, materiel.nom)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="materiel-dialog-description">
          <DialogHeader>
            <DialogTitle>
              {editingMateriel ? 'Modifier le matériel' : 'Nouveau matériel'}
            </DialogTitle>
            <p id="materiel-dialog-description" className="text-sm text-gray-500">
              {editingMateriel ? 'Modifiez les informations du matériel' : 'Ajoutez un nouveau matériel à votre inventaire'}
            </p>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Référence *
                </label>
                <Input
                  {...register('reference')}
                  placeholder="Ex: MAT-001"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.reference && (
                  <p className="mt-1 text-sm text-red-600">{errors.reference.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom *
                </label>
                <Input
                  {...register('nom')}
                  placeholder="Ex: Perceuse électrique"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.nom && (
                  <p className="mt-1 text-sm text-red-600">{errors.nom.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Catégorie *
                </label>
                <Input
                  {...register('categorie')}
                  placeholder="Ex: Outillage, Électricité"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.categorie && (
                  <p className="mt-1 text-sm text-red-600">{errors.categorie.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Emplacement
                </label>
                <Input
                  {...register('emplacementStock')}
                  placeholder="Ex: Entrepôt A - Allée 3"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantité en stock *
                </label>
                <Input
                  {...register('quantiteStock', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.quantiteStock && (
                  <p className="mt-1 text-sm text-red-600">{errors.quantiteStock.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Seuil d'alerte *
                </label>
                <Input
                  {...register('seuilAlerte', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.seuilAlerte && (
                  <p className="mt-1 text-sm text-red-600">{errors.seuilAlerte.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Seuil de rupture *
                </label>
                <Input
                  {...register('seuilRupture', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.seuilRupture && (
                  <p className="mt-1 text-sm text-red-600">{errors.seuilRupture.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prix unitaire (FCFA)
                </label>
                <Input
                  {...register('prixUnitaire', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fournisseur
                </label>
                <Input
                  {...register('fournisseur')}
                  placeholder="Ex: Fournisseur XYZ"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <Input
                {...register('description')}
                placeholder="Description du matériel"
                disabled={createMutation.isPending || updateMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <Input
                {...register('notes')}
                placeholder="Notes complémentaires"
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
                ) : editingMateriel ? (
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
