// components/Modals/View/ViewAccountModal.tsx
import React from 'react';
import { X, CreditCard, DollarSign, TrendingUp, TrendingDown, Calendar, FileText, User } from 'lucide-react';

interface ViewAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: any;
}

export const ViewAccountModal: React.FC<ViewAccountModalProps> = ({ isOpen, onClose, account }) => {
  if (!isOpen || !account) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getAccountTypeColor = (type: string) => {
    const colors = {
      'actif': 'bg-green-100 text-green-800',
      'passif': 'bg-red-100 text-red-800',
      'produit': 'bg-blue-100 text-blue-800',
      'charge': 'bg-orange-100 text-orange-800',
      'trésorerie': 'bg-purple-100 text-purple-800',
      'client': 'bg-cyan-100 text-cyan-800',
      'fournisseur': 'bg-pink-100 text-pink-800',
      'capital': 'bg-indigo-100 text-indigo-800'
    };
    return colors[type.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getBalanceTrend = (balance: number) => {
    if (balance > 0) return { icon: TrendingUp, color: 'text-green-600', label: 'Positif' };
    if (balance < 0) return { icon: TrendingDown, color: 'text-red-600', label: 'Négatif' };
    return { icon: DollarSign, color: 'text-gray-600', label: 'Neutre' };
  };

  const balanceTrend = getBalanceTrend(account.balance);
  const TrendIcon = balanceTrend.icon;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Détails du Compte
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* En-tête avec solde */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-600">Solde actuel</div>
                <div className={`text-3xl font-bold ${balanceTrend.color} flex items-center`}>
                  <TrendIcon className="h-6 w-6 mr-2" />
                  {formatCurrency(account.balance)}
                </div>
                <div className="text-sm text-blue-500 mt-1">{balanceTrend.label}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-600">Numéro de compte</div>
                <div className="text-lg font-mono font-semibold text-blue-800">{account.accountNumber}</div>
              </div>
            </div>
          </div>

          {/* Informations de base */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du compte</label>
              <div className="flex items-center text-lg font-semibold text-gray-900">
                <CreditCard className="h-5 w-5 mr-2 text-gray-400" />
                {account.name}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de compte</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAccountTypeColor(account.accountType)}`}>
                  {account.accountType}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
                <span className="text-sm font-medium text-gray-900">{account.currency}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {account.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{account.description}</p>
              </div>
            </div>
          )}

          {/* Statistiques */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Statistiques</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-gray-600">Dernière opération</div>
                <div className="font-medium text-gray-900">
                  {account.lastTransactionDate ? formatDate(account.lastTransactionDate) : 'Aucune'}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-gray-600">Nombre d'opérations</div>
                <div className="font-medium text-gray-900">
                  {account._count?.accountingEntries || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Mouvements récents (simulé) */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Mouvements récents</h4>
            <div className="space-y-2">
              {account.recentTransactions?.length > 0 ? (
                account.recentTransactions.slice(0, 5).map((transaction: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center">
                      {transaction.type === 'INFLOW' ? (
                        <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <div>
                        <div className="text-sm font-medium">{transaction.description}</div>
                        <div className="text-xs text-gray-500">{formatDate(transaction.date)}</div>
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${
                      transaction.type === 'INFLOW' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'INFLOW' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Aucun mouvement récent</p>
                </div>
              )}
            </div>
          </div>

          {/* Informations système */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Informations système</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center text-gray-600 mb-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Créé le</span>
                </div>
                <div className="font-medium text-gray-900">{formatDate(account.createdAt)}</div>
              </div>
              <div>
                <div className="flex items-center text-gray-600 mb-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Modifié le</span>
                </div>
                <div className="font-medium text-gray-900">{formatDate(account.updatedAt)}</div>
              </div>
            </div>
          </div>

          {/* Statut */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Statut du compte</span>
              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                account.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {account.isActive ? 'Actif' : 'Inactif'}
              </span>
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