'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Search, Star } from 'lucide-react';
import { procurementService, Supplier } from '@/services/procurement';

type SupplierStatus = 'ACTIF' | 'INACTIF' | 'BLOQUE';

const statusColors: Record<SupplierStatus, string> = {
  ACTIF: 'bg-green-200 text-green-800',
  INACTIF: 'bg-gray-200 text-gray-800',
  BLOQUE: 'bg-red-200 text-red-800',
};

const statusLabels: Record<SupplierStatus, string> = {
  ACTIF: 'Actif',
  INACTIF: 'Inactif',
  BLOQUE: 'Bloque',
};

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | 'ALL'>('ALL');

  const { data: suppliersResponse, isLoading } = useQuery<Awaited<ReturnType<typeof procurementService.getSuppliers>>>({
    queryKey: ['suppliers', searchTerm, statusFilter],
    queryFn: () =>
      procurementService.getSuppliers({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      }),
  });

  const suppliers = suppliersResponse?.data ?? [];

  const filteredSuppliers = suppliers.filter((supplier: Supplier) => {
    const matchesSearch =
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || supplier.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: suppliers.length,
    active: suppliers.filter((s: Supplier) => s.status === 'ACTIF').length,
    totalOrders: suppliers.reduce((sum: number, s: Supplier) => sum + (s.ordersCount || 0), 0),
    totalAmount: suppliers.reduce((sum: number, s: Supplier) => sum + (s.totalAmount || 0), 0),
  };

  const renderRating = (rating?: number) => {
    const safeRating = rating || 0;
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < Math.floor(safeRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">{safeRating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <a href="/dashboard/achats" className="text-gray-500 hover:text-gray-700 text-sm">
            â† Retour aux achats
          </a>
          <h1 className="text-3xl font-bold mt-1">Gestion Fournisseurs</h1>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Nouveau fournisseur
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Fournisseurs</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Actifs</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Commandes</div>
          <div className="text-2xl font-bold">{stats.totalOrders}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Montant Total</div>
          <div className="text-2xl font-bold">{stats.totalAmount.toLocaleString('fr-FR')} F</div>
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
              placeholder="Rechercher un fournisseur..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SupplierStatus | 'ALL')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ACTIF">Actifs</option>
              <option value="INACTIF">Inactifs</option>
              <option value="BLOQUE">Bloques</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telephone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categorie</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commandes</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evaluation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSuppliers.map((supplier: Supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{supplier.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{supplier.email || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{supplier.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{supplier.category || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{supplier.ordersCount || 0}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {(supplier.totalAmount || 0).toLocaleString('fr-FR')} F
                    </td>
                    <td className="px-4 py-3">{renderRating(supplier.rating)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[supplier.status]}`}>
                        {statusLabels[supplier.status]}
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
            {filteredSuppliers.length === 0 && (
              <div className="text-center py-8 text-gray-500">Aucun fournisseur trouve</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
