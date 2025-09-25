// components/Modals/View/ViewPurchaseOrderModal.tsx
import React from 'react';
import { X, ShoppingCart, Calendar, Truck, User, FileText, DollarSign, Package } from 'lucide-react';

interface ViewPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: any;
}

export const ViewPurchaseOrderModal: React.FC<ViewPurchaseOrderModalProps> = ({ isOpen, onClose, purchase }) => {
  if (!isOpen || !purchase) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800',
      'PARTIALLY_RECEIVED': 'bg-blue-100 text-blue-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'PENDING': 'En attente',
      'APPROVED': 'Approuvée',
      'REJECTED': 'Rejetée',
      'PARTIALLY_RECEIVED': 'Partiellement reçue',
      'COMPLETED': 'Terminée',
      'CANCELLED': 'Annulée'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const calculateItemTotal = (item: any) => {
    return item.quantity * item.unitPriceHt * (1 + (item.vatRate || 0) / 100);
  };

  const calculateTotal = () => {
    return purchase.items?.reduce((sum: number, item: any) => sum + calculateItemTotal(item), 0) || 0;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Commande d'Achat {purchase.orderNumber}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* En-tête */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Truck className="h-5 w-5 mr-2 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Fournisseur</span>
              </div>
              <div className="text-lg font-semibold">{purchase.supplier?.name}</div>
              <div className="text-sm text-gray-600">{purchase.supplier?.contactName}</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Date commande</span>
              </div>
              <div className="text-lg font-semibold">{formatDate(purchase.orderDate)}</div>
              <div className="text-sm text-gray-600">
                Livraison: {purchase.expectedDate ? formatDate(purchase.expectedDate) : 'Non définie'}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <FileText className="h-5 w-5 mr-2 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Statut</span>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(purchase.status)}`}>
                {getStatusLabel(purchase.status)}
              </span>
              <div className="text-sm text-gray-600 mt-1">
                Total: {formatCurrency(calculateTotal())}
              </div>
            </div>
          </div>

          {/* Articles */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Articles commandés</h4>
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Article</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix HT</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TVA</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total TTC</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchase.items?.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 mr-2 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.description}</div>
                            {item.product && (
                              <div className="text-sm text-gray-500">SKU: {item.product.sku}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.unitPriceHt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.vatRate}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(calculateItemTotal(item))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-gray-900">Total TTC</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(calculateTotal())}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Informations supplémentaires */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Informations de livraison</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date de commande:</span>
                  <span className="font-medium">{formatDate(purchase.orderDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date livraison attendue:</span>
                  <span className="font-medium">
                    {purchase.expectedDate ? formatDate(purchase.expectedDate) : 'Non définie'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date livraison effective:</span>
                  <span className="font-medium">
                    {purchase.deliveryDate ? formatDate(purchase.deliveryDate) : 'En attente'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Informations de suivi</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Créée par:</span>
                  <span className="font-medium">
                    {purchase.requestedBy?.firstName} {purchase.requestedBy?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Approuvée par:</span>
                  <span className="font-medium">
                    {purchase.approvedBy ? 
                      `${purchase.approvedBy.firstName} ${purchase.approvedBy.lastName}` : 
                      'En attente'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dernière modification:</span>
                  <span className="font-medium">{formatDate(purchase.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {purchase.notes && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-2">Notes</h4>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{purchase.notes}</p>
              </div>
            </div>
          )}

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