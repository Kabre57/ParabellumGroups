'use client';

import React, { useState } from 'react';
import { useQuotes, useDeleteQuote, useConvertQuoteToInvoice } from '@/hooks/useQuotes';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import QuotePrint from '@/components/PrintComponents/QuotePrint';
import { Plus, Printer, Edit, Trash2, Search, FileCheck } from 'lucide-react';

const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyé',
  ACCEPTED: 'Accepté',
  REJECTED: 'Rejeté',
  EXPIRED: 'Expiré',
  CONVERTED: 'Converti',
};

export default function QuotesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [showPrint, setShowPrint] = useState(false);

  const { data, isLoading, error } = useQuotes({ search: searchTerm });
  const deleteMutation = useDeleteQuote();
  const convertMutation = useConvertQuoteToInvoice();

  const handlePrint = (quote: any) => {
    setSelectedQuote(quote);
    setShowPrint(true);
  };

  const handleConvert = (id: string) => {
    if (confirm('Voulez-vous convertir ce devis en facture ?')) {
      convertMutation.mutate(id);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
    }).format(amount);
  };

  const calculateTotal = (items: any[]) => {
    return items?.reduce((sum, item) => {
      const subtotal = item.quantity * item.unitPrice;
      const vat = subtotal * (item.vatRate / 100);
      return sum + subtotal + vat;
    }, 0) || 0;
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="text-red-600">
            Erreur lors du chargement des devis: {error.message}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Devis</h1>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouveau devis
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Rechercher un devis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    N° Devis
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Client
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Validité
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Montant TTC
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Statut
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.map((quote: any) => (
                  <tr
                    key={quote.id}
                    className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm text-gray-900 dark:text-white">
                        {quote.quoteNumber || quote.quote_number}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {quote.customer?.name || 'Client non spécifié'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {quote.customer?.email}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {formatDate(quote.date)}
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {quote.validUntil || quote.valid_until
                        ? formatDate(quote.validUntil || quote.valid_until)
                        : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(quote.totalTTC || quote.total_ttc || calculateTotal(quote.items))}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          quote.status === 'ACCEPTED'
                            ? 'bg-green-100 text-green-800'
                            : quote.status === 'SENT'
                            ? 'bg-blue-100 text-blue-800'
                            : quote.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : quote.status === 'CONVERTED'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {statusLabels[quote.status] || quote.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        {quote.status === 'ACCEPTED' && quote.status !== 'CONVERTED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConvert(quote.id)}
                            disabled={convertMutation.isPending}
                            className="flex items-center gap-1 text-purple-600"
                          >
                            <FileCheck className="w-3 h-3" />
                            Convertir
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrint(quote)}
                          className="flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          Imprimer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(quote.id)}
                          disabled={deleteMutation.isPending}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data?.length === 0 && (
              <div className="text-center py-8 text-gray-500">Aucun devis trouvé</div>
            )}
          </div>
        )}

        {data && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Total: {data.length} devis
          </div>
        )}
      </Card>

      {showPrint && selectedQuote && (
        <QuotePrint
          quote={selectedQuote}
          onClose={() => {
            setShowPrint(false);
            setSelectedQuote(null);
          }}
        />
      )}
    </div>
  );
}
