'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Search, Star } from 'lucide-react';

type SupplierStatus = 'active' | 'inactive';

interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  productsCount: number;
  annualAmount: number;
  rating: number;
  status: SupplierStatus;
}

const statusColors: Record<SupplierStatus, string> = {
  active: 'bg-green-200 text-green-800',
  inactive: 'bg-gray-200 text-gray-800',
};

const statusLabels: Record<SupplierStatus, string> = {
  active: 'Actif',
  inactive: 'Inactif',
};

const mockSuppliers: Supplier[] = [
  { id: '1', name: 'Dell France', contact: 'Jean Dupont', email: 'jean.dupont@dell.fr', phone: '01 23 45 67 89', productsCount: 45, annualAmount: 125000, rating: 4.5, status: 'active' },
  { id: '2', name: 'Office Depot', contact: 'Marie Martin', email: 'marie.martin@officedepot.fr', phone: '01 34 56 78 90', productsCount: 78, annualAmount: 85000, rating: 4.2, status: 'active' },
  { id: '3', name: 'Herman Miller', contact: 'Pierre Bernard', email: 'p.bernard@hermanmiller.com', phone: '01 45 67 89 01', productsCount: 12, annualAmount: 95000, rating: 4.8, status: 'active' },
  { id: '4', name: 'Logitech', contact: 'Sophie Dubois', email: 'sophie.dubois@logitech.com', phone: '01 56 78 90 12', productsCount: 34, annualAmount: 45000, rating: 4.3, status: 'active' },
  { id: '5', name: 'Hamelin', contact: 'Luc Thomas', email: 'luc.thomas@hamelin.fr', phone: '01 67 89 01 23', productsCount: 156, annualAmount: 28000, rating: 3.9, status: 'active' },
  { id: '6', name: 'BIC', contact: 'Anne Petit', email: 'anne.petit@bic.fr', phone: '01 78 90 12 34', productsCount: 89, annualAmount: 32000, rating: 4.1, status: 'active' },
  { id: '7', name: 'Staples', contact: 'Marc Robert', email: 'marc.robert@staples.fr', phone: '01 89 01 23 45', productsCount: 23, annualAmount: 15000, rating: 3.5, status: 'inactive' },
  { id: '8', name: 'HP France', contact: 'Claire Simon', email: 'claire.simon@hp.com', phone: '01 90 12 34 56', productsCount: 67, annualAmount: 98000, rating: 4.4, status: 'active' },
];

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | 'ALL'>('ALL');

  const { data: suppliers = mockSuppliers, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockSuppliers;
    },
  });

  const filteredSuppliers = suppliers.filter((supplier: Supplier) => {
    const matchesSearch = 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || supplier.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: suppliers.length,
    active: suppliers.filter((s: Supplier) => s.status === 'active').length,
    totalProducts: suppliers.reduce((sum: number, s: Supplier) => sum + s.productsCount, 0),
    totalAnnual: suppliers.reduce((sum: number, s: Supplier) => sum + s.annualAmount, 0),
  };

  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <a href="/dashboard/achats" className="text-gray-500 hover:text-gray-700 text-sm">
            ← Retour aux achats
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
          <div className="text-sm text-gray-600">Produits Fournis</div>
          <div className="text-2xl font-bold">{stats.totalProducts}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Montant Annuel</div>
          <div className="text-2xl font-bold">{stats.totalAnnual.toLocaleString('fr-FR')} F</div>
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
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produits</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant Annuel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Évaluation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSuppliers.map((supplier: Supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{supplier.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{supplier.contact}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{supplier.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{supplier.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{supplier.productsCount}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{supplier.annualAmount.toLocaleString('fr-FR')} F</td>
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
              <div className="text-center py-8 text-gray-500">Aucun fournisseur trouvé</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
