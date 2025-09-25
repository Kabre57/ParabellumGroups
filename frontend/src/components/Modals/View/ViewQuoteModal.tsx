import React from 'react';
import { X, FileText, Calendar, User, Building } from 'lucide-react';

interface ViewQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: any;
}

export const ViewQuoteModal: React.FC<ViewQuoteModalProps> = ({ isOpen, onClose, quote }) => {
  if (!isOpen || !quote) return null;

  const calculateItemTotal = (item: any) => {
    const totalHt = item.quantity * item.unitPriceHt * (1 - item.discountRate / 100);
    const vat = totalHt * (item.vatRate / 100);
    return totalHt + vat;
  };

  const calculateTotal = () => {
    return quote.items.reduce((total: number, item: any) => {
      return total + calculateItemTotal(item);
    }, 0);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Devis {quote.quoteNumber}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <div className="flex items-center">
                <User className="text-gray-400 h-4 w-4 mr-2" />
                <span>{quote.customer.name} ({quote.customer.customerNumber})</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date du devis</label>
              <div className="flex items-center">
                <Calendar className="text-gray-400 h-4 w-4 mr-2" />
                <span>{new Date(quote.quoteDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valide jusqu'au</label>
            <span>{new Date(quote.validUntil).toLocaleDateString()}</span>
          </div>

          {/* Articles */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Articles</h4>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prix unitaire HT</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remise</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">TVA</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total TTC</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quote.items.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'XOF'
                        }).format(item.unitPriceHt)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.discountRate}%</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.vatRate}%</td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'XOF'
                        }).format(calculateItemTotal(item))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="text-lg font-semibold text-gray-900">
                Total TTC: {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF'
                }).format(calculateTotal())}
              </div>
            </div>
          </div>

          {/* Conditions et notes */}
          {(quote.terms || quote.notes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              {quote.terms && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conditions</label>
                  <p className="text-sm text-gray-600">{quote.terms}</p>
                </div>
              )}
              {quote.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-sm text-gray-600">{quote.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Statut */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
              {quote.status}
            </span>
          </div>

          {/* Bouton de fermeture */}
          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};