'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Search, Filter } from 'lucide-react';
import { procurementService, StockItem } from '@/shared/api/procurement/procurement.service';

type ProductStatus = 'active' | 'discontinued';

interface Product {
  id: string;
  code?: string;
  name: string;
  category: string;
  stock: number;
  price?: number;
  supplier?: string;
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

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const { data: stockResponse, isLoading } = useQuery({
    queryKey: ['products', categoryFilter, searchTerm],
    queryFn: () => procurementService.getStock({
      category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      search: searchTerm || undefined,
      limit: 200,
    }),
  });

  const products: Product[] = useMemo(() => {
    const items = stockResponse?.data ?? [];
    return items.map((item: StockItem) => ({
      id: item.id,
      code: item.id,
      name: item.name,
      category: item.category || 'Non catégorisé',
      stock: item.quantity ?? 0,
      price: (item as any).unit_price ?? 0,
      supplier: (item as any).supplier || item.location,
      status: item.quantity === 0 ? 'discontinued' : 'active',
    }));
  }, [stockResponse]);

  const filteredProducts = products.filter((product: Product) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(search) ||
      (product.code || '').toLowerCase().includes(search) ||
      (product.supplier || '').toLowerCase().includes(search);
    const matchesCategory = categoryFilter === 'ALL' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: products.length,
    active: products.filter((p: Product) => p.status === 'active').length,
    discontinued: products.filter((p: Product) => p.status === 'discontinued').length,
    totalValue: products.reduce((sum: number, p: Product) => sum + ((p.price ?? 0) * p.stock), 0),
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
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.code || product.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.stock}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {product.price !== undefined
                        ? product.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' F'
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.supplier || '—'}</td>
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
