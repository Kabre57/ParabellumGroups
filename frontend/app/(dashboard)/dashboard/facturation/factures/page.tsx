'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { billingService } from '@/shared/api/billing';
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
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import InvoiceForm from '@/components/billing/InvoiceForm';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { useClients } from '@/hooks/useCrm';
import InvoicePrint from '@/components/printComponents/InvoicePrint';
import type { Invoice } from '@/shared/api/billing';
import { enterpriseApi } from '@/lib/api';
import { getAccessibleEnterprises } from '@/shared/enterpriseScope';

export default function FacturesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [enterpriseFilter, setEnterpriseFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any | null>(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);
  const [printLoading, setPrintLoading] = useState(false);
  const { data: clients = [] } = useClients({ pageSize: 200 });
  const { data: enterprisesResponse } = useQuery({
    queryKey: ['enterprise-filter-options', 'factures'],
    queryFn: () => enterpriseApi.getAll({ limit: 200, isActive: true }),
  });

  const accessibleEnterprises = React.useMemo(
    () => getAccessibleEnterprises(enterprisesResponse?.data ?? [], user?.enterpriseId),
    [enterprisesResponse?.data, user?.enterpriseId]
  );

  const { data: invoicesResponse, isLoading } = useQuery({
    queryKey: ['invoices', searchQuery, statusFilter, enterpriseFilter],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (enterpriseFilter !== 'all') params.enterpriseId = enterpriseFilter;
      const data = await billingService.getInvoices(params);
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => billingService.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'secondary' }> = {
      BROUILLON: { label: 'Brouillon', variant: 'outline' },
      ENVOYEE: { label: 'Envoyée', variant: 'default' },
      EMISE: { label: 'Emise', variant: 'default' },
      PAYEE: { label: 'Payée', variant: 'success' },
      EN_RETARD: { label: 'En retard', variant: 'destructive' },
      ANNULEE: { label: 'Annulée', variant: 'secondary' },
      PARTIELLEMENT_PAYEE: { label: 'Partiellement payée', variant: 'warning' },
      PARTIALLY_PAYEE: { label: 'Partiellement payée', variant: 'warning' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0)} F CFA`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('fr-FR');
  };

  const handleDelete = (invoice: any) => {
    setInvoiceToDelete(invoice);
  };

  const handlePrintInvoice = async (invoiceId: string) => {
    try {
      setPrintLoading(true);
      const response = await billingService.getInvoice(invoiceId);
      setInvoiceToPrint(response.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Impossible d'imprimer la facture.");
    } finally {
      setPrintLoading(false);
    }
  };

  const handleSendInvoice = async (invoiceNum: string) => {
    try {
      const response = await billingService.sendInvoice(invoiceNum);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if ((response as any)?.emailDelivery?.sent) {
        toast.success('Facture envoyée au client par email.');
      } else {
        toast.success('Facture marquée comme émise.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Impossible d'envoyer la facture.");
    }
  };

  const invoices = invoicesResponse?.data ?? [];
  const clientMap = new Map((Array.isArray(clients) ? clients : []).map((client: any) => [client.id, client]));
  const { canCreate, canUpdate, canDelete, canExport } = getCrudVisibility(user, {
    read: ['invoices.read', 'invoices.read_all', 'invoices.read_own'],
    create: ['invoices.create'],
    update: ['invoices.update', 'invoices.validate', 'invoices.send'],
    remove: ['invoices.delete', 'invoices.cancel'],
    export: ['invoices.export', 'invoices.print', 'invoices.send'],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Factures
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Gérez uniquement vos factures clients, leurs impressions et leurs envois.
          </p>
        </div>
        {canCreate && <Button onClick={() => setIsCreateDialogOpen(true)}>Nouvelle facture</Button>}
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <Input
              placeholder="Rechercher par numéro, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="BROUILLON">Brouillon</option>
              <option value="ENVOYEE">Envoyée</option>
              <option value="PAYEE">Payée</option>
              <option value="EN_RETARD">En retard</option>
              <option value="ANNULEE">Annulée</option>
            </select>
          </div>

          <div>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={enterpriseFilter}
              onChange={(e) => setEnterpriseFilter(e.target.value)}
            >
              <option value="all">Toutes les entreprises</option>
              {accessibleEnterprises.map((enterprise) => (
                <option key={String(enterprise.id)} value={String(enterprise.id)}>
                  {enterprise.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner />
          </div>
        ) : invoices.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.numeroFacture}
                  </TableCell>
                  <TableCell>{invoice.client?.nom || clientMap.get(invoice.clientId)?.nom || invoice.clientId || 'Client'}</TableCell>
                  <TableCell>{invoice.enterpriseName || '-'}</TableCell>
                  <TableCell>{formatDate(invoice.dateFacture)}</TableCell>
                  <TableCell>{formatDate(invoice.dateEcheance)}</TableCell>
                  <TableCell>{formatCurrency(invoice.montantTTC || 0)}</TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/facturation/factures/${invoice.id}`)}
                      >
                        Voir
                      </Button>
                      {canUpdate && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/facturation/factures/${invoice.id}/edit`)}
                        >
                          Modifier
                        </Button>
                      )}
                      {canExport && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintInvoice(invoice.id)}
                          disabled={printLoading}
                        >
                          Imprimer
                        </Button>
                      )}
                      {canUpdate && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendInvoice(invoice.id)}
                        >
                          Envoyer
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(invoice)}
                          disabled={deleteMutation.isPending}
                        >
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Aucune facture trouvée
            </p>
          </div>
        )}
      </Card>

      {/* Create Dialog */}
      {canCreate && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-h-[92vh] w-[min(96vw,1180px)] max-w-none overflow-y-auto px-4 sm:px-6">
            <DialogHeader>
              <DialogTitle>Nouvelle facture</DialogTitle>
            </DialogHeader>
            <InvoiceForm
              onSuccess={() => setIsCreateDialogOpen(false)}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={Boolean(invoiceToDelete)}
        title="Supprimer la facture"
        description={
          invoiceToDelete
            ? `La facture ${invoiceToDelete.numeroFacture} sera supprimée définitivement.`
            : 'Confirmez la suppression de la facture.'
        }
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!invoiceToDelete) return;
          deleteMutation.mutate(invoiceToDelete.id);
          setInvoiceToDelete(null);
        }}
        onOpenChange={(open) => !open && setInvoiceToDelete(null)}
      />

      {invoiceToPrint && (
        <InvoicePrint invoice={invoiceToPrint} onClose={() => setInvoiceToPrint(null)} />
      )}
    </div>
  );
}

