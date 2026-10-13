'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Edit, Plus, Search, Star, Trash2, Printer } from 'lucide-react';
import { procurementService, Supplier } from '@/services/procurement';
import type { SupplierStatus } from '@/services/procurement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import TabularListPrint from '@/components/printComponents/TabularListPrint';
import { formatFCFA, textOrDash } from '@/components/printComponents/printUtils';
import ImportCsvButton, { CsvImportRow } from '@/components/import/ImportCsvButton';
import { statusColors, statusLabels, type SupplierFormValues, evaluationLevels, SUPPLIER_IMPORT_HEADERS, useSuppliersPageModel } from './page.model';

export default function SuppliersPage() {  const { user, queryClient, searchTerm, setSearchTerm, statusFilter, setStatusFilter, dialogOpen, setDialogOpen, editingSupplier, setEditingSupplier, isPrintOpen, setIsPrintOpen, supplierToDelete, setSupplierToDelete, resolveName, suppliersResponse, isLoading, suppliers, filteredSuppliers, stats, canCreate, canUpdate, canDelete, createMutation, updateMutation, deleteMutation, importMutation, form, openCreate, openEdit, handleDelete, onSubmit, renderRating } = useSuppliersPageModel();



  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats">Retour aux achats</Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">Fournisseurs</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsPrintOpen(true)}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
          {canCreate && (
            <ImportCsvButton
              fileName="modele-fournisseurs.csv"
              templateHeaders={SUPPLIER_IMPORT_HEADERS}
              disabled={importMutation.isPending}
              onImport={(rows) => importMutation.mutateAsync(rows)}
            />
          )}
          {canCreate && (
            <Button onClick={openCreate}>
              <Building2 className="mr-2 h-4 w-4" />
              Nouveau fournisseur
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total fournisseurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Commandes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Montant total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalAmount.toLocaleString()} F
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des fournisseurs</CardTitle>
          <CardDescription>Suivi des fournisseurs et statuts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un fournisseur..."
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SupplierStatus | 'ALL')}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ACTIF">Actifs</option>
              <option value="INACTIF">Inactifs</option>
              <option value="BLOQUE">Bloques</option>
            </select>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nom</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Telephone</th>
                    <th className="px-4 py-3 font-medium">Categorie</th>
                    <th className="px-4 py-3 font-medium">Commandes</th>
                    <th className="px-4 py-3 font-medium">Montant</th>
                    <th className="px-4 py-3 font-medium">Evaluation</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{resolveName(supplier)}</td>
                      <td className="px-4 py-3">{supplier.email || '-'}</td>
                      <td className="px-4 py-3">{supplier.phone || '-'}</td>
                      <td className="px-4 py-3">{supplier.category || '-'}</td>
                      <td className="px-4 py-3">{supplier.ordersCount || 0}</td>
                      <td className="px-4 py-3 font-medium">
                        {(supplier.totalAmount || 0).toLocaleString()} F
                      </td>
                      <td className="px-4 py-3">{renderRating(supplier.rating)}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[supplier.status]}>
                          {statusLabels[supplier.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {canUpdate && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(supplier)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSuppliers.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  Aucun fournisseur trouve.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {(canCreate || canUpdate) && (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier
                ? 'Mettre a jour les informations fournisseur.'
                : 'Creer un nouveau fournisseur.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom</label>
              <Input {...form.register('name', { required: true })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" {...form.register('email')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Telephone</label>
              <Input {...form.register('phone')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Adresse</label>
              <Input {...form.register('address')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categorie</label>
              <Input {...form.register('category')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Evaluation fournisseur</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register('rating')}
              >
                {evaluationLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Note interne sur 5 pour evaluer la fiabilite du fournisseur.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register('status')}
              >
                <option value="ACTIF">Actif</option>
                <option value="INACTIF">Inactif</option>
                <option value="BLOQUE">Bloque</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Enregistrer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      )}

      {isPrintOpen && (
        <TabularListPrint
          title="Liste des fournisseurs"
          subtitle="Référentiel fournisseurs et suivi commercial"
          serviceName={user?.service?.name || user?.department || 'Service achat'}
          columns={[
            { key: 'name', label: 'Nom' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Téléphone' },
            { key: 'category', label: 'Catégorie' },
            { key: 'ordersCount', label: 'Commandes', align: 'right' },
            { key: 'totalAmount', label: 'Montant', align: 'right' },
            { key: 'rating', label: 'Évaluation', align: 'center' },
            { key: 'status', label: 'Statut', align: 'center' },
          ]}
          rows={filteredSuppliers.map((supplier) => ({
            name: resolveName(supplier),
            email: textOrDash(supplier.email),
            phone: textOrDash(supplier.phone || supplier.telephone),
            category: textOrDash(supplier.category),
            ordersCount: supplier.ordersCount || 0,
            totalAmount: formatFCFA(supplier.totalAmount || 0),
            rating: `${(supplier.rating || 0).toFixed(1)}/5`,
            status: statusLabels[supplier.status],
          }))}
          summary={[
            { label: 'Total fournisseurs', value: stats.total },
            { label: 'Actifs', value: stats.active },
            { label: 'Commandes', value: stats.totalOrders },
            { label: 'Montant total', value: formatFCFA(stats.totalAmount) },
          ]}
          onClose={() => setIsPrintOpen(false)}
        />
      )}

      <ConfirmDialog
        open={Boolean(supplierToDelete)}
        title="Supprimer le fournisseur"
        description={
          supplierToDelete
            ? `Le fournisseur ${resolveName(supplierToDelete)} sera supprimé définitivement.`
            : 'Confirmez la suppression du fournisseur.'
        }
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!supplierToDelete) return;
          deleteMutation.mutate(supplierToDelete.id);
          setSupplierToDelete(null);
        }}
        onOpenChange={(open) => !open && setSupplierToDelete(null)}
      />
    </div>
  );
}
