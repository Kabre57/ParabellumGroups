'use client';

import React, { useState, useEffect } from 'react';
import { useCreateQuote, useUpdateQuote } from '@/hooks/useQuotes';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

interface QuoteFormProps {
  quote?: any;
  customers?: any[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function QuoteForm({ quote, customers = [], onSuccess, onCancel }: QuoteFormProps) {
  const [formData, setFormData] = useState({
    customerId: quote?.clientId || quote?.customerId || quote?.customer_id || '',
    quoteNumber: quote?.numeroDevis || quote?.quoteNumber || quote?.quote_number || `DEVIS-${Date.now()}`,
    date: quote?.dateDevis || quote?.date || new Date().toISOString().split('T')[0],
    validUntil: quote?.dateValidite || quote?.validUntil || quote?.valid_until || '',
    notes: quote?.notes || '',
    status: quote?.status || 'BROUILLON',
  });

  const [items, setItems] = useState<QuoteItem[]>(
    quote?.lignes || quote?.items || [{ description: '', quantity: 1, unitPrice: 0, vatRate: 18 }]
  );

  const [calculations, setCalculations] = useState({
    totalHT: 0,
    totalVAT: 0,
    totalTTC: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateQuote();
  const updateMutation = useUpdateQuote();

  // Calculs automatiques
  useEffect(() => {
    const totalHT = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const totalVAT = items.reduce((sum, item) => {
      const subtotal = item.quantity * item.unitPrice;
      return sum + subtotal * (item.vatRate / 100);
    }, 0);
    const totalTTC = totalHT + totalVAT;

    setCalculations({ totalHT, totalVAT, totalTTC });
  }, [items]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, vatRate: 18 }]);
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerId) newErrors.customerId = 'Client requis';
    if (!formData.quoteNumber) newErrors.quoteNumber = 'Numéro de devis requis';
    if (!formData.date) newErrors.date = 'Date requise';
    
    const hasEmptyItems = items.some((item) => !item.description || item.quantity <= 0);
    if (hasEmptyItems) newErrors.items = 'Tous les articles doivent avoir une description et une quantité';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const lignes = items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
    }));

    const createPayload = {
      clientId: formData.customerId,
      dateDevis: formData.date,
      dateValidite: formData.validUntil,
      lignes,
      notes: formData.notes,
    };

    const updatePayload = {
      ...createPayload,
      status: formData.status,
    };

    try {
      if (quote?.id) {
        await updateMutation.mutateAsync({
          id: quote.id,
          data: updatePayload,
        });
      } else {
        await createMutation.mutateAsync(createPayload);
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error saving quote:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
    }).format(amount);
  };

  const calculateItemTotal = (item: QuoteItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const vat = subtotal * (item.vatRate / 100);
    return subtotal + vat;
  };

  return (
    <Card className="p-6 max-w-5xl">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        {quote ? 'Modifier le devis' : 'Nouveau devis'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client */}
          <div>
            <Label htmlFor="customerId">Client *</Label>
            <select
              id="customerId"
              value={formData.customerId}
              onChange={(e) => handleChange('customerId', e.target.value)}
              className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.customerId ? 'border-red-500' : ''}`}
            >
              <option value="">Sélectionner un client</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {errors.customerId && (
              <p className="text-sm text-red-600 mt-1">{errors.customerId}</p>
            )}
          </div>

          {/* Numéro devis */}
          <div>
            <Label htmlFor="quoteNumber">N° Devis *</Label>
            <Input
              id="quoteNumber"
              type="text"
              value={formData.quoteNumber}
              onChange={(e) => handleChange('quoteNumber', e.target.value)}
              className={errors.quoteNumber ? 'border-red-500' : ''}
            />
            {errors.quoteNumber && (
              <p className="text-sm text-red-600 mt-1">{errors.quoteNumber}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Date */}
          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className={errors.date ? 'border-red-500' : ''}
            />
            {errors.date && <p className="text-sm text-red-600 mt-1">{errors.date}</p>}
          </div>

          {/* Validité */}
          <div>
            <Label htmlFor="validUntil">Valide jusqu'au</Label>
            <Input
              id="validUntil"
              type="date"
              value={formData.validUntil}
              onChange={(e) => handleChange('validUntil', e.target.value)}
            />
          </div>

          {/* Statut */}
          <div>
            <Label htmlFor="status">Statut</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="BROUILLON">Brouillon</option>
              <option value="ENVOYE">Envoyé</option>
              <option value="ACCEPTE">Accepté</option>
              <option value="REFUSE">Rejeté</option>
            </select>
          </div>
        </div>

        {/* Articles */}
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              Articles / Services
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>

          {errors.items && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              {errors.items}
            </div>
          )}

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-white dark:bg-gray-800 rounded border">
                <div className="col-span-5">
                  <Label>Description *</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Description de l'article..."
                  />
                </div>
                <div className="col-span-2">
                  <Label>Qté *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, 'quantity', parseFloat(e.target.value))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label>Prix Unit. HT</Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(index, 'unitPrice', parseFloat(e.target.value))
                    }
                  />
                </div>
                <div className="col-span-1">
                  <Label>TVA %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={item.vatRate}
                    onChange={(e) =>
                      updateItem(index, 'vatRate', parseFloat(e.target.value))
                    }
                  />
                </div>
                <div className="col-span-1">
                  <Label>Total TTC</Label>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white pt-2">
                    {formatCurrency(calculateItemTotal(item))}
                  </div>
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totaux */}
        <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
          <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">Totaux</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">Total HT:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(calculations.totalHT)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">Total TVA:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(calculations.totalVAT)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t-2 border-gray-400">
              <span className="text-lg font-bold text-gray-900 dark:text-white">Total TTC:</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(calculations.totalTTC)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes / Conditions</Label>
          <Textarea
            id="notes"
            rows={4}
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Conditions de paiement, garanties, notes supplémentaires..."
          />
        </div>

        {/* Boutons */}
        <div className="flex justify-end gap-4 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Annuler
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Enregistrement...' : quote ? 'Modifier' : 'Créer'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

