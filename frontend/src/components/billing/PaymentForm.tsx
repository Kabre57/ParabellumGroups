'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingService } from '@/shared/api/services/billing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

const paymentSchema = z.object({
  invoice_num: z.string().optional(),
  amount: z.number().min(0.01, 'Le montant doit être supérieur à 0'),
  payment_date: z.string().min(1, 'La date de paiement est requise'),
  method: z.string().min(1, 'La méthode de paiement est requise'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  payment?: any;
  invoiceNum?: string;
  remainingAmount?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function PaymentForm({
  payment,
  invoiceNum,
  remainingAmount,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!payment;

  const { data: invoices } = useQuery({
    queryKey: ['unpaidInvoices'],
    queryFn: async () => {
      const data = await billingService.getInvoices({ 
        status: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] 
      });
      return data;
    },
    enabled: !invoiceNum, // Ne charger que si pas de facture pré-sélectionnée
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
          invoice_num: payment.invoice_num,
          amount: payment.amount,
          payment_date: payment.payment_date,
          method: payment.method,
          reference: payment.reference || '',
          notes: payment.notes || '',
        }
      : {
          invoice_num: invoiceNum || '',
          amount: remainingAmount || 0,
          payment_date: new Date().toISOString().split('T')[0],
          method: 'BANK_TRANSFER',
          reference: '',
          notes: '',
        },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const payment = await billingService.createPayment(data);
      
      // Si une facture est sélectionnée, allouer automatiquement le paiement
      if (data.invoice_num) {
        await billingService.allocatePayment(
          payment.payment_id,
          data.invoice_num,
          data.amount
        );
      }
      
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (invoiceNum) {
        queryClient.invalidateQueries({ queryKey: ['invoice', invoiceNum] });
        queryClient.invalidateQueries({ queryKey: ['invoicePayments', invoiceNum] });
      }
      onSuccess?.();
    },
  });

  const selectedInvoiceNum = watch('invoice_num');

  // Mettre à jour le montant automatiquement quand une facture est sélectionnée
  useEffect(() => {
    if (selectedInvoiceNum && invoices) {
      const invoice = invoices.find((inv) => inv.invoice_num === selectedInvoiceNum);
      if (invoice) {
        // Calculer le montant restant (total - paiements déjà effectués)
        // Pour l'instant, on utilise le total de la facture
        setValue('amount', invoice.total_ttc);
      }
    }
  }, [selectedInvoiceNum, invoices, setValue]);

  const onSubmit = (data: PaymentFormData) => {
    const paymentData = {
      invoice_num: data.invoice_num,
      amount: data.amount,
      payment_date: data.payment_date,
      method: data.method,
      reference: data.reference,
      notes: data.notes,
    };

    createMutation.mutate(paymentData);
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
          {!invoiceNum && (
            <div>
              <Label htmlFor="invoice_num">Facture (optionnel)</Label>
              <select
                id="invoice_num"
                {...register('invoice_num')}
                className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
              >
                <option value="">Paiement non alloué</option>
                {invoices?.map((invoice) => (
                  <option key={invoice.invoice_num} value={invoice.invoice_num}>
                    INV-{invoice.invoice_num} - {formatCurrency(invoice.total_ttc)} - Client #{invoice.customer_id}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Sélectionnez une facture pour allouer automatiquement ce paiement
              </p>
            </div>
          )}

          {invoiceNum && (
            <div>
              <Label>Facture</Label>
              <div className="mt-1 p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                <p className="font-medium">INV-{invoiceNum}</p>
                {remainingAmount !== undefined && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Montant restant: {formatCurrency(remainingAmount)}
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="amount">Montant *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              {...register('amount', { valueAsNumber: true })}
              className="mt-1"
            />
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="payment_date">Date de paiement *</Label>
            <Input
              id="payment_date"
              type="date"
              {...register('payment_date')}
              className="mt-1"
            />
            {errors.payment_date && (
              <p className="text-sm text-red-500 mt-1">{errors.payment_date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="method">Méthode de paiement *</Label>
            <select
              id="method"
              {...register('method')}
              className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
            >
              <option value="BANK_TRANSFER">Virement bancaire</option>
              <option value="CASH">Espèces</option>
              <option value="CHECK">Chèque</option>
              <option value="CREDIT_CARD">Carte bancaire</option>
            </select>
            {errors.method && (
              <p className="text-sm text-red-500 mt-1">{errors.method.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="reference">Référence</Label>
            <Input
              id="reference"
              {...register('reference')}
              placeholder="Numéro de transaction, chèque, etc."
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Numéro de transaction, référence de virement, numéro de chèque, etc.
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
          {isLoading ? 'Enregistrement...' : 'Enregistrer le paiement'}
        </Button>
      </div>
    </form>
  );
}
