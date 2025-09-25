import React from 'react';
import { X, User, Mail, Shield, Building2, Calendar, CheckCircle, XCircle } from 'lucide-react';

interface ViewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

const roleLabels = {
  ADMIN: 'Administrateur',
  GENERAL_DIRECTOR: 'Directeur Général',
  SERVICE_MANAGER: 'Responsable de Service',
  EMPLOYEE: 'Employé',
  ACCOUNTANT: 'Comptable'
};

const roleColors = {
  ADMIN: 'bg-purple-100 text-purple-800',
  GENERAL_DIRECTOR: 'bg-red-100 text-red-800',
  SERVICE_MANAGER: 'bg-blue-100 text-blue-800',
  EMPLOYEE: 'bg-green-100 text-green-800',
  ACCOUNTANT: 'bg-yellow-100 text-yellow-800'
};

export const ViewUserModal: React.FC<ViewUserModalProps> = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Utilisateur {user.userNumber}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Statut */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {user.isActive ? (
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mr-2" />
              )}
              <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${
                user.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {user.isActive ? 'Compte Actif' : 'Compte Inactif'}
              </span>
            </div>
            {user.lastLoginAt && (
              <div className="text-sm text-gray-500">
                Dernière connexion: {formatDateTime(user.lastLoginAt)}
              </div>
            )}
          </div>

          {/* Informations personnelles */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Informations Personnelles</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <span className="font-medium">{user.firstName}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <span className="font-medium">{user.lastName}</span>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="flex items-center">
                  <Mail className="text-gray-400 h-4 w-4 mr-2" />
                  <a href={`mailto:${user.email}`} className="text-blue-600 hover:underline">
                    {user.email}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Rôle et permissions */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Rôle et Permissions
            </h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
              <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${
                roleColors[user.role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'
              }`}>
                {roleLabels[user.role as keyof typeof roleLabels] || user.role}
              </span>
            </div>
          </div>

          {/* Service */}
          {user.service && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                Service
              </h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service assigné</label>
                <span className="font-medium">{user.service.name}</span>
                {user.service.description && (
                  <p className="text-sm text-gray-600 mt-1">{user.service.description}</p>
                )}
              </div>
            </div>
          )}

          {/* Employé associé */}
          {user.employee && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Employé Associé</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-600 mr-2" />
                  <span className="font-medium">
                    {user.employee.firstName} {user.employee.lastName}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({user.employee.employeeNumber})
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {user.employee.position} - {user.employee.service?.name}
                </div>
              </div>
            </div>
          )}

          {/* Statistiques d'utilisation */}
          {(user.loginCount || user.createdDocuments) && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Statistiques d'Utilisation</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.loginCount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de connexions</label>
                    <span className="text-lg font-semibold">{user.loginCount}</span>
                  </div>
                )}
                {user.createdDocuments && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Documents créés</label>
                    <span className="text-lg font-semibold">{user.createdDocuments}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sécurité */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Sécurité</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.passwordChangedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe modifié le</label>
                  <div className="flex items-center">
                    <Calendar className="text-gray-400 h-4 w-4 mr-2" />
                    <span>{formatDate(user.passwordChangedAt)}</span>
                  </div>
                </div>
              )}
              {user.twoFactorEnabled !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Authentification à deux facteurs</label>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                    user.twoFactorEnabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.twoFactorEnabled ? 'Activée' : 'Désactivée'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dates de création et modification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 text-sm text-gray-500">
            <div>
              <span className="font-medium">Compte créé le:</span> {formatDate(user.createdAt)}
            </div>
            <div>
              <span className="font-medium">Dernière modification:</span> {formatDate(user.updatedAt)}
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

