'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TruckIcon, Search, Calendar } from 'lucide-react';

type ReceptionStatus = 'pending' | 'received' | 'checked';

interface Reception {
  id: string;
  number: string;
  supplier: string;
  date: string;
  products: number;
  quantity: number;
  amount: number;
  status: ReceptionStatus;
}

const statusColors: Record<ReceptionStatus, string> = {
  pending: 'bg-yellow-200 text-yellow-800',
  received: 'bg-blue-200 text-blue-800',
  checked: 'bg-green-200 text-green-800',
};

const statusLabels: Record<ReceptionStatus, string> = {
  pending: 'En attente',
  received: 'Reçue',
  checked: 'Vérifiée',
};

const mockReceptions: Reception[] = [
  { id: '1', number: 'REC-2026-001', supplier: 'Dell ""', date: '2026-01-20', products: 12, quantity: 45, amount: 58495.55, status: 'pending' },
  { id: '2', number: 'REC-2026-002', supplier: 'Office Depot', date: '2026-01-19', products: 8, quantity: 96, amount: 5400.00, status: 'received' },
  { id: '3', number: 'REC-2026-003', supplier: 'Herman Miller', date: '2026-01-18', products: 5, quantity: 8, amount: 6800.00, status: 'checked' },
  { id: '4', number: 'REC-2026-004', supplier: 'Logitech', date: '2026-01-17', products: 15, quantity: 234, amount: 8967.34, status: 'checked' },
  { id: '5', number: 'REC-2026-005', supplier: 'Hamelin', date: '2026-01-16', products: 45, quantity: 1287, amount: 7078.50, status: 'checked' },
  { id: '6', number: 'REC-2026-006', supplier: 'BIC', date: '2026-01-15', products: 23, quantity: 535, amount: 6420.00, status: 'checked' },
  { id: '7', number: 'REC-2026-007', supplier: 'HP ""', date: '2026-01-21', products: 18, quantity: 67, amount: 32890.00, status: 'pending' },
  { id: '8', number: 'REC-2026-008', supplier: 'Dell ""', date: '2026-01-14', products: 9, quantity: 23, amount: 8050.00, status: 'received' },
];

export default function ReceptionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReceptionStatus | 'ALL'>('ALL');

  const { data: receptions = mockReceptions, isLoading } = useQuery({
    queryKey: ['receptions'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockReceptions;
    },
  });

  const filteredReceptions = receptions.filter((reception: Reception) => {
    const matchesSearch = 
      reception.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reception.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || reception.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: receptions.length,
    pending: receptions.filter((r: Reception) => r.status === 'pending').length,
    received: receptions.filter((r: Reception) => r.status === 'received').length,
    totalAmount: receptions.reduce((sum: number, r: Reception) => sum + r.amount, 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <a href="/dashboard/achats" className="text-gray-500 hover:text-gray-700 text-sm">
            ← Retour aux achats
          </a>
          <h1 className="text-3xl font-bold mt-1">Réceptions Marchandises</h1>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <TruckIcon className="w-4 h-4" />
          Nouvelle réception
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        Les receptions ne sont pas encore connectees au service procurement. Donnees affichees a titre indicatif.
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Réceptions</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">En Attente</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Reçues</div>
          <div className="text-2xl font-bold text-blue-600">{stats.received}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Montant Total</div>
          <div className="text-2xl font-bold">{stats.totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} F</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher une réception..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReceptionStatus | 'ALL')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="received">Reçue</option>
              <option value="checked">Vérifiée</option>
            </select>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produits</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReceptions.map((reception: Reception) => (
                  <tr key={reception.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{reception.number}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{reception.supplier}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(reception.date).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{reception.products}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{reception.quantity}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{reception.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} F</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[reception.status]}`}>
                        {statusLabels[reception.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredReceptions.length === 0 && (
              <div className="text-center py-8 text-gray-500">Aucune réception trouvée</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
