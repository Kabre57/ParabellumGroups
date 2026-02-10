'use client';

import { useQuery } from '@tanstack/react-query';
import { procurementService } from '@/services/procurement';
import type { ProcurementStats, PurchaseOrder, PurchaseOrderStatus } from '@/services/procurement';

const statusLabels: Record<PurchaseOrderStatus, string> = {
  BROUILLON: 'Brouillon',
  ENVOYE: 'Envoyé',
  CONFIRME: 'Confirmé',
  LIVRE: 'Livré',
  ANNULE: 'Annulé',
};

const statusColors: Record<PurchaseOrderStatus, string> = {
  BROUILLON: 'bg-yellow-100 text-yellow-800',
  ENVOYE: 'bg-blue-100 text-blue-800',
  CONFIRME: 'bg-purple-100 text-purple-800',
  LIVRE: 'bg-green-100 text-green-800',
  ANNULE: 'bg-red-100 text-red-800',
};

export default function ProcurementOverviewPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<ProcurementStats>({
    queryKey: ['procurement-stats'],
    queryFn: async () => {
      const response = await procurementService.getStats();
      return response.data;
    },
  });

  const { data: recentOrdersResponse, isLoading: ordersLoading } = useQuery<Awaited<ReturnType<typeof procurementService.getOrders>>>({
    queryKey: ['recent-orders'],
    queryFn: () => procurementService.getOrders({ limit: 10 }),
  });

  const recentOrders = recentOrdersResponse?.data ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Achats</h1>
        <div className="flex gap-3">
          <a
            href="/dashboard/achats/commandes"
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Commandes
          </a>
          <a
            href="/dashboard/achats/stock"
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Stock
          </a>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Nouvelle commande
          </button>
        </div>
      </div>

      {statsLoading ? (
        <div className="text-center py-8 text-gray-500">Chargement...</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Commandes ce mois</div>
                <div className="text-3xl font-bold mt-1">{stats?.ordersThisMonth || 0}</div>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">En attente</div>
                <div className="text-3xl font-bold mt-1 text-orange-600">{stats?.pendingOrders || 0}</div>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Budget restant</div>
                <div className="text-3xl font-bold mt-1 text-green-600">
                  {(stats?.budgetRemaining || 0).toLocaleString()} F
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Commandes récentes</h2>
        </div>

        {ordersLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numéro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fournisseur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.number}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{order.supplier || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(order.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.amount.toLocaleString()} F</td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={`/dashboard/achats/commandes/${order.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Voir
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentOrders.length === 0 && (
              <div className="text-center py-8 text-gray-500">Aucune commande récente</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
