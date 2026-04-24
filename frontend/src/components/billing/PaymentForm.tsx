'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingService } from '@/shared/api/billing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const paymentSchema = z.object({
  factureId: z.string().optional(),
  montant: z.number().min(0.01, 'Le montant doit etre superieur a 0'),
  datePaiement: z.string().min(1, 'La date de paiement est requise'),
  modePaiement: z.string().min(1, 'La methode de paiement est requise'),
  treasuryAccountId: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  payment?: any;
  invoiceId?: string;
  invoiceNumber?: string;
  remainingAmount?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function PaymentForm({
  payment,
  invoiceId,
  invoiceNumber,
  remainingAmount,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!payment;

  const { data: invoicesResponse } = useQuery({
    queryKey: ['unpaidInvoices'],
    queryFn: async () => {
      return billingService.getInvoices({ limit: 200 });
    },
    enabled: !invoiceId,
  });

  const { data: treasuryAccountsResponse } = useQuery({
    queryKey: ['treasury-accounts'],
    queryFn: () => billingService.getTreasuryAccounts(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: payment
      ? {
          factureId: payment.factureId || payment.invoiceId || '',
          montant: payment.montant || payment.amount,
          datePaiement: payment.datePaiement || payment.payment_date || payment.date,
          modePaiement: payment.modePaiement || payment.method,
          treasuryAccountId: payment.treasuryAccountId || '',
          reference: payment.reference || '',
          notes: payment.notes || '',
        }
      : {
          factureId: invoiceId || '',
          montant: remainingAmount || 0,
          datePaiement: new Date().toISOString().split('T')[0],
          modePaiement: 'VIREMENT',
          treasuryAccountId: '',
          reference: '',
          notes: '',
        },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      return billingService.createPayment({
        factureId: data.factureId || '',
        montant: data.montant,
        datePaiement: data.datePaiement,
        modePaiement: data.modePaiement as any,
        treasuryAccountId: data.treasuryAccountId || undefined,
        reference: data.reference,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (invoiceId) {
        queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
        queryClient.invalidateQueries({ queryKey: ['invoicePayments', invoiceId] });
      }
      onSuccess?.();
    },
  });

  const selectedInvoiceId = watch('factureId');
  const selectedMethod = watch('modePaiement');
  const remainingLimit = typeof remainingAmount === 'number' ? Math.max(remainingAmount, 0) : undefined;
  const treasuryAccounts = treasuryAccountsResponse?.data ?? [];
  const filteredTreasuryAccounts = treasuryAccounts.filter((account) =>
    selectedMethod === 'ESPECES' ? account.type === 'CASH' : account.type === 'BANK'
  );

  useEffect(() => {
    const invoices = invoicesResponse?.data ?? [];
    if (selectedInvoiceId && invoices.length > 0) {
      const invoice = invoices.find((inv) => inv.id === selectedInvoiceId);
      if (invoice) {
        setValue('montant', invoice.montantTTC || 0);
      }
    }
  }, [selectedInvoiceId, invoicesResponse, setValue]);

  const onSubmit = async (data: PaymentFormData) => {
    if (typeof remainingLimit === 'number' && data.montant > remainingLimit) {
      return;
    }
    try {
      await createMutation.mutateAsync(data);
    } catch {
      // errors are handled by react-query
    }
  };

  const isLoading = createMutation.isPending;

  const formatCurrency = (amount: number) =>
    `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0)} F CFA`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">Informations du paiement</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Saisissez le règlement en respectant la taille de votre écran et le contexte de la facture.
          </p>
        </div>

        {!invoiceId && (
          <div className="space-y-2">
            <Label htmlFor="factureId">Facture</Label>
            <select
              id="factureId"
              {...register('factureId')}
              className="h-11 w-full rounded-md border border-input bg-background px-3"
            >
              <option value="">Paiement non alloue</option>
              {(invoicesResponse?.data ?? [])
                .filter((invoice) => ['ENVOYEE', 'EMISE', 'EN_RETARD', 'PARTIELLEMENT_PAYEE'].includes(invoice.status))
                .map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.numeroFacture} - {formatCurrency(invoice.montantTTC || 0)}
                  </option>
                ))}
            </select>
            <p className="text-sm text-muted-foreground">
              Selectionnez une facture pour allouer automatiquement ce paiement.
            </p>
          </div>
        )}

        {invoiceId && (
          <div className="rounded-lg border bg-muted/20 p-4">
            <Label>Facture</Label>
            <div className="mt-2 min-w-0 space-y-1">
              <p className="truncate font-medium">{invoiceNumber || invoiceId}</p>
              {remainingAmount !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Montant restant : {formatCurrency(remainingAmount)}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="montant">Montant *</Label>
            <Input
              id="montant"
              type="number"
              step="0.01"
              min="0.01"
              max={remainingLimit}
              {...register('montant', {
                valueAsNumber: true,
                validate: (value) =>
                  typeof remainingLimit !== 'number' ||
                  value <= remainingLimit ||
                  'Le montant dépasse le reste à payer de la facture',
              })}
              className="h-11"
            />
            {errors.montant && <p className="text-sm text-red-500">{errors.montant.message}</p>}
            {typeof remainingLimit === 'number' && (
              <p className="text-xs text-muted-foreground">
                Montant maximum : {formatCurrency(remainingLimit)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="datePaiement">Date de paiement *</Label>
            <Input id="datePaiement" type="date" {...register('datePaiement')} className="h-11" />
            {errors.datePaiement && <p className="text-sm text-red-500">{errors.datePaiement.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="modePaiement">Methode de paiement *</Label>
            <select
              id="modePaiement"
              {...register('modePaiement')}
              className="h-11 w-full rounded-md border border-input bg-background px-3"
            >
              <option value="VIREMENT">Virement bancaire</option>
              <option value="ESPECES">Especes</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CARTE">Carte bancaire</option>
            </select>
            {errors.modePaiement && <p className="text-sm text-red-500">{errors.modePaiement.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="treasuryAccountId">Compte de tresorerie</Label>
            <select
              id="treasuryAccountId"
              {...register('treasuryAccountId')}
              className="h-11 w-full rounded-md border border-input bg-background px-3"
            >
              <option value="">Selectionner un compte</option>
              {filteredTreasuryAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {selectedMethod === 'ESPECES' ? 'Caisse de decaissement/encaissement' : 'Compte bancaire utilise'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              {...register('reference')}
              placeholder="Numero de transaction, cheque, etc."
              className="h-11"
            />
            <p className="text-sm text-muted-foreground">
              Reference de virement, numero de cheque ou code de transaction.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            {...register('notes')}
            rows={4}
            className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2"
            placeholder="Notes internes..."
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-4 border-t pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre a jour' : 'Enregistrer le paiement'}
        </Button>
      </div>
    </form>
  );
}
