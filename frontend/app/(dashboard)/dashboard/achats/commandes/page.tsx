'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { procurementService } from '@/services/procurement';

type OrderStatus = 'PENDING' | 'APPROVED' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';

interface PurchaseOrder {
  id: string;
  number: string;
  supplier: string;
  date: string;
  status: OrderStatus;
  amount: number;
  items: number;
}

const statusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-200 text-yellow-800',
  APPROVED: 'bg-blue-200 text-blue-800',
  ORDERED: 'bg-purple-200 text-purple-800',
  RECEIVED: 'bg-green-200 text-green-800',
  CANCELLED: 'bg-red-200 text-red-800',
};

const statusLabels: Record<OrderStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  ORDERED: 'Commandée',
  RECEIVED: 'Reçue',
  CANCELLED: 'Annulée',
};

export default function PurchaseOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [supplierFilter, setSupplierFilter] = useState('');

  const { data: orders = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchase-orders', statusFilter, supplierFilter],
    queryFn: () => procurementService.getOrders({ 
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      supplier: supplierFilter || undefined,
    }),
  });

  const filteredOrders = orders.filter((order: PurchaseOrder) => {
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    const matchesSupplier = !supplierFilter || order.supplier.toLowerCase().includes(supplierFilter.toLowerCase());
    return matchesStatus && matchesSupplier;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o: PurchaseOrder) => o.status === 'PENDING').length,
    approved: orders.filter((o: PurchaseOrder) => o.status === 'APPROVED').length,
    totalAmount: orders.reduce((sum: number, o: PurchaseOrder) => sum + o.amount, 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <a href="/dashboard/achats" className="text-gray-500 hover:text-gray-700 text-sm">
            ← Retour aux achats
          </a>
          <h1 className="text-3xl font-bold mt-1">Commandes d'achat</h1>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Nouvelle commande
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">En attente</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Approuvées</div>
          <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Montant total</div>
          <div className="text-2xl font-bold">{stats.totalAmount.toLocaleString()} F</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'ALL')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous</option>
              <option value="PENDING">En attente</option>
              <option value="APPROVED">Approuvée</option>
              <option value="ORDERED">Commandée</option>
              <option value="RECEIVED">Reçue</option>
              <option value="CANCELLED">Annulée</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
            <input
              type="text"
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              placeholder="Rechercher un fournisseur..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numéro</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fournisseur</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Articles</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order: PurchaseOrder) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.number}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{order.supplier}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(order.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.items}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.amount.toLocaleString()} F</td>
                    <td className="px-4 py-3 text-right">
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
            {filteredOrders.length === 0 && (
              <div className="text-center py-8 text-gray-500">Aucune commande trouvée</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
