'use client';

import React from 'react';
import PrintLayout from './PrintLayout';

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

interface QuotePrintProps {
  quote: {
    id: string;
    quoteNumber: string;
    date: string;
    validUntil?: string;
    customer: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    items: QuoteItem[];
    notes?: string;
    createdBy?: {
      firstName: string;
      lastName: string;
    };
    status: string;
  };
  onClose: () => void;
}

export default function QuotePrint({ quote, onClose }: QuotePrintProps) {
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

  const calculateItemTotal = (item: QuoteItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const vat = subtotal * (item.vatRate / 100);
    return subtotal + vat;
  };

  const calculateSubtotal = () => {
    return quote.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const calculateTotalVAT = () => {
    return quote.items.reduce((sum, item) => {
      const subtotal = item.quantity * item.unitPrice;
      return sum + subtotal * (item.vatRate / 100);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTotalVAT();
  };

  return (
    <PrintLayout
      title="Devis"
      subtitle={`N° ${quote.quoteNumber}`}
      meta={`Date: ${formatDate(quote.date)}${quote.validUntil ? `\nValable jusqu'au: ${formatDate(quote.validUntil)}` : ''}`}
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase">Client:</h3>
          <div className="pl-4">
            <p className="font-bold text-gray-800">{quote.customer.name}</p>
            {quote.customer.email && (
              <p className="text-sm text-gray-600">{quote.customer.email}</p>
            )}
            {quote.customer.phone && (
              <p className="text-sm text-gray-600">{quote.customer.phone}</p>
            )}
            {quote.customer.address && (
              <p className="text-sm text-gray-600">{quote.customer.address}</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase">Détails du devis:</h3>
          <div className="pl-4 text-sm">
            <p className="text-gray-700">
              <span className="font-semibold">Date d'émission:</span> {formatDate(quote.date)}
            </p>
            {quote.validUntil && (
              <p className="text-gray-700">
                <span className="font-semibold">Validité:</span> {formatDate(quote.validUntil)}
              </p>
            )}
            {quote.createdBy && (
              <p className="text-gray-700">
                <span className="font-semibold">Créé par:</span>{' '}
                {quote.createdBy.firstName} {quote.createdBy.lastName}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase bg-green-100 px-4 py-2">
          Articles proposés
        </h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-green-600 text-white">
              <th className="text-left py-3 px-4 font-semibold">Description</th>
              <th className="text-right py-3 px-4 font-semibold">Qté</th>
              <th className="text-right py-3 px-4 font-semibold">Prix Unit. HT</th>
              <th className="text-right py-3 px-4 font-semibold">TVA</th>
              <th className="text-right py-3 px-4 font-semibold">Total TTC</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, index) => (
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
          <div className="flex justify-between py-3 bg-green-600 text-white px-4 mt-2">
            <span className="font-bold text-lg">TOTAL TTC:</span>
            <span className="font-bold text-lg">{formatCurrency(calculateTotal())}</span>
          </div>
        </div>
      </div>

      {quote.notes && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase">Notes:</h3>
          <p className="text-sm text-gray-600 pl-4 whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}

      <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded">
        <h4 className="font-bold text-gray-700 mb-2">Conditions du devis:</h4>
        <ul className="text-xs text-gray-600 space-y-1 pl-4">
          <li>• Devis gratuit et sans engagement</li>
          <li>
            • Prix valables jusqu'au {quote.validUntil ? formatDate(quote.validUntil) : '30 jours'}
          </li>
          <li>• Prix exprimés en Francs CFA (XOF), TVA comprise</li>
          <li>• Conditions de paiement à définir lors de la signature du contrat</li>
          <li>• Les prix peuvent varier selon les conditions du marché</li>
        </ul>
      </div>

      <div className="mt-12 pt-8 border-t-2 border-gray-300">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="font-bold text-gray-700 mb-16">PARABELLUM GROUP</p>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">Signature et cachet</p>
            </div>
          </div>
          <div>
            <p className="font-bold text-gray-700 mb-2">BON POUR ACCORD</p>
            <p className="text-xs text-gray-600 mb-14">
              Le client (signature précédée de "Bon pour accord")
            </p>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">Signature du client</p>
            </div>
          </div>
        </div>
      </div>
    </PrintLayout>
  );
}
