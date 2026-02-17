'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { procurementService } from '@/services/procurement';
import type { PurchaseOrder, PurchaseOrderStatus, Supplier } from '@/services/procurement';
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

const statusColors: Record<PurchaseOrderStatus, string> = {
  BROUILLON: 'bg-yellow-100 text-yellow-800',
  ENVOYE: 'bg-blue-100 text-blue-800',
  CONFIRME: 'bg-purple-100 text-purple-800',
  LIVRE: 'bg-green-100 text-green-800',
  ANNULE: 'bg-red-100 text-red-800',
};

const statusLabels: Record<PurchaseOrderStatus, string> = {
  BROUILLON: 'Brouillon',
  ENVOYE: 'Envoye',
  CONFIRME: 'Confirme',
  LIVRE: 'Livre',
  ANNULE: 'Annule',
};

interface OrderFormValues {
  fournisseurId: string;
  montantTotal: string;
  status: PurchaseOrderStatus;
}

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);

  const { data: ordersResponse, isLoading } = useQuery<
    Awaited<ReturnType<typeof procurementService.getOrders>>
  >({
    queryKey: ['purchase-orders', statusFilter, searchTerm],
    queryFn: () =>
      procurementService.getOrders({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchTerm || undefined,
        limit: 200,
      }),
  });

  const { data: suppliersResponse } = useQuery<
    Awaited<ReturnType<typeof procurementService.getSuppliers>>
  >({
    queryKey: ['suppliers'],
    queryFn: () => procurementService.getSuppliers({ limit: 200 }),
  });

  const orders = ordersResponse?.data ?? [];
  const suppliers: Supplier[] = suppliersResponse?.data ?? [];

  const filteredOrders = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
      const supplierName = (order.supplier || '').toLowerCase();
      const matchesSearch =
        order.number.toLowerCase().includes(search) || supplierName.includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [orders, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter(
        (o) => o.status === 'BROUILLON' || o.status === 'ENVOYE'
      ).length,
      confirmed: orders.filter((o) => o.status === 'CONFIRME').length,
      totalAmount: orders.reduce((sum, o) => sum + o.amount, 0),
    };
  }, [orders]);

  const createMutation = useMutation({
    mutationFn: (values: OrderFormValues) =>
      procurementService.createOrder({
        fournisseurId: values.fournisseurId,
        montantTotal: Number(values.montantTotal) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: OrderFormValues }) =>
      procurementService.updateOrder(id, {
        status: values.status,
        amount: Number(values.montantTotal) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => procurementService.deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  const form = useForm<OrderFormValues>({
    defaultValues: {
      fournisseurId: '',
      montantTotal: '',
      status: 'BROUILLON',
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingOrder) {
      form.reset({
        fournisseurId: editingOrder.supplierId || '',
        montantTotal: editingOrder.amount?.toString() || '',
        status: editingOrder.status || 'BROUILLON',
      });
    } else {
      form.reset({
        fournisseurId: suppliers[0]?.id || '',
        montantTotal: '',
        status: 'BROUILLON',
      });
    }
  }, [dialogOpen, editingOrder, form, suppliers]);

  const openCreate = () => {
    setEditingOrder(null);
    setDialogOpen(true);
  };

  const openEdit = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setDialogOpen(true);
  };

  const handleDelete = (order: PurchaseOrder) => {
    if (confirm(`Supprimer la commande ${order.number} ?`)) {
      deleteMutation.mutate(order.id);
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    if (editingOrder) {
      updateMutation.mutate({ id: editingOrder.id, values });
    } else {
      createMutation.mutate(values);
    }
    setDialogOpen(false);
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats">Retour aux achats</Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">Commandes achat</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle commande
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confirmees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
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
          <CardTitle>Liste des commandes</CardTitle>
          <CardDescription>Suivi des commandes fournisseurs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par numero ou fournisseur..."
                  className="pl-9"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PurchaseOrderStatus | 'ALL')}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="BROUILLON">Brouillon</option>
              <option value="ENVOYE">Envoye</option>
              <option value="CONFIRME">Confirme</option>
              <option value="LIVRE">Livre</option>
              <option value="ANNULE">Annule</option>
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
                    <th className="px-4 py-3 font-medium">Numero</th>
                    <th className="px-4 py-3 font-medium">Fournisseur</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Articles</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Montant</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{order.number}</td>
                      <td className="px-4 py-3">{order.supplier || '-'}</td>
                      <td className="px-4 py-3">
                        {new Date(order.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">{order.items}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[order.status]}>
                          {statusLabels[order.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {order.amount.toLocaleString()} F
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="ghost" size="icon">
                            <Link href={`/dashboard/achats/commandes/${order.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(order)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(order)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredOrders.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  Aucune commande trouvee.
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
              {editingOrder ? 'Modifier la commande' : 'Nouvelle commande'}
            </DialogTitle>
            <DialogDescription>
              {editingOrder
                ? 'Mettre a jour le statut et le montant.'
                : 'Creer une commande fournisseur.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            {!editingOrder && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Fournisseur</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...form.register('fournisseurId')}
                >
                  {suppliers.length === 0 && <option value="">Aucun fournisseur</option>}
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Montant total</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                {...form.register('montantTotal')}
                placeholder="Montant"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register('status')}
              >
                <option value="BROUILLON">Brouillon</option>
                <option value="ENVOYE">Envoye</option>
                <option value="CONFIRME">Confirme</option>
                <option value="LIVRE">Livre</option>
                <option value="ANNULE">Annule</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                Enregistrer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
