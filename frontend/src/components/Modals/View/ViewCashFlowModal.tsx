// components/Modals/View/ViewCashFlowModal.tsx
import React from 'react';
import { X, DollarSign, Calendar, FileText, TrendingUp, TrendingDown, User, CreditCard } from 'lucide-react';

interface ViewCashFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashFlow: any;
}

export const ViewCashFlowModal: React.FC<ViewCashFlowModalProps> = ({ isOpen, onClose, cashFlow }) => {
  if (!isOpen || !cashFlow) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getDocumentTypeLabel = (type: string) => {
    const types = {
      'INVOICE': 'Facture',
      'QUOTE': 'Devis',
      'PAYMENT': 'Paiement',
      'EXPENSE': 'Dépense',
      'SALARY': 'Salaire',
      'OTHER': 'Autre'
    };
    return types[type as keyof typeof types] || type;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Détails du Flux de Trésorerie
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* En-tête avec montant */}
          <div className={`p-4 rounded-lg ${
            cashFlow.type === 'INFLOW' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600">Montant</div>
                <div className={`text-2xl font-bold ${
                  cashFlow.type === 'INFLOW' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {cashFlow.type === 'INFLOW' ? '+' : '-'}{formatCurrency(cashFlow.amount)}
                </div>
              </div>
              <div className={`p-2 rounded-full ${
                cashFlow.type === 'INFLOW' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {cashFlow.type === 'INFLOW' ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                )}
              </div>
            </div>
          </div>

          {/* Informations de base */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <div className="flex items-center text-sm text-gray-900">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                {formatDate(cashFlow.date)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                cashFlow.type === 'INFLOW' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {cashFlow.type === 'INFLOW' ? 'Entrée' : 'Sortie'}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <div className="flex items-center text-sm text-gray-900">
              <FileText className="h-4 w-4 mr-2 text-gray-400" />
              {cashFlow.description}
            </div>
          </div>

          {/* Compte */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Compte</label>
            <div className="text-sm text-gray-900">
              {cashFlow.account?.accountNumber} - {cashFlow.account?.name}
            </div>
            <div className="text-sm text-gray-500">
              Solde: {formatCurrency(cashFlow.account?.balance || 0)}
            </div>
          </div>

          {/* Document source */}
          {(cashFlow.sourceDocumentType || cashFlow.sourceDocumentId) && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-2">Document Source</h4>
              <div className="grid grid-cols-2 gap-4">
                {cashFlow.sourceDocumentType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <span className="text-sm text-gray-900">
                      {getDocumentTypeLabel(cashFlow.sourceDocumentType)}
                    </span>
                  </div>
                )}
                {cashFlow.sourceDocumentId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
                    <span className="text-sm font-mono text-gray-900">
                      #{cashFlow.sourceDocumentId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Informations de création */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-2">Informations Système</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Créé par</label>
                <div className="flex items-center text-gray-900">
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  {cashFlow.creator?.firstName} {cashFlow.creator?.lastName}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date création</label>
                <div className="flex items-center text-gray-900">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {formatDate(cashFlow.createdAt)}
                </div>
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