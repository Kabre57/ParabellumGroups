'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { billingService } from '@/shared/api/billing';
import type { InvoiceItem } from '@/shared/api/billing';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
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
import PaymentForm from '@/components/billing/PaymentForm';

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const invoiceId = params.num as string;
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const { canCreate, canUpdate, canExport } = getCrudVisibility(user, {
    read: ['invoices.read', 'invoices.read_all', 'invoices.read_own'],
    create: ['payments.create'],
    update: ['invoices.update', 'invoices.send', 'invoices.validate'],
    export: ['invoices.print', 'invoices.export', 'invoices.send'],
  });

  const { data: invoiceResponse, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => billingService.getInvoice(invoiceId),
  });

  const { data: paymentsResponse } = useQuery({
    queryKey: ['invoicePayments', invoiceId],
    queryFn: () => billingService.getPayments({ factureId: invoiceId }),
  });

  const invoice = invoiceResponse?.data;
  const payments = paymentsResponse?.data ?? [];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'secondary' }> = {
      BROUILLON: { label: 'Brouillon', variant: 'outline' },
      ENVOYEE: { label: 'Envoyee', variant: 'default' },
      PAYEE: { label: 'Payee', variant: 'success' },
      EN_RETARD: { label: 'En retard', variant: 'destructive' },
      ANNULEE: { label: 'Annulee', variant: 'secondary' },
      PARTIELLEMENT_PAYEE: { label: 'Partiellement payee', variant: 'warning' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) =>
    `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0)} F CFA`;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('fr-FR');
  };

  if (isLoading) {
    return <div className="flex justify-center items-center py-12"><Spinner /></div>;
  }

  if (!invoice) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">Facture non trouvee</p>
        <Button className="mt-4" onClick={() => router.push('/dashboard/facturation/factures')}>
          Retour aux factures
        </Button>
      </div>
    );
  }

  const lineItems: InvoiceItem[] = invoice.lignes ?? [];
  const subtotal = invoice.montantHT ?? lineItems.reduce((sum, item) => sum + (item.total ?? item.totalTTC ?? item.totalHT ?? item.quantity * item.unitPrice), 0);
  const taxAmount = invoice.montantTVA ?? (invoice.montantTTC && invoice.montantHT ? invoice.montantTTC - invoice.montantHT : subtotal * 0.2);
  const total = invoice.montantTTC ?? subtotal + taxAmount;
  const totalPaid = payments.reduce((sum, p) => sum + p.montant, 0);
  const remainingAmount = total - totalPaid;

  const handlePrintInvoice = async () => {
    const blob = await billingService.getInvoicePDF(invoice.id);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <Button variant="outline" onClick={() => router.push('/dashboard/facturation/factures')} className="mb-4">
            Retour
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Facture {invoice.numeroFacture}</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{getStatusBadge(invoice.status)}</p>
        </div>
        <div className="flex gap-2">
          {canExport && <Button variant="outline" onClick={() => void handlePrintInvoice()}>Telecharger PDF</Button>}
          {canUpdate && <Button variant="outline" onClick={() => alert('Envoi par email a implementer')}>Envoyer par email</Button>}
          {canCreate && <Button onClick={() => setIsPaymentDialogOpen(true)}>Enregistrer paiement</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold">Informations facture</h2>
          <InfoRow label="Numero" value={invoice.numeroFacture} />
          <InfoRow label="Date d'emission" value={formatDate(invoice.dateFacture)} />
          <InfoRow label="Date d'echeance" value={formatDate(invoice.dateEcheance)} />
          <InfoRow label="Client" value={invoice.client?.nom || invoice.clientId} />
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Statut</p>
            <div className="mt-1">{getStatusBadge(invoice.status)}</div>
          </div>
        </Card>
        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold">Montants</h2>
          <InfoRow label="Sous-total" value={formatCurrency(subtotal)} />
          <InfoRow label="TVA" value={formatCurrency(taxAmount)} />
          <InfoRow label="Total" value={formatCurrency(total)} />
          <InfoRow label="Deja paye" value={formatCurrency(totalPaid)} />
          <InfoRow label="Reste a payer" value={formatCurrency(remainingAmount)} />
        </Card>
      </div>

      <Card>
        <div className="border-b p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Lignes de facture</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Quantite</TableHead>
              <TableHead>Prix unitaire</TableHead>
              <TableHead>TVA</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item, index) => (
              <TableRow key={item.id || index}>
                <TableCell>{item.description}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                <TableCell>{item.vatRate}%</TableCell>
                <TableCell className="text-right">{formatCurrency(item.total ?? item.totalTTC ?? item.totalHT ?? item.quantity * item.unitPrice)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <div className="border-b p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Paiements</h2>
        </div>
        {payments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Methode</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.datePaiement)}</TableCell>
                  <TableCell>{payment.modePaiement}</TableCell>
                  <TableCell>{payment.reference || '-'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(payment.montant)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Aucun paiement enregistre.</div>
        )}
      </Card>

      {canCreate && (
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Enregistrer un paiement</DialogTitle>
            </DialogHeader>
            <PaymentForm
              invoiceId={invoice.id}
              invoiceNumber={invoice.numeroFacture}
              remainingAmount={remainingAmount}
              onSuccess={() => setIsPaymentDialogOpen(false)}
              onCancel={() => setIsPaymentDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
