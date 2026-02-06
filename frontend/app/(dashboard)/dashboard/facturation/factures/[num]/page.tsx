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
  const invoiceId = params.num as string;
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => billingService.getInvoice(invoiceId),
  });

  const { data: payments } = useQuery({
    queryKey: ['invoicePayments', invoiceId],
    queryFn: async () => {
      const data = await billingService.getPayments({ invoiceId });
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'secondary' }> = {
      DRAFT: { label: 'Brouillon', variant: 'outline' },
      SENT: { label: 'Envoyée', variant: 'default' },
      PAID: { label: 'Payée', variant: 'success' },
      OVERDUE: { label: 'En retard', variant: 'destructive' },
      CANCELLED: { label: 'Annulée', variant: 'secondary' },
      PARTIALLY_PAID: { label: 'Partiellement payée', variant: 'warning' },
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          Facture non trouvée
        </p>
        <Button
          className="mt-4"
          onClick={() => router.push('/dashboard/facturation/factures')}
        >
          Retour aux factures
        </Button>
      </div>
    );
  }

  // Mock line items (à remplacer par les vraies données de l'API)
  const lineItems: InvoiceItem[] =
    invoice.items?.length
      ? invoice.items
      : invoice.line_items?.length
      ? invoice.line_items
      : [
          {
            id: '1',
            description: 'Consulting services - Month of January',
            quantity: 20,
            unitPrice: 100,
            vatRate: 0,
            total: 2000,
            totalHT: 2000,
            totalTTC: 2000,
          },
          {
            id: '2',
            description: 'Project management',
            quantity: 10,
            unitPrice: 150,
            vatRate: 0,
            total: 1500,
            totalHT: 1500,
            totalTTC: 1500,
          },
        ];

  const subtotal = lineItems.reduce((sum, item) => {
    const lineTotal =
      item.total ??
      item.totalTTC ??
      item.totalHT ??
      item.quantity * (item.unitPrice || 0);
    return sum + lineTotal;
  }, 0);
  
  const taxRate = 0.20; // 20% TVA
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = total - totalPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/facturation/factures')}
            className="mb-4"
          >
            ← Retour
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Facture {invoice.invoiceNumber || invoice.invoice_number || invoice.invoice_num}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {getStatusBadge(invoice.status)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => alert('Téléchargement PDF à implémenter')}>
            Télécharger PDF
          </Button>
          <Button variant="outline" onClick={() => alert('Envoi par email à implémenter')}>
            Envoyer par email
          </Button>
          <Button onClick={() => setIsPaymentDialogOpen(true)}>
            Enregistrer paiement
          </Button>
        </div>
      </div>

      {/* Informations générales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Informations facture</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Numéro</p>
              <p className="font-medium">{invoice.invoiceNumber || invoice.invoice_number || invoice.invoice_num}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Date d'émission</p>
              <p className="font-medium">{formatDate(invoice.issueDate || invoice.issue_date || invoice.date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Date d'échéance</p>
              <p className="font-medium">{formatDate(invoice.dueDate || invoice.due_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Statut</p>
              <div className="mt-1">{getStatusBadge(invoice.status)}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Client</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">ID Client</p>
              <p className="font-medium">{invoice.customer?.name || invoice.customerId || invoice.customer_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
              <p className="font-medium">client@example.com</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Ligne items */}
      <Card>
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Détails de la facture
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Quantité</TableHead>
              <TableHead className="text-right">Prix unitaire</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.unitPrice || 0)}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.total ?? item.totalTTC ?? item.totalHT ?? item.quantity * (item.unitPrice || 0))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Totaux */}
        <div className="p-6 border-t">
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Sous-total</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Taxe (20%)
                </span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Paiements alloués */}
      <Card>
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Paiements
            </h2>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Montant restant</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(remainingAmount)}
              </p>
            </div>
          </div>
        </div>

        {payments && payments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id || payment.payment_id}>
                  <TableCell className="font-medium">
                    PAY-{payment.id || payment.payment_id}
                  </TableCell>
                  <TableCell>{formatDate(payment.payment_date || payment.datePaiement)}</TableCell>
                  <TableCell>{payment.method}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Aucun paiement enregistré
            </p>
            <Button
              className="mt-4"
              onClick={() => setIsPaymentDialogOpen(true)}
            >
              Enregistrer un paiement
            </Button>
          </div>
        )}
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          <PaymentForm
            invoiceId={invoiceId}
            invoiceNumber={invoice.invoiceNumber || invoice.invoice_number || invoice.invoice_num}
            remainingAmount={remainingAmount}
            onSuccess={() => setIsPaymentDialogOpen(false)}
            onCancel={() => setIsPaymentDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
