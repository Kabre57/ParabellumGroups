'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Search, TruckIcon } from 'lucide-react';
import { procurementService } from '@/shared/api/procurement/procurement.service';
import { PurchaseOrder } from '@/shared/api/procurement/types';
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

type ReceptionStatus = 'pending' | 'received' | 'checked';

interface Reception {
  id: string;
  number: string;
  supplier: string;
  date: string;
  products: number;
  quantity: number;
  amount: number;
  status: ReceptionStatus;
  orderStatus: PurchaseOrder['status'];
}

interface ReceptionHistoryEntry {
  id: string;
  number: string;
  action: 'validate' | 'revert';
  fromStatus: PurchaseOrder['status'];
  toStatus: PurchaseOrder['status'];
  timestamp: string;
}

const statusColors: Record<ReceptionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  received: 'bg-blue-100 text-blue-800',
  checked: 'bg-green-100 text-green-800',
};

const statusLabels: Record<ReceptionStatus, string> = {
  pending: 'En attente',
  received: 'Recue',
  checked: 'Verifiee',
};

export default function ReceptionsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReceptionStatus | 'ALL'>('ALL');
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'validate' | 'revert';
    reception: Reception;
    targetStatus: PurchaseOrder['status'];
  } | null>(null);
  const [history, setHistory] = useState<ReceptionHistoryEntry[]>([]);

  const { data: receptions = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['receptions'],
    queryFn: async () => {
      const res = await procurementService.getOrders({ limit: 200 });
      return res.data;
    },
  });

  const mappedReceptions: Reception[] = useMemo(
    () =>
      receptions.map((order) => ({
        id: order.id,
        number: order.number,
        supplier: order.supplier || '-',
        date: order.date,
        products: order.items ?? 0,
        quantity:
          order.itemsDetail?.reduce((sum, item) => sum + (item.quantity || 0), 0) ?? 0,
        amount: order.amount,
        status: (order.status === 'LIVRE'
          ? 'checked'
          : order.status === 'CONFIRME'
          ? 'received'
          : 'pending') as ReceptionStatus,
        orderStatus: order.status,
      })),
    [receptions]
  );

  const filteredReceptions = mappedReceptions.filter((reception) => {
    const matchesSearch =
      reception.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reception.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || reception.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: mappedReceptions.length,
    pending: mappedReceptions.filter((r) => r.status === 'pending').length,
    received: mappedReceptions.filter((r) => r.status === 'received').length,
    totalAmount: mappedReceptions.reduce((sum, r) => sum + r.amount, 0),
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PurchaseOrder['status'] }) =>
      procurementService.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receptions'] });
    },
  });

  const openConfirm = (type: 'validate' | 'revert', reception: Reception) => {
    if (type === 'validate') {
      const targetStatus = reception.status === 'pending' ? 'CONFIRME' : 'LIVRE';
      setPendingAction({ type, reception, targetStatus });
    } else {
      const targetStatus = reception.status === 'checked' ? 'CONFIRME' : 'ENVOYE';
      setPendingAction({ type, reception, targetStatus });
    }
    setConfirmOpen(true);
  };

  const confirmAction = () => {
    if (!pendingAction) return;
    const { reception, targetStatus, type } = pendingAction;
    updateStatusMutation.mutate(
      { id: reception.id, status: targetStatus },
      {
        onSuccess: () => {
          setHistory((prev) => [
            {
              id: reception.id,
              number: reception.number,
              action: type,
              fromStatus: reception.orderStatus,
              toStatus: targetStatus,
              timestamp: new Date().toISOString(),
            },
            ...prev,
          ]);
        },
      }
    );
    setConfirmOpen(false);
    setPendingAction(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats">Retour aux achats</Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">Receptions marchandises</h1>
        </div>
        <Button variant="outline" onClick={() => setComingSoonOpen(true)}>
          <TruckIcon className="mr-2 h-4 w-4" />
          Nouvelle reception
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total receptions</CardTitle>
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
            <CardTitle className="text-sm font-medium">Recues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.received}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Montant total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} F
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des receptions</CardTitle>
          <CardDescription>Suivi des receptions fournisseurs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher une reception..."
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReceptionStatus | 'ALL')}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="received">Recue</option>
              <option value="checked">Verifiee</option>
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
                    <th className="px-4 py-3 font-medium">Produits</th>
                    <th className="px-4 py-3 font-medium">Quantite</th>
                    <th className="px-4 py-3 font-medium">Montant</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceptions.map((reception) => (
                    <tr key={reception.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{reception.number}</td>
                      <td className="px-4 py-3">{reception.supplier}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(reception.date).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-4 py-3">{reception.products}</td>
                      <td className="px-4 py-3">{reception.quantity}</td>
                      <td className="px-4 py-3 font-medium">
                        {reception.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} F
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[reception.status]}>
                          {statusLabels[reception.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {reception.status !== 'checked' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openConfirm('validate', reception)}
                              disabled={updateStatusMutation.isPending}
                            >
                              {reception.status === 'pending'
                                ? 'Marquer recue'
                                : 'Valider'}
                            </Button>
                          )}
                          {reception.status !== 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openConfirm('revert', reception)}
                              disabled={updateStatusMutation.isPending}
                            >
                              Annuler
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredReceptions.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  Aucune reception trouvee.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bientot disponible</DialogTitle>
            <DialogDescription>
              La creation de receptions arrive bientot. Vous pouvez deja valider
              les receptions depuis cette page.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer l'action</DialogTitle>
            <DialogDescription>
              {pendingAction?.type === 'validate'
                ? `Confirmer la validation de la reception ${pendingAction?.reception.number} ?`
                : `Annuler la validation de la reception ${pendingAction?.reception.number} ?`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button onClick={confirmAction} disabled={updateStatusMutation.isPending}>
              Confirmer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Historique des validations</CardTitle>
          <CardDescription>Dernieres actions effectuees sur les receptions.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Aucun historique pour cette session.
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {history.slice(0, 10).map((entry, index) => (
                <li key={`${entry.id}-${index}`} className="flex items-center gap-3">
                  <Badge variant="outline">{entry.number}</Badge>
                  <span>
                    {entry.action === 'validate' ? 'Validation' : 'Annulation'}:{' '}
                    {entry.fromStatus} → {entry.toStatus}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString('fr-FR')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
