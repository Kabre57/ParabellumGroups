import React from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, Building2, Briefcase } from 'lucide-react';

interface ViewEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

export const ViewEmployeeModal: React.FC<ViewEmployeeModalProps> = ({ isOpen, onClose, employee }) => {
  if (!isOpen || !employee) return null;

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
      CDI: 'CDI',
      CDD: 'CDD',
      STAGE: 'Stage',
      FREELANCE: 'Freelance'
    };
    return types[type as keyof typeof types] || type;
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Employé {employee.employeeNumber}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Informations personnelles */}
          <div className="border-b pb-4">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Informations Personnelles
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                <span className="text-lg font-semibold">{employee.firstName} {employee.lastName}</span>
              </div>
              {employee.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="flex items-center">
                    <Mail className="text-gray-400 h-4 w-4 mr-2" />
                    <span>{employee.email}</span>
                  </div>
                </div>
              )}
              {employee.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <div className="flex items-center">
                    <Phone className="text-gray-400 h-4 w-4 mr-2" />
                    <span>{employee.phone}</span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                <div className="flex items-center">
                  <Calendar className="text-gray-400 h-4 w-4 mr-2" />
                  <span>{formatDate(employee.dateOfBirth)} ({calculateAge(employee.dateOfBirth)} ans)</span>
                </div>
              </div>
              {employee.placeOfBirth && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de naissance</label>
                  <span>{employee.placeOfBirth}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nationalité</label>
                <span>{employee.nationality}</span>
              </div>
              {employee.socialSecurityNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de sécurité sociale</label>
                  <span className="font-mono">{employee.socialSecurityNumber}</span>
                </div>
              )}
            </div>
            {employee.address && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <div className="flex items-start">
                  <MapPin className="text-gray-400 h-4 w-4 mr-2 mt-1" />
                  <span>{employee.address}</span>
                </div>
              </div>
            )}
          </div>

          {/* Informations professionnelles */}
          <div className="border-b pb-4">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <Briefcase className="h-4 w-4 mr-2" />
              Informations Professionnelles
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                <div className="flex items-center">
                  <Building2 className="text-gray-400 h-4 w-4 mr-2" />
                  <span>{employee.service?.name || 'Non assigné'}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poste</label>
                <span className="font-medium">{employee.position}</span>
              </div>
              {employee.department && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
                  <span>{employee.department}</span>
                </div>
              )}
              {employee.manager && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                  <span>{employee.manager}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'embauche</label>
                <div className="flex items-center">
                  <Calendar className="text-gray-400 h-4 w-4 mr-2" />
                  <span>{formatDate(employee.hireDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contrat actuel */}
          <div className="border-b pb-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Contrat Actuel</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de contrat</label>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                  employee.contractType === 'CDI' 
                    ? 'bg-green-100 text-green-800' 
                    : employee.contractType === 'CDD'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {getContractTypeLabel(employee.contractType)}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salaire de base</label>
                <span className="text-lg font-semibold">{formatCurrency(employee.baseSalary)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heures de travail/semaine</label>
                <span>{employee.workingHours}h</span>
              </div>
            </div>
          </div>

          {/* Informations bancaires et urgence */}
          <div className="border-b pb-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Informations Complémentaires</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employee.bankAccount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compte bancaire (IBAN)</label>
                  <span className="font-mono text-sm">{employee.bankAccount}</span>
                </div>
              )}
              {employee.emergencyContact && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact d'urgence</label>
                  <span>{employee.emergencyContact}</span>
                </div>
              )}
            </div>
          </div>

          {/* Statut */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
              employee.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {employee.isActive ? 'Actif' : 'Inactif'}
            </span>
          </div>

          {/* Dates de création et modification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 text-sm text-gray-500">
            <div>
              <span className="font-medium">Créé le:</span> {formatDate(employee.createdAt)}
            </div>
            <div>
              <span className="font-medium">Modifié le:</span> {formatDate(employee.updatedAt)}
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