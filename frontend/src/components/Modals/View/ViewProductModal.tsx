import React from 'react';
import { X, Package, Zap, RotateCcw, Hash, DollarSign } from 'lucide-react';

interface ViewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
}

const productTypeConfig = {
  PRODUCT: { label: 'Produit', icon: Package, description: 'Article physique avec stock' },
  SERVICE: { label: 'Service', icon: Zap, description: 'Prestation de service' },
  SUBSCRIPTION: { label: 'Abonnement', icon: RotateCcw, description: 'Service récurrent' }
};

export const ViewProductModal: React.FC<ViewProductModalProps> = ({ isOpen, onClose, product }) => {
  if (!isOpen || !product) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  const productTypeInfo = productTypeConfig[product.type as keyof typeof productTypeConfig];
  const Icon = productTypeInfo?.icon || Package;

  const calculatePriceTTC = () => {
    return product.priceHt * (1 + product.vatRate / 100);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Produit/Service {product.sku}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Type de produit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div className="flex items-center p-3 border border-gray-200 rounded-lg bg-gray-50">
              <Icon className="h-5 w-5 mr-2 text-gray-600" />
              <div>
                <div className="font-medium text-sm">{productTypeInfo?.label}</div>
                <div className="text-xs text-gray-500">{productTypeInfo?.description}</div>
              </div>
            </div>
          </div>

          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <div className="flex items-center">
                <Hash className="text-gray-400 h-4 w-4 mr-2" />
                <span className="font-mono">{product.sku}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <span className="font-medium">{product.name}</span>
            </div>
          </div>

          {product.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <p className="text-sm text-gray-600">{product.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.category && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                <span>{product.category}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
              <span>{product.unit}</span>
            </div>
          </div>

          {/* Prix */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Tarification
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix HT</label>
                <span className="text-lg font-semibold">{formatCurrency(product.priceHt)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taux TVA</label>
                <span>{product.vatRate}%</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix TTC</label>
                <span className="text-lg font-semibold text-blue-600">{formatCurrency(calculatePriceTTC())}</span>
              </div>
            </div>
            {product.costPrice > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix de revient</label>
                <span>{formatCurrency(product.costPrice)}</span>
                <span className="ml-2 text-sm text-gray-500">
                  (Marge: {((product.priceHt - product.costPrice) / product.costPrice * 100).toFixed(1)}%)
                </span>
              </div>
            )}
          </div>

          {/* Stock (seulement pour les produits) */}
          {product.type === 'PRODUCT' && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Gestion du Stock</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité en stock</label>
                  <span className={`font-semibold ${
                    product.stockQuantity <= product.stockAlertThreshold 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {product.stockQuantity}
                  </span>
                  {product.stockQuantity <= product.stockAlertThreshold && (
                    <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      Stock faible
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seuil d'alerte</label>
                  <span>{product.stockAlertThreshold}</span>
                </div>
              </div>
            </div>
          )}

          {/* Caractéristiques physiques */}
          {product.type === 'PRODUCT' && (product.weight || product.dimensions) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.weight && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poids</label>
                  <span>{product.weight} kg</span>
                </div>
              )}
              {product.dimensions && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
                  <span>{product.dimensions}</span>
                </div>
              )}
            </div>
          )}

          {/* Image */}
          {product.imageUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
              <img 
                src={product.imageUrl} 
                alt={product.name}
                className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Statut */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
              product.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {product.isActive ? 'Actif' : 'Inactif'}
            </span>
          </div>

          {/* Dates de création et modification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 text-sm text-gray-500">
            <div>
              <span className="font-medium">Créé le:</span> {new Date(product.createdAt).toLocaleDateString('fr-FR')}
            </div>
            <div>
              <span className="font-medium">Modifié le:</span> {new Date(product.updatedAt).toLocaleDateString('fr-FR')}
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