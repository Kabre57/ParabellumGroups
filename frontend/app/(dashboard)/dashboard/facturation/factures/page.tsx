'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
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
import InvoiceForm from '@/components/billing/InvoiceForm';

export default function FacturesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: invoicesResponse, isLoading } = useQuery({
    queryKey: ['invoices', searchQuery, statusFilter],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (searchQuery) params.query = searchQuery;
      if (statusFilter !== 'all') params.status = statusFilter;
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
      PAYEE: { label: 'Payée', variant: 'success' },
      EN_RETARD: { label: 'En retard', variant: 'destructive' },
      ANNULEE: { label: 'Annulée', variant: 'secondary' },
      PARTIALLY_PAYEE: { label: 'Partiellement payée', variant: 'warning' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('fr-FR');
  };

  const handleDelete = (invoice: any) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la facture "${invoice.numeroFacture}" ?`)) {
      deleteMutation.mutate(invoice.id);
    }
  };

  const handleDownloadPDF = (invoiceNum: string) => {
    // TODO: Implémenter le téléchargement PDF
    console.log('Download PDF:', invoiceNum);
    alert('Fonctionnalité de téléchargement PDF à implémenter');
  };

  const handleSendInvoice = async (invoiceNum: string) => {
    // TODO: Implémenter l'envoi de facture
    console.log('Send invoice:', invoiceNum);
    alert('Fonctionnalité d\'envoi de facture à implémenter');
  };

  const invoices = invoicesResponse?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Factures
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Gérez vos factures clients
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Nouvelle facture
        </Button>
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <TableCell>{invoice.client?.nom || invoice.clientId || 'Client'}</TableCell>
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/facturation/factures/${invoice.id}/edit`)}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPDF(invoice.id)}
                      >
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendInvoice(invoice.id)}
                      >
                        Envoyer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(invoice)}
                        disabled={deleteMutation.isPending}
                      >
                        Supprimer
                      </Button>
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
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle facture</DialogTitle>
          </DialogHeader>
          <InvoiceForm
            onSuccess={() => setIsCreateDialogOpen(false)}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

