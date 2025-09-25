import React from 'react';
import { X, Building2, Mail, Phone, MapPin, CreditCard, User, Calendar } from 'lucide-react';

interface ViewSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: any;
}

export const ViewSupplierModal: React.FC<ViewSupplierModalProps> = ({ isOpen, onClose, supplier }) => {
  if (!isOpen || !supplier) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Fournisseur {supplier.supplierNumber}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du fournisseur</label>
              <span className="text-lg font-semibold">{supplier.name}</span>
            </div>
            {supplier.contactPerson && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Personne de contact</label>
                <div className="flex items-center">
                  <User className="text-gray-400 h-4 w-4 mr-2" />
                  <span>{supplier.contactPerson}</span>
                </div>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Informations de Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {supplier.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="flex items-center">
                    <Mail className="text-gray-400 h-4 w-4 mr-2" />
                    <a href={`mailto:${supplier.email}`} className="text-blue-600 hover:underline">
                      {supplier.email}
                    </a>
                  </div>
                </div>
              )}
              {supplier.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <div className="flex items-center">
                    <Phone className="text-gray-400 h-4 w-4 mr-2" />
                    <a href={`tel:${supplier.phone}`} className="text-blue-600 hover:underline">
                      {supplier.phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Adresse */}
          {(supplier.addressLine1 || supplier.city || supplier.country) && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Adresse
              </h4>
              <div className="space-y-2">
                {supplier.addressLine1 && <div>{supplier.addressLine1}</div>}
                <div className="flex items-center space-x-2">
                  {supplier.postalCode && <span>{supplier.postalCode}</span>}
                  {supplier.city && <span>{supplier.city}</span>}
                </div>
                {supplier.country && <div>{supplier.country}</div>}
              </div>
            </div>
          )}

          {/* Informations fiscales */}
          {supplier.vatNumber && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Informations Fiscales</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro TVA</label>
                <span className="font-mono">{supplier.vatNumber}</span>
              </div>
            </div>
          )}

          {/* Informations bancaires */}
          {(supplier.bankName || supplier.bankIban || supplier.bankBic) && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <CreditCard className="h-4 w-4 mr-2" />
                Informations Bancaires
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supplier.bankName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la banque</label>
                    <span>{supplier.bankName}</span>
                  </div>
                )}
                {supplier.bankIban && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                    <span className="font-mono text-sm">{supplier.bankIban}</span>
                  </div>
                )}
                {supplier.bankBic && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">BIC/SWIFT</label>
                    <span className="font-mono">{supplier.bankBic}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conditions commerciales */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Conditions Commerciales</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Délai de paiement</label>
              <div className="flex items-center">
                <Calendar className="text-gray-400 h-4 w-4 mr-2" />
                <span>{supplier.paymentTerms} jours</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {supplier.notes && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <p className="text-sm text-gray-600">{supplier.notes}</p>
            </div>
          )}

          {/* Statut */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
              supplier.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {supplier.isActive ? 'Actif' : 'Inactif'}
            </span>
          </div>

          {/* Statistiques */}
          {(supplier.totalOrders || supplier.totalAmount) && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Statistiques</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supplier.totalOrders && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de commandes</label>
                    <span className="text-lg font-semibold">{supplier.totalOrders}</span>
                  </div>
                )}
                {supplier.totalAmount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant total</label>
                    <span className="text-lg font-semibold">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'XOF'
                      }).format(supplier.totalAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dates de création et modification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 text-sm text-gray-500">
            <div>
              <span className="font-medium">Créé le:</span> {formatDate(supplier.createdAt)}
            </div>
            <div>
              <span className="font-medium">Modifié le:</span> {formatDate(supplier.updatedAt)}
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

