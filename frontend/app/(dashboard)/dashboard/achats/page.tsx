'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Boxes, PackagePlus, FileText } from 'lucide-react';
import { procurementService } from '@/services/procurement';
import type { ProcurementStats, PurchaseOrder, PurchaseOrderStatus } from '@/services/procurement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

const statusLabels: Record<PurchaseOrderStatus, string> = {
  BROUILLON: 'Brouillon',
  ENVOYE: 'Envoye',
  CONFIRME: 'Confirme',
  LIVRE: 'Livre',
  ANNULE: 'Annule',
};

const statusColors: Record<PurchaseOrderStatus, string> = {
  BROUILLON: 'bg-yellow-100 text-yellow-800',
  ENVOYE: 'bg-blue-100 text-blue-800',
  CONFIRME: 'bg-purple-100 text-purple-800',
  LIVRE: 'bg-green-100 text-green-800',
  ANNULE: 'bg-red-100 text-red-800',
};

export default function ProcurementOverviewPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<ProcurementStats>({
    queryKey: ['procurement-stats'],
    queryFn: async () => {
      const response = await procurementService.getStats();
      return response.data;
    },
  });

  const { data: recentOrdersResponse, isLoading: ordersLoading } = useQuery<
    Awaited<ReturnType<typeof procurementService.getOrders>>
  >({
    queryKey: ['recent-orders'],
    queryFn: () => procurementService.getOrders({ limit: 10 }),
  });

  const recentOrders = recentOrdersResponse?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Achats</h1>
          <p className="text-sm text-muted-foreground">
            Suivi des achats, commandes et stock.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/achats/commandes">Commandes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/achats/stock">Stock</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/achats/commandes">
              <PackagePlus className="mr-2 h-4 w-4" />
              Nouvelle commande
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commandes ce mois</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Spinner size="sm" />
            ) : (
              <div className="text-2xl font-bold">{stats?.ordersThisMonth || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Spinner size="sm" />
            ) : (
              <div className="text-2xl font-bold text-amber-600">{stats?.pendingOrders || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget restant</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Spinner size="sm" />
            ) : (
              <div className="text-2xl font-bold text-emerald-600">
                {(stats?.budgetRemaining || 0).toLocaleString()} F
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commandes recentes</CardTitle>
          <CardDescription>Dernieres commandes enregistrees.</CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Numero</th>
                    <th className="px-4 py-3 font-medium">Fournisseur</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Montant</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order: PurchaseOrder) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{order.number}</td>
                      <td className="px-4 py-3">{order.supplier || '-'}</td>
                      <td className="px-4 py-3">
                        {new Date(order.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[order.status] || 'bg-gray-100 text-gray-800'}>
                          {statusLabels[order.status] || order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {order.amount.toLocaleString()} F
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/achats/commandes/${order.id}`}>Voir</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recentOrders.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  Aucune commande recente.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
