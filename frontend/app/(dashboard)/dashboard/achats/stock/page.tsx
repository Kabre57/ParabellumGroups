'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { procurementService } from '@/services/procurement';
import type { StockItem, StockMovement } from '@/services/procurement';

export default function StockPage() {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'movements'>('items');

  const { data: stockItemsResponse, isLoading: itemsLoading } = useQuery<Awaited<ReturnType<typeof procurementService.getStock>>>({
    queryKey: ['stock-items', categoryFilter],
    queryFn: () => procurementService.getStock({
      category: categoryFilter || undefined,
      belowThreshold: showLowStock || undefined,
    }),
  });

  const { data: movementsResponse, isLoading: movementsLoading } = useQuery<Awaited<ReturnType<typeof procurementService.getStockMovements>>>({
    queryKey: ['stock-movements'],
    queryFn: () => procurementService.getStockMovements(),
    enabled: activeTab === 'movements',
  });

  const stockItems = stockItemsResponse?.data ?? [];
  const movements = movementsResponse?.data ?? [];

  const normalizedCategory = categoryFilter.trim().toLowerCase();
  const filteredItems = stockItems.filter((item) => {
    if (normalizedCategory && !item.category.toLowerCase().includes(normalizedCategory)) {
      return false;
    }
    if (showLowStock) {
      return item.quantity <= item.threshold;
    }
    return true;
  });

  const lowStockCount = stockItems.filter((item: StockItem) => item.quantity <= item.threshold).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <a href="/dashboard/achats" className="text-gray-500 hover:text-gray-700 text-sm">
            ← Retour aux achats
          </a>
          <h1 className="text-3xl font-bold mt-1">Gestion du stock</h1>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Ajouter un article
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        Le module stock n'est pas encore connect? au service procurement. Donn?es affich?es a titre indicatif.
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Articles en stock</div>
          <div className="text-2xl font-bold">{stockItems.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Stock faible</div>
          <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Valeur totale</div>
          <div className="text-2xl font-bold">-</div>
        </div>
      </div>

      {lowStockCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-semibold text-red-900">Alerte stock faible</h3>
              <p className="text-sm text-red-700 mt-1">
                {lowStockCount} article{lowStockCount > 1 ? 's sont' : ' est'} en dessous du seuil de réapprovisionnement.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('items')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'items'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Articles
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'movements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Historique des mouvements
            </button>
          </nav>
        </div>

        <div className="p-4">
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <input
                    type="text"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    placeholder="Filtrer par catégorie..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showLowStock}
                      onChange={(e) => setShowLowStock(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Afficher uniquement le stock faible</span>
                  </label>
                </div>
              </div>

              {itemsLoading ? (
                <div className="text-center py-8 text-gray-500">Chargement...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Article</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seuil</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emplacement</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dernier réappro.</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredItems.map((item: StockItem) => {
                        const isLowStock = item.quantity <= item.threshold;
                        return (
                          <tr key={item.id} className={`hover:bg-gray-50 ${isLowStock ? 'bg-red-50' : ''}`}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                            <td className="px-4 py-3">
                              <span className={`text-sm font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                                {item.quantity} {item.unit}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.threshold} {item.unit}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.location}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {new Date(item.lastRestocked).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                Ajuster
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredItems.length === 0 && (
                    <div className="text-center py-8 text-gray-500">Aucun article trouvé</div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'movements' && (
            <div className="space-y-4">
              {movementsLoading ? (
                <div className="text-center py-8 text-gray-500">Chargement...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Article</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {movements.map((movement: StockMovement) => (
                        <tr key={movement.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(movement.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{movement.item}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              movement.type === 'IN' ? 'bg-green-200 text-green-800' : 'bg-orange-200 text-orange-800'
                            }`}>
                              {movement.type === 'IN' ? 'Entrée' : 'Sortie'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {movement.type === 'IN' ? '+' : '-'}{movement.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{movement.user}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{movement.reference}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {movements.length === 0 && (
                    <div className="text-center py-8 text-gray-500">Aucun mouvement enregistré</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
