import React from 'react';
import { X, Building2, Users, FileText, Calendar, User } from 'lucide-react';

interface ViewServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: any;
}

export const ViewServiceModal: React.FC<ViewServiceModalProps> = ({ isOpen, onClose, service }) => {
  if (!isOpen || !service) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Service {service.serviceNumber}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Informations générales */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du service</label>
            <span className="text-xl font-semibold text-gray-900">{service.name}</span>
          </div>

          {service.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <div className="flex items-start">
                <FileText className="text-gray-400 h-4 w-4 mr-2 mt-1" />
                <p className="text-sm text-gray-600">{service.description}</p>
              </div>
            </div>
          )}

          {/* Responsable du service */}
          {service.manager && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Responsable du Service</h4>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-900">
                    {service.manager.firstName} {service.manager.lastName}
                  </span>
                </div>
                <div className="mt-2 text-sm text-blue-700">
                  {service.manager.email}
                </div>
                {service.manager.phone && (
                  <div className="text-sm text-blue-700">
                    {service.manager.phone}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Employés du service */}
          {service.employees && service.employees.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Employés ({service.employees.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {service.employees.map((employee: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-600 mr-2" />
                      <div>
                        <span className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </span>
                        <div className="text-sm text-gray-500">
                          {employee.position}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {employee.employeeNumber}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statistiques */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Statistiques</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {service.employeeCount || service.employees?.length || 0}
                </div>
                <div className="text-sm text-blue-600">Employés</div>
              </div>
              {service.activeProjects && (
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {service.activeProjects}
                  </div>
                  <div className="text-sm text-green-600">Projets actifs</div>
                </div>
              )}
              {service.completedMissions && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {service.completedMissions}
                  </div>
                  <div className="text-sm text-purple-600">Missions terminées</div>
                </div>
              )}
            </div>
          </div>

          {/* Budget */}
          {(service.budget || service.budgetUsed) && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Budget</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {service.budget && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget alloué</label>
                    <span className="text-lg font-semibold">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'XOF'
                      }).format(service.budget)}
                    </span>
                  </div>
                )}
                {service.budgetUsed && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget utilisé</label>
                    <span className="text-lg font-semibold">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'XOF'
                      }).format(service.budgetUsed)}
                    </span>
                    {service.budget && (
                      <div className="text-sm text-gray-500">
                        ({((service.budgetUsed / service.budget) * 100).toFixed(1)}% utilisé)
                      </div>
                    )}
                  </div>
                )}
              </div>
              {service.budget && service.budgetUsed && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        (service.budgetUsed / service.budget) > 0.9 
                          ? 'bg-red-600' 
                          : (service.budgetUsed / service.budget) > 0.7 
                          ? 'bg-yellow-600' 
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min((service.budgetUsed / service.budget) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Statut */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
              service.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {service.isActive ? 'Actif' : 'Inactif'}
            </span>
          </div>

          {/* Dates de création et modification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 text-sm text-gray-500">
            <div>
              <span className="font-medium">Créé le:</span> {formatDate(service.createdAt)}
            </div>
            <div>
              <span className="font-medium">Modifié le:</span> {formatDate(service.updatedAt)}
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

