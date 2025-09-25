import React from 'react';
import { X, User, Building2, Mail, Phone, MapPin, CreditCard } from 'lucide-react';

interface ViewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
}

export const ViewCustomerModal: React.FC<ViewCustomerModalProps> = ({ isOpen, onClose, customer }) => {
  if (!isOpen || !customer) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      TRANSFER: 'Virement',
      CHECK: 'Chèque',
      CARD: 'Carte',
      CASH: 'Espèces',
      OTHER: 'Autre'
    };
    return methods[method as keyof typeof methods] || method;
  };

  const mainAddress = customer.addresses?.find((addr: any) => addr.isDefault) || customer.addresses?.[0];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Client {customer.customerNumber}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Type de client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de client</label>
            <div className="flex items-center">
              {customer.type === 'COMPANY' ? (
                <>
                  <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                  <span>Entreprise</span>
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  <span>Particulier</span>
                </>
              )}
            </div>
          </div>

          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {customer.type === 'COMPANY' ? 'Nom de l\'entreprise' : 'Nom complet'}
              </label>
              <span>{customer.name}</span>
            </div>

            {customer.type === 'COMPANY' && customer.legalName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raison sociale</label>
                <span>{customer.legalName}</span>
              </div>
            )}
          </div>

          {/* Informations légales pour entreprises */}
          {customer.type === 'COMPANY' && (customer.siret || customer.vatNumber) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.siret && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                  <span>{customer.siret}</span>
                </div>
              )}
              {customer.vatNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro TVA</label>
                  <span>{customer.vatNumber}</span>
                </div>
              )}
            </div>
          )}

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customer.email && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="flex items-center">
                  <Mail className="text-gray-400 h-4 w-4 mr-2" />
                  <span>{customer.email}</span>
                </div>
              </div>
            )}
            {customer.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <div className="flex items-center">
                  <Phone className="text-gray-400 h-4 w-4 mr-2" />
                  <span>{customer.phone}</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customer.mobile && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                <span>{customer.mobile}</span>
              </div>
            )}
            {customer.website && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
                <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {customer.website}
                </a>
              </div>
            )}
          </div>

          {/* Adresse */}
          {mainAddress && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Adresse
              </h4>
              <div className="space-y-2">
                <div>{mainAddress.addressLine1}</div>
                {mainAddress.addressLine2 && <div>{mainAddress.addressLine2}</div>}
                <div>{mainAddress.postalCode} {mainAddress.city}</div>
                <div>{mainAddress.country}</div>
              </div>
            </div>
          )}

          {/* Conditions commerciales */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              Conditions Commerciales
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Délai de paiement</label>
                <span>{customer.paymentTerms} jours</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
                <span>{getPaymentMethodLabel(customer.paymentMethod)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Limite de crédit</label>
                <span>{formatCurrency(customer.creditLimit)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taux de remise</label>
                <span>{customer.discountRate}%</span>
              </div>
            </div>
          </div>

          {/* Catégorie et notes */}
          {(customer.category || customer.notes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.category && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <span>{customer.category}</span>
                </div>
              )}
            </div>
          )}

          {customer.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <p className="text-sm text-gray-600">{customer.notes}</p>
            </div>
          )}

          {/* Statut */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
              customer.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {customer.isActive ? 'Actif' : 'Inactif'}
            </span>
          </div>

          {/* Dates de création et modification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 text-sm text-gray-500">
            <div>
              <span className="font-medium">Créé le:</span> {new Date(customer.createdAt).toLocaleDateString('fr-FR')}
            </div>
            <div>
              <span className="font-medium">Modifié le:</span> {new Date(customer.updatedAt).toLocaleDateString('fr-FR')}
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