'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import PaymentForm from '@/components/billing/PaymentForm';
import { useClient, useClients } from '@/hooks/useCrm';
import InvoicePrint from '@/components/printComponents/InvoicePrint';

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const invoiceId = params.num as string;
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isCreditNoteDialogOpen, setIsCreditNoteDialogOpen] = useState(false);
  const [creditNoteReason, setCreditNoteReason] = useState('');
  const [creditNoteNotes, setCreditNoteNotes] = useState('');
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const { canCreate: canPaymentCreate, canUpdate, canExport } = getCrudVisibility(user, {
    read: ['invoices.read', 'invoices.read_all', 'invoices.read_own'],
    create: ['payments.create'],
    update: ['invoices.update', 'invoices.send', 'invoices.validate'],
    export: ['invoices.print', 'invoices.export', 'invoices.send'],
  });

  const { canCreate: canCreditNoteCreate } = getCrudVisibility(user, {
    read: ['invoices.read', 'invoices.read_all', 'invoices.read_own'],
    create: ['invoices.credit_note'],
    update: ['invoices.update', 'invoices.send', 'invoices.validate'],
    export: ['invoices.print', 'invoices.export', 'invoices.send'],
  });

  const { data: invoiceResponse, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => billingService.getInvoice(invoiceId),
  });

  const { data: clients = [] } = useClients({ pageSize: 300 });
  const { data: clientDetailResponse } = useClient(invoiceResponse?.data?.clientId || '');

  const { data: paymentsResponse } = useQuery({
    queryKey: ['invoicePayments', invoiceId],
    queryFn: () => billingService.getPayments({ factureId: invoiceId }),
  });

  const invoice = invoiceResponse?.data;
  const payments = paymentsResponse?.data ?? [];
  const creditNotes = (invoice as any)?.avoirs ?? [];
  const clientMap = useMemo(
    () => new Map((Array.isArray(clients) ? clients : []).map((client: any) => [client.id, client])),
    [clients]
  );

  const sendInvoiceMutation = useMutation({
    mutationFn: () => billingService.sendInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const createCreditNoteMutation = useMutation({
    mutationFn: (payload: { factureId: string; motif: string; notes?: string }) =>
      billingService.createCreditNote(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      queryClient.invalidateQueries({ queryKey: ['creditNotes', invoiceId] });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'secondary' }> = {
      BROUILLON: { label: 'Brouillon', variant: 'outline' },
      ENVOYEE: { label: 'Envoyee', variant: 'default' },
      EMISE: { label: 'Emise', variant: 'default' },
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
  const normalizedLineItems = lineItems.map((item) => {
    const quantity = item.quantity ?? item.quantite ?? 0;
    const unitPrice = item.unitPrice ?? item.prixUnitaire ?? 0;
    const vatRate = item.vatRate ?? item.tauxTVA ?? 0;
    const lineTotal =
      item.total ??
      item.totalTTC ??
      item.montantTTC ??
      item.totalHT ??
      item.montantHT ??
      quantity * unitPrice;

    return {
      ...item,
      quantity,
      unitPrice,
      vatRate,
      lineTotal,
    };
  });
  const subtotal =
    invoice.montantHT ??
    normalizedLineItems.reduce((sum, item) => sum + (item.totalHT ?? item.montantHT ?? item.quantity * item.unitPrice), 0);
  const taxAmount = invoice.montantTVA ?? (invoice.montantTTC && invoice.montantHT ? invoice.montantTTC - invoice.montantHT : subtotal * 0.2);
  const total = invoice.montantTTC ?? subtotal + taxAmount;
  const totalPaid = payments.reduce((sum, p) => sum + p.montant, 0);
  const remainingAmount = Math.max(total - totalPaid, 0);
  const clientName =
    clientDetailResponse?.data?.nom ||
    clientMap.get(invoice.clientId)?.nom ||
    invoice.client?.nom ||
    invoice.clientId;

  const handlePrintInvoice = () => {
    setIsPrintOpen(true);
  };

  const handleSendInvoice = async () => {
    try {
      const response = await sendInvoiceMutation.mutateAsync();
      if ((response as any)?.emailDelivery?.sent) {
        toast.success('Facture envoyee au client par email.');
      } else {
        toast.success("Facture marquee comme emise.");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Impossible d'envoyer la facture.");
    }
  };

  const handleCreateCreditNote = async () => {
    if (!creditNoteReason.trim()) {
      toast.error("Le motif de l'avoir est requis.");
      return;
    }

    try {
      await createCreditNoteMutation.mutateAsync({
        factureId: invoice.id,
        motif: creditNoteReason.trim(),
        notes: creditNoteNotes.trim() || undefined,
      });
      toast.success('Avoir cree avec succes.');
      setCreditNoteReason('');
      setCreditNoteNotes('');
      setIsCreditNoteDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Impossible de creer l'avoir.");
    }
  };

  const handlePrintCreditNote = async (creditNoteId: string) => {
    const blob = await billingService.getCreditNotePDF(creditNoteId);
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
          {canExport && <Button variant="outline" onClick={() => handlePrintInvoice()}>Imprimer</Button>}
          {canUpdate && (
            <Button variant="outline" onClick={() => void handleSendInvoice()} disabled={sendInvoiceMutation.isPending}>
              {sendInvoiceMutation.isPending ? 'Envoi...' : 'Envoyer par email'}
            </Button>
          )}
          {canCreditNoteCreate && (
            <Button variant="outline" onClick={() => setIsCreditNoteDialogOpen(true)}>
              Creer un avoir
            </Button>
          )}
          {canPaymentCreate && <Button onClick={() => setIsPaymentDialogOpen(true)}>Enregistrer paiement</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold">Informations facture</h2>
          <InfoRow label="Numero" value={invoice.numeroFacture} />
          <InfoRow label="Date d'emission" value={formatDate((invoice as any).dateFacture || (invoice as any).dateEmission)} />
          <InfoRow label="Date d'echeance" value={formatDate(invoice.dateEcheance)} />
          <InfoRow label="Client" value={clientName} />
          <InfoRow label="Service emetteur" value={invoice.serviceName || '-'} />
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
            {normalizedLineItems.map((item, index) => (
              <TableRow key={item.id || index}>
                <TableCell>{item.description}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                <TableCell>{item.vatRate}%</TableCell>
                <TableCell className="text-right">{formatCurrency(item.lineTotal)}</TableCell>
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

      <Card>
        <div className="border-b p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Avoirs & notes de credit</h2>
        </div>
        {creditNotes.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Montant TTC</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditNotes.map((creditNote: any) => (
                <TableRow key={creditNote.id}>
                  <TableCell className="font-medium">{creditNote.numeroAvoir}</TableCell>
                  <TableCell>{creditNote.motif}</TableCell>
                  <TableCell>{creditNote.status}</TableCell>
                  <TableCell>{formatCurrency(creditNote.montantTTC)}</TableCell>
                  <TableCell>{formatDate(creditNote.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => void handlePrintCreditNote(creditNote.id)}>
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Aucun avoir enregistre pour cette facture.</div>
        )}
      </Card>

      {canPaymentCreate && (
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-3xl max-h-[92vh] overflow-y-auto px-4 sm:px-6">
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

      {canCreditNoteCreate && (
        <Dialog open={isCreditNoteDialogOpen} onOpenChange={setIsCreditNoteDialogOpen}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-3xl max-h-[92vh] overflow-y-auto px-4 sm:px-6">
            <DialogHeader>
              <DialogTitle>Creer un avoir / note de credit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Facture source</label>
                <Input value={invoice.numeroFacture} readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Motif</label>
                <Input
                  value={creditNoteReason}
                  onChange={(event) => setCreditNoteReason(event.target.value)}
                  placeholder="Retour, annulation partielle, erreur de facturation..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={creditNoteNotes}
                  onChange={(event) => setCreditNoteNotes(event.target.value)}
                  placeholder="Commentaires internes ou explication commerciale"
                  className="min-h-[120px]"
                />
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                Cette premiere version genere un avoir complet base sur les lignes de la facture source.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreditNoteDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={() => void handleCreateCreditNote()} disabled={createCreditNoteMutation.isPending}>
                {createCreditNoteMutation.isPending ? 'Creation...' : "Creer l'avoir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {isPrintOpen && (
        <InvoicePrint invoice={invoice} onClose={() => setIsPrintOpen(false)} />
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
