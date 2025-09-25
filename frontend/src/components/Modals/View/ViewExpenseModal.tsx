// components/Modals/View/ViewExpenseModal.tsx
import React from 'react';
import { X, DollarSign, Calendar, User, Tag, FileText, CheckCircle, Clock, Download } from 'lucide-react';

interface ViewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: any;
}

export const ViewExpenseModal: React.FC<ViewExpenseModalProps> = ({ isOpen, onClose, expense }) => {
  if (!isOpen || !expense) return null;

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
      'PAID': 'bg-green-100 text-green-800',
      'REIMBURSED': 'bg-blue-100 text-blue-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'PENDING': 'En attente',
      'PAID': 'Payée',
      'REIMBURSED': 'Remboursée',
      'CANCELLED': 'Annulée'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      'PENDING': Clock,
      'PAID': CheckCircle,
      'REIMBURSED': CheckCircle,
      'CANCELLED': X
    };
    return icons[status as keyof typeof icons] || Clock;
  };

  const StatusIcon = getStatusIcon(expense.status);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Détails de la Dépense
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* En-tête avec montant et statut */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(expense.amount)}</div>
                <div className="text-sm text-gray-600">{expense.category}</div>
              </div>
              <div className={`p-2 rounded-full ${getStatusColor(expense.status)}`}>
                <StatusIcon className="h-6 w-6" />
              </div>
            </div>
            <div className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(expense.status)}`}>
              {getStatusLabel(expense.status)}
            </div>
          </div>

          {/* Informations de base */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <div className="flex items-center text-sm text-gray-900">
                <FileText className="h-4 w-4 mr-2 text-gray-400" />
                {expense.description}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employé</label>
                <div className="flex items-center text-sm text-gray-900">
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  {expense.employee?.firstName} {expense.employee?.lastName}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <div className="flex items-center text-sm text-gray-900">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {formatDate(expense.date)}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <div className="flex items-center text-sm text-gray-900">
                <Tag className="h-4 w-4 mr-2 text-gray-400" />
                {expense.category}
              </div>
            </div>
          </div>

          {/* Justificatif */}
          {expense.receiptUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Justificatif</label>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-sm text-gray-700">Document joint</span>
                </div>
                <a 
                  href={expense.receiptUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger
                </a>
              </div>
            </div>
          )}

          {/* Notes */}
          {expense.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{expense.notes}</p>
              </div>
            </div>
          )}

          {/* Informations système */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Informations système</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Créée par:</span>
                <span className="ml-2 font-medium">
                  {expense.creator?.firstName} {expense.creator?.lastName}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Date création:</span>
                <span className="ml-2 font-medium">{formatDate(expense.createdAt)}</span>
              </div>
              <div>
                <span className="text-gray-600">Devise:</span>
                <span className="ml-2 font-medium">{expense.currency}</span>
              </div>
              <div>
                <span className="text-gray-600">Dernière modification:</span>
                <span className="ml-2 font-medium">{formatDate(expense.updatedAt)}</span>
              </div>
            </div>
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