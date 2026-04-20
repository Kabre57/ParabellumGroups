'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { procurementService } from '@/services/procurement';
import type { PurchaseProforma, PurchaseRequest } from '@/services/procurement';
import { adminServicesService } from '@/shared/api/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import PurchaseProformaPrint from '@/components/printComponents/PurchaseProformaPrint';

type FlattenedProforma = {
  requestId: string;
  requestNumber: string;
  requestObject: string;
  requestService: string | null;
  proforma: PurchaseProforma;
};

const statusLabels: Record<string, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE: 'Soumise PDG',
  APPROUVEE: 'Validée PDG',
  REJETEE: 'Rejetée',
};

const formatCurrency = (amount: number) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number.isFinite(amount) ? amount : 0)} F CFA`;

export default function PurchaseProformasPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'BROUILLON' | 'SOUMISE' | 'APPROUVEE'>('ALL');
  const [printingRow, setPrintingRow] = useState<FlattenedProforma | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-proformas-space', search],
    queryFn: () =>
      procurementService.getRequests({
        limit: 200,
        search: search || undefined,
      }),
  });

  const { data: servicesResponse } = useQuery({
    queryKey: ['purchase-proformas-service-logos'],
    queryFn: () => adminServicesService.getServices(),
    staleTime: 5 * 60 * 1000,
  });

  const rows = useMemo<FlattenedProforma[]>(() => {
    const requests = data?.data ?? [];
    return requests.flatMap((request: PurchaseRequest) =>
      (request.proformas || []).map((proforma) => ({
        requestId: request.id,
        requestNumber: request.number,
        requestObject: request.objet || request.title,
        requestService: request.serviceName || null,
        proforma,
      }))
    );
  }, [data]);

  const visibleRows = useMemo(
    () => rows.filter((row) => row.proforma.status !== 'REJETEE'),
    [rows]
  );

  const filteredRows = useMemo(
    () =>
      visibleRows.filter((row) => {
        const matchesStatus = status === 'ALL' || row.proforma.status === status;
        const haystack = [
          row.requestNumber,
          row.requestObject,
          row.requestService || '',
          row.proforma.numeroProforma,
          row.proforma.fournisseurNom || '',
          row.proforma.notes || '',
        ]
          .join(' ')
          .toLowerCase();
        const matchesSearch = haystack.includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
      }),
    [visibleRows, search, status]
  );

  const services = servicesResponse?.data ?? [];

  const stats = useMemo(
    () => ({
      total: visibleRows.length,
      pending: visibleRows.filter((row) => row.proforma.status === 'SOUMISE').length,
      approved: visibleRows.filter((row) => row.proforma.status === 'APPROUVEE').length,
      amount: visibleRows.reduce((sum, row) => sum + row.proforma.montantTTC, 0),
    }),
    [visibleRows]
  );

  const createOrderMutation = useMutation({
    mutationFn: (row: FlattenedProforma) =>
      procurementService.createOrderFromProforma({ proformaId: row.proforma.id }),
    onSuccess: (response, row) => {
      toast.success(`Bon de commande créé depuis ${row.proforma.numeroProforma}`);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-proformas-space'] });
      const orderId = response?.data?.id;
      if (orderId) {
        router.push(`/dashboard/achats/commandes?selectedOrderId=${orderId}`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Impossible de créer le bon de commande');
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats">Retour aux achats</Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">Proformas fournisseurs</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos proformas et leurs informations.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total proformas</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">En attente DG</div><div className="text-2xl font-bold text-amber-600">{stats.pending}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Validées</div><div className="text-2xl font-bold text-green-600">{stats.approved}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Montant cumulé</div><div className="text-2xl font-bold">{formatCurrency(stats.amount)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des proformas</CardTitle>
          <CardDescription>Rechercher, consulter et comparer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par proforma, devis interne, service ou fournisseur..."
              className="max-w-xl"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="BROUILLON">Brouillon</option>
              <option value="SOUMISE">Soumise PDG</option>
              <option value="APPROUVEE">Validée PDG</option>
            </select>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Proforma</th>
                    <th className="px-4 py-3 font-medium">Devis source</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Fournisseur</th>
                    <th className="px-4 py-3 font-medium">Montant TTC</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.proforma.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.proforma.numeroProforma}</div>
                        <div className="text-xs text-muted-foreground">{row.proforma.title || row.proforma.titre || 'Sans intitulé'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.requestNumber}</div>
                        <div className="text-xs text-muted-foreground">{row.requestObject}</div>
                      </td>
                      <td className="px-4 py-3">{row.requestService || '-'}</td>
                      <td className="px-4 py-3">{row.proforma.fournisseurNom || '-'}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(row.proforma.montantTTC)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={row.proforma.selectedForOrder ? 'default' : 'outline'}>
                          {row.proforma.selectedForOrder ? 'Retenue' : statusLabels[row.proforma.status] || row.proforma.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {row.proforma.selectedForOrder ? (
                            <Button size="sm" variant="outline" onClick={() => setPrintingRow(row)}>
                              <Printer className="mr-2 h-4 w-4" />
                              Imprimer
                            </Button>
                          ) : null}
                          {row.proforma.selectedForOrder && !row.proforma.bonCommandeId ? (
                            <Button
                              size="sm"
                              onClick={() => createOrderMutation.mutate(row)}
                              disabled={createOrderMutation.isPending}
                            >
                              {createOrderMutation.isPending ? 'Création...' : 'Créer BC'}
                            </Button>
                          ) : null}
                          {row.proforma.bonCommandeId ? (
                            <Button asChild size="sm" variant="secondary">
                              <Link href={`/dashboard/achats/commandes?selectedOrderId=${row.proforma.bonCommandeId}`}>
                                Voir BC
                              </Link>
                            </Button>
                          ) : null}
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/achats/devis/${row.requestId}`}>Ouvrir le devis</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRows.length === 0 && (
                <div className="py-10 text-center text-muted-foreground">
                  Aucune proforma trouvée.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {printingRow ? (
        <PurchaseProformaPrint
          request={{
            id: printingRow.requestId,
            number: printingRow.requestNumber,
            title: printingRow.requestObject,
            requesterId: '',
            status: 'APPROUVEE',
            date: printingRow.proforma.approvedAt || printingRow.proforma.createdAt || new Date().toISOString(),
            serviceName: printingRow.requestService,
            supplierName: printingRow.proforma.fournisseurNom || undefined,
            proformas: [printingRow.proforma],
          }}
          proforma={printingRow.proforma}
          serviceLogoUrl={
            services.find((service) => service.name === printingRow.requestService)?.imageUrl || null
          }
          onClose={() => setPrintingRow(null)}
        />
      ) : null}
    </div>
  );
}
