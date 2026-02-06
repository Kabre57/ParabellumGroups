'use client';

import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingService } from '@/shared/api/billing';
import { crmService } from '@/shared/api/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

const lineItemSchema = z.object({
  description: z.string().min(1, 'La description est requise'),
  quantity: z.number().min(1, 'La quantité doit être supérieure à 0'),
  unit_price: z.number().min(0, 'Le prix unitaire doit être positif'),
});

const invoiceSchema = z.object({
  customer_id: z.string().min(1, 'Le client est requis'),
  issue_date: z.string().min(1, 'La date d\'émission est requise'),
  due_date: z.string().min(1, 'La date d\'échéance est requise'),
  status: z.string().default('DRAFT'),
  line_items: z.array(lineItemSchema).min(1, 'Au moins une ligne est requise'),
  notes: z.string().optional(),
  tax_rate: z.number().min(0).max(100).default(20),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoice?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function InvoiceForm({ invoice, onSuccess, onCancel }: InvoiceFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!invoice;

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await crmService.getCustomers({ pageSize: 100 });
      return response.data;
    },
  });

  const mapLineItems = (
    items?: Array<{ description?: string; quantity?: number; unitPrice?: number; unit_price?: number }>
  ) => {
    if (!items || items.length === 0) {
      return [{ description: '', quantity: 1, unit_price: 0 }];
    }
    return items.map((item) => ({
      description: item.description || '',
      quantity: item.quantity ?? 1,
      unit_price: item.unitPrice ?? item.unit_price ?? 0,
    }));
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    setValue,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: invoice
      ? {
          customer_id: (invoice.customerId || invoice.customer_id || '').toString(),
          issue_date: invoice.issueDate || invoice.issue_date || invoice.date || '',
          due_date: invoice.dueDate || invoice.due_date || '',
          status: invoice.status,
          line_items: mapLineItems(invoice.items || invoice.line_items),
          notes: invoice.notes || '',
          tax_rate: invoice.tax_rate || 20,
        }
      : {
          customer_id: '',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'DRAFT',
          line_items: [{ description: '', quantity: 1, unit_price: 0 }],
          notes: '',
          tax_rate: 20,
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'line_items',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => billingService.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => billingService.updateInvoice(invoice.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
      onSuccess?.();
    },
  });

  const lineItems = watch('line_items');
  const taxRate = watch('tax_rate');

  // Calcul automatique des totaux
  const subtotal = lineItems.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    return sum + quantity * unitPrice;
  }, 0);

  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const onSubmit = (data: InvoiceFormData) => {
    const invoiceData = {
      customer_id: data.customer_id,
      issue_date: data.issue_date,
      due_date: data.due_date,
      status: data.status,
      total_ht: subtotal,
      tax_rate: data.tax_rate,
      tax_amount: taxAmount,
      total_ttc: total,
      line_items: data.line_items,
      notes: data.notes,
    };

    if (isEditing) {
      updateMutation.mutate(invoiceData);
    } else {
      createMutation.mutate(invoiceData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customer_id">Client *</Label>
            <select
              id="customer_id"
              {...register('customer_id')}
              className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
            >
            <option value="">Sélectionner un client</option>
            {customers?.map((customer) => {
              const name = customer.raisonSociale || customer.nom || customer.reference || customer.email || customer.id;
              const email = customer.email ? ` - ${customer.email}` : '';
              return (
                <option key={customer.id} value={customer.id}>
                  {`${name}${email}`}
                </option>
              );
            })}
            </select>
            {errors.customer_id && (
              <p className="text-sm text-red-500 mt-1">{errors.customer_id.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="status">Statut *</Label>
            <select
              id="status"
              {...register('status')}
              className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
            >
              <option value="DRAFT">Brouillon</option>
              <option value="SENT">Envoyée</option>
              <option value="PAID">Payée</option>
              <option value="OVERDUE">En retard</option>
              <option value="CANCELLED">Annulée</option>
            </select>
          </div>

          <div>
            <Label htmlFor="issue_date">Date d'émission *</Label>
            <Input
              id="issue_date"
              type="date"
              {...register('issue_date')}
              className="mt-1"
            />
            {errors.issue_date && (
              <p className="text-sm text-red-500 mt-1">{errors.issue_date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="due_date">Date d'échéance *</Label>
            <Input
              id="due_date"
              type="date"
              {...register('due_date')}
              className="mt-1"
            />
            {errors.due_date && (
              <p className="text-sm text-red-500 mt-1">{errors.due_date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="tax_rate">Taux de TVA (%)</Label>
            <Input
              id="tax_rate"
              type="number"
              step="0.01"
              {...register('tax_rate', { valueAsNumber: true })}
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Lignes de facturation</h3>
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}
          >
            + Ajouter une ligne
          </Button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-4 items-start">
              <div className="col-span-5">
                <Label htmlFor={`line_items.${index}.description`}>
                  Description
                </Label>
                <Input
                  id={`line_items.${index}.description`}
                  {...register(`line_items.${index}.description`)}
                  placeholder="Description du service/produit"
                  className="mt-1"
                />
                {errors.line_items?.[index]?.description && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.line_items[index]?.description?.message}
                  </p>
                )}
              </div>

              <div className="col-span-2">
                <Label htmlFor={`line_items.${index}.quantity`}>
                  Quantité
                </Label>
                <Input
                  id={`line_items.${index}.quantity`}
                  type="number"
                  min="1"
                  {...register(`line_items.${index}.quantity`, { valueAsNumber: true })}
                  className="mt-1"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor={`line_items.${index}.unit_price`}>
                  Prix unitaire
                </Label>
                <Input
                  id={`line_items.${index}.unit_price`}
                  type="number"
                  step="0.01"
                  min="0"
                  {...register(`line_items.${index}.unit_price`, { valueAsNumber: true })}
                  className="mt-1"
                />
              </div>

              <div className="col-span-2">
                <Label>Total</Label>
                <div className="mt-1 h-10 flex items-center font-medium">
                  {formatCurrency(
                    (lineItems[index]?.quantity || 0) * (lineItems[index]?.unit_price || 0)
                  )}
                </div>
              </div>

              <div className="col-span-1 flex items-end">
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => remove(index)}
                    className="h-10 w-10 p-0"
                  >
                    ✕
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totaux */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Sous-total</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Taxe ({taxRate}%)
                </span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total TTC</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Notes</h3>
        <div>
          <Label htmlFor="notes">Notes internes</Label>
          <textarea
            id="notes"
            {...register('notes')}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-input bg-background mt-1"
            placeholder="Notes ou conditions particulières..."
          />
        </div>
      </Card>

      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
}
