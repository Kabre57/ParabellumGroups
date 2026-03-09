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
import { Card } from '@/components/ui/card';

const paymentSchema = z.object({
  factureId: z.string().optional(),
  montant: z.number().min(0.01, 'Le montant doit etre superieur a 0'),
  datePaiement: z.string().min(1, 'La date de paiement est requise'),
  modePaiement: z.string().min(1, 'La methode de paiement est requise'),
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
          reference: payment.reference || '',
          notes: payment.notes || '',
        }
      : {
          factureId: invoiceId || '',
          montant: remainingAmount || 0,
          datePaiement: new Date().toISOString().split('T')[0],
          modePaiement: 'VIREMENT',
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

  useEffect(() => {
    const invoices = invoicesResponse?.data ?? [];
    if (selectedInvoiceId && invoices.length > 0) {
      const invoice = invoices.find((inv) => inv.id === selectedInvoiceId);
      if (invoice) {
        setValue('montant', invoice.montantTTC || 0);
      }
    }
  }, [selectedInvoiceId, invoicesResponse, setValue]);

  const onSubmit = (data: PaymentFormData) => {
    createMutation.mutate(data);
  };

  const isLoading = createMutation.isPending;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Informations du paiement</h3>
        <div className="grid grid-cols-1 gap-4">
          {!invoiceId && (
            <div>
              <Label htmlFor="factureId">Facture (optionnel)</Label>
              <select
                id="factureId"
                {...register('factureId')}
                className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
              >
                <option value="">Paiement non alloue</option>
                {(invoicesResponse?.data ?? [])
                  .filter((invoice) => ['ENVOYEE', 'EN_RETARD', 'PARTIELLEMENT_PAYEE'].includes(invoice.status))
                  .map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.numeroFacture} - {formatCurrency(invoice.montantTTC || 0)}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Selectionnez une facture pour allouer automatiquement ce paiement
              </p>
            </div>
          )}

          {invoiceId && (
            <div>
              <Label>Facture</Label>
              <div className="mt-1 p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                <p className="font-medium">{invoiceNumber || invoiceId}</p>
                {remainingAmount !== undefined && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Montant restant: {formatCurrency(remainingAmount)}
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="montant">Montant *</Label>
            <Input
              id="montant"
              type="number"
              step="0.01"
              min="0.01"
              {...register('montant', { valueAsNumber: true })}
              className="mt-1"
            />
            {errors.montant && (
              <p className="text-sm text-red-500 mt-1">{errors.montant.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="datePaiement">Date de paiement *</Label>
            <Input id="datePaiement" type="date" {...register('datePaiement')} className="mt-1" />
            {errors.datePaiement && (
              <p className="text-sm text-red-500 mt-1">{errors.datePaiement.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="modePaiement">Methode de paiement *</Label>
            <select
              id="modePaiement"
              {...register('modePaiement')}
              className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
            >
              <option value="VIREMENT">Virement bancaire</option>
              <option value="ESPECES">Especes</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CARTE">Carte bancaire</option>
              <option value="PRELEVEMENT">Prelevement</option>
            </select>
            {errors.modePaiement && (
              <p className="text-sm text-red-500 mt-1">{errors.modePaiement.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              {...register('reference')}
              placeholder="Numero de transaction, cheque, etc."
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Numero de transaction, reference de virement, numero de cheque, etc.
            </p>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-input bg-background mt-1"
              placeholder="Notes internes..."
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-4">
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
