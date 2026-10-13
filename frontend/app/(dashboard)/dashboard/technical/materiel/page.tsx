'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMateriel, useCreateMateriel, useUpdateMateriel, useDeleteMateriel } from '@/hooks/useTechnical';
import { materielService } from '@/shared/api/technical/materiel.service';
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
import { Pencil, Trash2, Plus, AlertTriangle, Package, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { isAdminRole } from '@/shared/permissions';
import TabularListPrint from '@/components/printComponents/TabularListPrint';
import { formatFCFA, textOrDash } from '@/components/printComponents/printUtils';
import ImportCsvButton, { CsvImportRow } from '@/components/import/ImportCsvButton';
import { materielSchema, type MaterielFormData, MATERIEL_IMPORT_HEADERS, useMaterielPageModel } from './page.model';

export default function MaterielPage() {  const { user, queryClient, isAdmin, isCreateDialogOpen, setIsCreateDialogOpen, editingMateriel, setEditingMateriel, searchQuery, setSearchQuery, isPrintOpen, setIsPrintOpen, materiels, isLoading, createMutation, updateMutation, deleteMutation, importMutation, canCreate, canUpdate, canDelete, register, handleSubmit, errors, reset, handleOpenCreate, handleOpenEdit, onSubmit, handleDelete, getStockBadge, filteredMateriels } = useMaterielPageModel();



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
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Package className="h-8 w-8 mr-3 text-blue-600" />
            Gestion du Matériel
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Gérez votre stock de matériel technique
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsPrintOpen(true)}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
          {canCreate && (
            <ImportCsvButton
              fileName="modele-materiel.csv"
              templateHeaders={MATERIEL_IMPORT_HEADERS}
              disabled={importMutation.isPending}
              onImport={(rows) => importMutation.mutateAsync(rows)}
            />
          )}
          {canCreate && (
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau matériel
            </Button>
          )}
        </div>
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
                (() => {
                  const linkedSorties = materiel._count?.sorties ?? 0;
                  const canDeleteMateriel = canDelete && (isAdmin || linkedSorties === 0);

                  return (
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
                  <TableCell>
                    <div className="space-y-1">
                      <div>{materiel.emplacementStock || '-'}</div>
                      {linkedSorties > 0 && (
                        <div className="text-xs text-amber-600 dark:text-amber-400">
                          Déjà utilisé dans {linkedSorties} sortie{linkedSorties > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStockBadge(materiel)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(materiel)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDeleteMateriel && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(materiel.id, materiel.nom, isAdmin)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                    {canDelete && !canDeleteMateriel && (
                      <div className="mt-1 text-xs text-amber-600 dark:text-amber-400 text-right">
                        Suppression impossible: matériel déjà utilisé
                      </div>
                    )}
                  </TableCell>
                </TableRow>
                )})()
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Dialog */}
      {(canCreate || canUpdate) && (
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
      )}

      {isPrintOpen && (
        <TabularListPrint
          title="Liste du matériel"
          subtitle="Inventaire du matériel technique"
          serviceName={user?.service?.name || user?.department || 'Service technique'}
          columns={[
            { key: 'reference', label: 'Référence' },
            { key: 'nom', label: 'Nom' },
            { key: 'categorie', label: 'Catégorie' },
            { key: 'stock', label: 'Stock', align: 'right' },
            { key: 'disponible', label: 'Disponible', align: 'right' },
            { key: 'seuil', label: 'Seuil alerte', align: 'right' },
            { key: 'emplacement', label: 'Emplacement' },
            { key: 'prix', label: 'Prix unitaire', align: 'right' },
          ]}
          rows={filteredMateriels.map((materiel: any) => ({
            reference: materiel.reference,
            nom: materiel.nom,
            categorie: materiel.categorie,
            stock: materiel.quantiteStock || 0,
            disponible: materiel.quantiteDisponible ?? materiel.quantiteStock ?? 0,
            seuil: materiel.seuilAlerte,
            emplacement: textOrDash(materiel.emplacementStock),
            prix: materiel.prixUnitaire ? formatFCFA(materiel.prixUnitaire) : '-',
          }))}
          summary={[
            { label: 'Total matériel', value: filteredMateriels.length },
            {
              label: 'Valeur stock',
              value: formatFCFA(
                filteredMateriels.reduce(
                  (sum: number, materiel: any) =>
                    sum + (materiel.quantiteStock || 0) * (materiel.prixUnitaire || 0),
                  0
                )
              ),
            },
          ]}
          onClose={() => setIsPrintOpen(false)}
        />
      )}
    </div>
  );
}
