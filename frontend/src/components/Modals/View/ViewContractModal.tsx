import React from 'react';
import { X, FileText, Calendar, DollarSign, Clock, User } from 'lucide-react';

interface ViewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: any;
}

export const ViewContractModal: React.FC<ViewContractModalProps> = ({ isOpen, onClose, contract }) => {
  if (!isOpen || !contract) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  const getContractTypeLabel = (type: string) => {
    const types = {
      CDI: 'CDI - Contrat à Durée Indéterminée',
      CDD: 'CDD - Contrat à Durée Déterminée',
      STAGE: 'Stage',
      FREELANCE: 'Freelance'
    };
    return types[type as keyof typeof types] || type;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Contrat {contract.contractNumber}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Employé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employé</label>
            <div className="flex items-center">
              <User className="text-gray-400 h-4 w-4 mr-2" />
              <span>
                {contract.employee?.firstName} {contract.employee?.lastName} ({contract.employee?.employeeNumber})
              </span>
            </div>
          </div>

          {/* Type et dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de contrat</label>
              <span>{getContractTypeLabel(contract.contractType)}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
              <div className="flex items-center">
                <Calendar className="text-gray-400 h-4 w-4 mr-2" />
                <span>{formatDate(contract.startDate)}</span>
              </div>
            </div>
          </div>

          {/* Date de fin pour CDD */}
          {contract.contractType === 'CDD' && contract.endDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
              <div className="flex items-center">
                <Calendar className="text-gray-400 h-4 w-4 mr-2" />
                <span>{formatDate(contract.endDate)}</span>
              </div>
            </div>
          )}

          {/* Rémunération */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salaire de base</label>
              <div className="flex items-center">
                <DollarSign className="text-gray-400 h-4 w-4 mr-2" />
                <span>{formatCurrency(contract.baseSalary)}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heures de travail/semaine</label>
              <div className="flex items-center">
                <Clock className="text-gray-400 h-4 w-4 mr-2" />
                <span>{contract.workingHours}h</span>
              </div>
            </div>
          </div>

          {/* Avantages */}
          {contract.benefits && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avantages</label>
              <p className="text-sm text-gray-600">{contract.benefits}</p>
            </div>
          )}

          {/* Conditions */}
          {contract.terms && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conditions particulières</label>
              <p className="text-sm text-gray-600">{contract.terms}</p>
            </div>
          )}

          {/* Statut */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
              contract.status === 'ACTIVE' 
                ? 'bg-green-100 text-green-800' 
                : contract.status === 'TERMINATED'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {contract.status}
            </span>
          </div>

          {/* Dates de création et modification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 text-sm text-gray-500">
            <div>
              <span className="font-medium">Créé le:</span> {formatDate(contract.createdAt)}
            </div>
            <div>
              <span className="font-medium">Modifié le:</span> {formatDate(contract.updatedAt)}
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