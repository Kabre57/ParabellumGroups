'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Search, Filter } from 'lucide-react';

type ProductStatus = 'active' | 'discontinued';

interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  supplier: string;
  status: ProductStatus;
}

const statusColors: Record<ProductStatus, string> = {
  active: 'bg-green-200 text-green-800',
  discontinued: 'bg-red-200 text-red-800',
};

const statusLabels: Record<ProductStatus, string> = {
  active: 'Actif',
  discontinued: 'Discontinué',
};

const mockProducts: Product[] = [
  { id: '1', code: 'PROD-001', name: 'Ordinateur portable Dell XPS', category: 'Informatique', stock: 45, price: 1299.99, supplier: 'Dell ""', status: 'active' },
  { id: '2', code: 'PROD-002', name: 'Bureau ergonomique réglable', category: 'Mobilier', stock: 12, price: 450.00, supplier: 'Office Depot', status: 'active' },
  { id: '3', code: 'PROD-003', name: 'Chaise de bureau Herman Miller', category: 'Mobilier', stock: 8, price: 850.00, supplier: 'Herman Miller', status: 'active' },
  { id: '4', code: 'PROD-004', name: 'Écran Dell 27 pouces', category: 'Informatique', stock: 23, price: 350.00, supplier: 'Dell ""', status: 'active' },
  { id: '5', code: 'PROD-005', name: 'Clavier mécanique Logitech', category: 'Informatique', stock: 67, price: 89.99, supplier: 'Logitech', status: 'active' },
  { id: '6', code: 'PROD-006', name: 'Souris sans fil', category: 'Informatique', stock: 0, price: 35.00, supplier: 'Logitech', status: 'discontinued' },
  { id: '7', code: 'PROD-007', name: 'Papier A4 (ramette)', category: 'Fournitures', stock: 234, price: 5.50, supplier: 'Hamelin', status: 'active' },
  { id: '8', code: 'PROD-008', name: 'Stylos BIC bleus (boîte de 50)', category: 'Fournitures', stock: 89, price: 12.00, supplier: 'BIC', status: 'active' },
];

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const { data: products = mockProducts, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockProducts;
    },
  });

  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: products.length,
    active: products.filter((p: Product) => p.status === 'active').length,
    discontinued: products.filter((p: Product) => p.status === 'discontinued').length,
    totalValue: products.reduce((sum: number, p: Product) => sum + (p.price * p.stock), 0),
  };

  const categories = ['ALL', ...Array.from(new Set(products.map((p: Product) => p.category)))];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <a href="/dashboard/achats" className="text-gray-500 hover:text-gray-700 text-sm">
            ← Retour aux achats
          </a>
          <h1 className="text-3xl font-bold mt-1">Catalogue Produits</h1>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Nouveau produit
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        Le catalogue produits n'est pas encore connecte au service procurement. Donnees affichees a titre indicatif.
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Produits</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Actifs</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Discontinués</div>
          <div className="text-2xl font-bold text-red-600">{stats.discontinued}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Valeur Stock</div>
          <div className="text-2xl font-bold">{stats.totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} F</div>
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
              placeholder="Rechercher un produit..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat === 'ALL' ? 'Toutes catégories' : cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fournisseur</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product: Product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.stock}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} F</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.supplier}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[product.status]}`}>
                        {statusLabels[product.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Modifier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">Aucun produit trouvé</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
