'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Edit, Plus, Search, Star, Trash2 } from 'lucide-react';
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

const statusColors: Record<SupplierStatus, string> = {
  ACTIF: 'bg-green-100 text-green-800',
  INACTIF: 'bg-gray-100 text-gray-800',
  BLOQUE: 'bg-red-100 text-red-800',
};

const statusLabels: Record<SupplierStatus, string> = {
  ACTIF: 'Actif',
  INACTIF: 'Inactif',
  BLOQUE: 'Bloque',
};

interface SupplierFormValues {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  category?: string;
  status: SupplierStatus;
}

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | 'ALL'>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const { data: suppliersResponse, isLoading } = useQuery<
    Awaited<ReturnType<typeof procurementService.getSuppliers>>
  >({
    queryKey: ['suppliers', searchTerm, statusFilter],
    queryFn: () =>
      procurementService.getSuppliers({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        limit: 200,
      }),
  });

  const suppliers = suppliersResponse?.data ?? [];

  const filteredSuppliers = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesSearch =
        supplier.name.toLowerCase().includes(search) ||
        (supplier.email || '').toLowerCase().includes(search) ||
        (supplier.phone || '').toLowerCase().includes(search) ||
        (supplier.category || '').toLowerCase().includes(search);
      const matchesStatus = statusFilter === 'ALL' || supplier.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: suppliers.length,
      active: suppliers.filter((s) => s.status === 'ACTIF').length,
      totalOrders: suppliers.reduce((sum, s) => sum + (s.ordersCount || 0), 0),
      totalAmount: suppliers.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
    };
  }, [suppliers]);

  const createMutation = useMutation({
    mutationFn: (values: SupplierFormValues) =>
      procurementService.createSupplier({
        nom: values.name,
        email: values.email || '',
        telephone: values.phone || undefined,
        adresse: values.address || undefined,
        categorie: values.category || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: SupplierFormValues }) =>
      procurementService.updateSupplier(id, {
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address,
        category: values.category,
        status: values.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => procurementService.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const form = useForm<SupplierFormValues>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      category: '',
      status: 'ACTIF',
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingSupplier) {
      form.reset({
        name: editingSupplier.name || '',
        email: editingSupplier.email || '',
        phone: editingSupplier.phone || '',
        address: editingSupplier.address || '',
        category: editingSupplier.category || '',
        status: editingSupplier.status || 'ACTIF',
      });
    } else {
      form.reset({
        name: '',
        email: '',
        phone: '',
        address: '',
        category: '',
        status: 'ACTIF',
      });
    }
  }, [dialogOpen, editingSupplier, form]);

  const openCreate = () => {
    setEditingSupplier(null);
    setDialogOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setDialogOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    if (confirm(`Supprimer le fournisseur ${supplier.name} ?`)) {
      deleteMutation.mutate(supplier.id);
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, values });
    } else {
      createMutation.mutate(values);
    }
    setDialogOpen(false);
  });

  const renderRating = (rating?: number) => {
    const safeRating = rating || 0;
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.floor(safeRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs text-muted-foreground">{safeRating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats">Retour aux achats</Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">Fournisseurs</h1>
        </div>
        <Button onClick={openCreate}>
          <Building2 className="mr-2 h-4 w-4" />
          Nouveau fournisseur
        </Button>
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
                      <td className="px-4 py-3 font-medium">{supplier.name}</td>
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
                          <Button variant="ghost" size="icon" onClick={() => openEdit(supplier)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
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
    </div>
  );
}
