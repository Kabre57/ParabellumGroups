'use client';

import React from 'react';
import PrintLayout from './PrintLayout';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

interface InvoicePrintProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    date: string;
    dueDate?: string;
    customer: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    items: InvoiceItem[];
    notes?: string;
    status: string;
  };
  onClose: () => void;
}

export default function InvoicePrint({ invoice, onClose }: InvoicePrintProps) {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
    }).format(amount);
  };

  const calculateItemTotal = (item: InvoiceItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const vat = subtotal * (item.vatRate / 100);
    return subtotal + vat;
  };

  const calculateSubtotal = () => {
    return invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const calculateTotalVAT = () => {
    return invoice.items.reduce((sum, item) => {
      const subtotal = item.quantity * item.unitPrice;
      return sum + subtotal * (item.vatRate / 100);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTotalVAT();
  };

  return (
    <PrintLayout
      title="Facture"
      subtitle={`N° ${invoice.invoiceNumber}`}
      meta={`Date: ${formatDate(invoice.date)}${invoice.dueDate ? `\nÉchéance: ${formatDate(invoice.dueDate)}` : ''}`}
      onClose={onClose}
    >
      <div className="mb-8">
        <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase">Facturé à:</h3>
        <div className="pl-4">
          <p className="font-bold text-gray-800">{invoice.customer.name}</p>
          {invoice.customer.email && (
            <p className="text-sm text-gray-600">{invoice.customer.email}</p>
          )}
          {invoice.customer.phone && (
            <p className="text-sm text-gray-600">{invoice.customer.phone}</p>
          )}
          {invoice.customer.address && (
            <p className="text-sm text-gray-600">{invoice.customer.address}</p>
          )}
        </div>
      </div>

      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="text-left py-3 px-4 font-semibold">Description</th>
              <th className="text-right py-3 px-4 font-semibold">Qté</th>
              <th className="text-right py-3 px-4 font-semibold">Prix Unit. HT</th>
              <th className="text-right py-3 px-4 font-semibold">TVA</th>
              <th className="text-right py-3 px-4 font-semibold">Total TTC</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-3 px-4 text-gray-700">{item.description}</td>
                <td className="text-right py-3 px-4 text-gray-700">{item.quantity}</td>
                <td className="text-right py-3 px-4 text-gray-700">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="text-right py-3 px-4 text-gray-700">{item.vatRate}%</td>
                <td className="text-right py-3 px-4 text-gray-700">
                  {formatCurrency(calculateItemTotal(item))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-700">Sous-total HT:</span>
            <span className="font-semibold text-gray-800">
              {formatCurrency(calculateSubtotal())}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-700">TVA:</span>
            <span className="font-semibold text-gray-800">
              {formatCurrency(calculateTotalVAT())}
            </span>
          </div>
          <div className="flex justify-between py-3 bg-blue-600 text-white px-4 mt-2">
            <span className="font-bold text-lg">TOTAL TTC:</span>
            <span className="font-bold text-lg">{formatCurrency(calculateTotal())}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase">Notes:</h3>
          <p className="text-sm text-gray-600 pl-4 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded">
        <h4 className="font-bold text-gray-700 mb-2">Conditions de paiement:</h4>
        <p className="text-xs text-gray-600">
          Paiement à effectuer dans les 30 jours suivant la date de facturation.
          <br />
          En cas de retard de paiement, des pénalités de 1,5% par mois seront appliquées.
          <br />
          Mode de paiement: Virement bancaire, chèque ou espèces.
        </p>
      </div>
    </PrintLayout>
  );
}
