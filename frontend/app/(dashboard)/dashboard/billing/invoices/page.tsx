'use client';

import React, { useState } from 'react';
import { useInvoices, useDeleteInvoice } from '@/hooks/useInvoices';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import InvoicePrint from '@/components/printComponents/InvoicePrint';
import { Plus, Printer, Edit, Trash2, Search, AlertCircle } from 'lucide-react';

const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PENDING: 'En attente',
  PAID: 'Payée',
  PARTIAL: 'Partiellement payée',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
};

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showPrint, setShowPrint] = useState(false);

  const { data, isLoading, error } = useInvoices({ search: searchTerm });
  const deleteMutation = useDeleteInvoice();

  const handlePrint = (invoice: any) => {
    setSelectedInvoice(invoice);
    setShowPrint(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
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

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'PAID' || status === 'CANCELLED') return false;
    return new Date(dueDate) < new Date();
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="text-red-600">
            Erreur lors du chargement des factures: {error.message}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Factures</h1>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle facture
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Rechercher une facture..."
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
                    N° Facture
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Client
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Échéance
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
                {data?.map((invoice: any) => {
                  const overdue = isOverdue(invoice.dueDate || invoice.due_date, invoice.status);
                  
                  return (
                    <tr
                      key={invoice.id}
                      className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-900 dark:text-white">
                            {invoice.invoiceNumber || invoice.invoice_number}
                          </span>
                          {overdue && (
                            <AlertCircle className="w-4 h-4 text-red-500" title="En retard" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {invoice.customer?.name || 'Client non spécifié'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {invoice.customer?.email}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={overdue ? 'text-red-600 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                          {invoice.dueDate || invoice.due_date
                            ? formatDate(invoice.dueDate || invoice.due_date)
                            : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(invoice.totalTTC || invoice.total_ttc || calculateTotal(invoice.items))}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            invoice.status === 'PAID'
                              ? 'bg-green-100 text-green-800'
                              : invoice.status === 'SENT' || invoice.status === 'PENDING'
                              ? 'bg-blue-100 text-blue-800'
                              : invoice.status === 'OVERDUE'
                              ? 'bg-red-100 text-red-800'
                              : invoice.status === 'PARTIAL'
                              ? 'bg-orange-100 text-orange-800'
                              : invoice.status === 'CANCELLED'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {statusLabels[invoice.status] || invoice.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(invoice)}
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
                            onClick={() => handleDelete(invoice.id)}
                            disabled={deleteMutation.isPending}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {data?.length === 0 && (
              <div className="text-center py-8 text-gray-500">Aucune facture trouvée</div>
            )}
          </div>
        )}

        {data && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Total: {data.length} facture(s)
          </div>
        )}
      </Card>

      {showPrint && selectedInvoice && (
        <InvoicePrint
          invoice={selectedInvoice}
          onClose={() => {
            setShowPrint(false);
            setSelectedInvoice(null);
          }}
        />
      )}
    </div>
  );
}
