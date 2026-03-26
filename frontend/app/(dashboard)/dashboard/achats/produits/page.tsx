'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Search, Filter, Plus, Edit, Trash2, Printer } from 'lucide-react';
import { inventoryService } from '@/shared/api/inventory/inventory.service';
import type { InventoryArticle, ArticleStatus, ArticleUnit } from '@/shared/api/inventory/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import TabularListPrint from '@/components/printComponents/TabularListPrint';
import { formatFCFA, textOrDash } from '@/components/printComponents/printUtils';

type ProductStatus = 'active' | 'discontinued';

interface Product {
  id: string;
  reference?: string;
  code?: string;
  supplier?: string;
  imageUrl?: string;
  name: string;
  category: string;
  stock: number;
  purchasePrice?: number;
  salePrice?: number;
  unit?: string;
  status: ProductStatus;
  raw: InventoryArticle;
}

const statusColors: Record<ProductStatus, string> = {
  active: 'bg-green-100 text-green-800',
  discontinued: 'bg-red-100 text-red-800',
};

const statusLabels: Record<ProductStatus, string> = {
  active: 'Actif',
  discontinued: 'Discontinue',
};

const STATUS_OPTIONS: { value: ArticleStatus; label: string }[] = [
  { value: 'ACTIF', label: 'Actif' },
  { value: 'INACTIF', label: 'Inactif' },
  { value: 'OBSOLETE', label: 'Obsolete' },
];

const UNIT_OPTIONS: { value: ArticleUnit; label: string }[] = [
  { value: 'PIECE', label: 'Piece' },
  { value: 'KG', label: 'Kg' },
  { value: 'M', label: 'Metre' },
  { value: 'L', label: 'Litre' },
];

interface ProductFormValues {
  reference?: string;
  nom: string;
  imageUrl?: string;
  description?: string;
  categorie?: string;
  unite?: ArticleUnit;
  prixAchat?: string;
  prixVente?: string;
  quantiteStock?: string;
  seuilAlerte?: string;
  seuilRupture?: string;
  emplacement?: string;
  status?: ArticleStatus;
}

export default function ProductsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryArticle | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const { data: articlesResponse, isLoading } = useQuery({
    queryKey: ['inventory-articles', categoryFilter, searchTerm],
    queryFn: () =>
      inventoryService.getArticles({
        categorie: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        search: searchTerm || undefined,
      }),
  });

  const products: Product[] = useMemo(() => {
    const items = Array.isArray(articlesResponse)
      ? articlesResponse
      : articlesResponse?.data ?? [];
    return items.map((item: InventoryArticle) => ({
      id: item.id,
      reference: item.reference,
      code: item.reference,
      supplier: item.fournisseurId,
      imageUrl: item.imageUrl,
      name: item.nom,
      category: item.categorie || 'Non categorise',
      stock: item.quantiteStock ?? 0,
      purchasePrice: item.prixAchat,
      salePrice: item.prixVente,
      unit: item.unite,
      status: item.status === 'OBSOLETE' ? 'discontinued' : 'active',
      raw: item,
    }));
  }, [articlesResponse]);

  const filteredProducts = products.filter((product: Product) => {
    const search = (searchTerm || '').toLowerCase();
    const matchesSearch =
      (product.name || '').toLowerCase().includes(search) ||
      (product.code || '').toLowerCase().includes(search) ||
      (product.supplier || '').toLowerCase().includes(search);
    const matchesCategory = categoryFilter === 'ALL' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: products.length,
    active: products.filter((p) => p.status === 'active').length,
    discontinued: products.filter((p) => p.status === 'discontinued').length,
    totalValue: products.reduce((sum, p) => sum + (p.purchasePrice ?? 0) * p.stock, 0),
  };

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];
  const { canCreate, canUpdate, canDelete } = getCrudVisibility(user, {
    read: ['products.read'],
    create: ['products.create'],
    update: ['products.update', 'products.manage_pricing'],
    remove: ['products.delete'],
  });

  const createMutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      inventoryService.createArticle({
        reference: values.reference || undefined,
        nom: values.nom,
        imageUrl: values.imageUrl || undefined,
        description: values.description || undefined,
        categorie: values.categorie || undefined,
        unite: values.unite,
        prixAchat: values.prixAchat ? Number(values.prixAchat) : undefined,
        prixVente: values.prixVente ? Number(values.prixVente) : undefined,
        quantiteStock: values.quantiteStock ? Number(values.quantiteStock) : undefined,
        seuilAlerte: values.seuilAlerte ? Number(values.seuilAlerte) : undefined,
        seuilRupture: values.seuilRupture ? Number(values.seuilRupture) : undefined,
        emplacement: values.emplacement || undefined,
        status: values.status || 'ACTIF',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-articles'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ProductFormValues }) =>
      inventoryService.updateArticle(id, {
        reference: values.reference || undefined,
        nom: values.nom,
        imageUrl: values.imageUrl || undefined,
        description: values.description || undefined,
        categorie: values.categorie || undefined,
        unite: values.unite,
        prixAchat: values.prixAchat ? Number(values.prixAchat) : undefined,
        prixVente: values.prixVente ? Number(values.prixVente) : undefined,
        quantiteStock: values.quantiteStock ? Number(values.quantiteStock) : undefined,
        seuilAlerte: values.seuilAlerte ? Number(values.seuilAlerte) : undefined,
        seuilRupture: values.seuilRupture ? Number(values.seuilRupture) : undefined,
        emplacement: values.emplacement || undefined,
        status: values.status || 'ACTIF',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-articles'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryService.deleteArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-articles'] });
    },
  });

  const form = useForm<ProductFormValues>({
    defaultValues: {
      reference: '',
      nom: '',
      imageUrl: '',
      description: '',
      categorie: '',
      unite: 'PIECE',
      prixAchat: '',
      prixVente: '',
      quantiteStock: '',
      seuilAlerte: '',
      seuilRupture: '',
      emplacement: '',
      status: 'ACTIF',
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingProduct) {
      form.reset({
        reference: editingProduct.reference || '',
        nom: editingProduct.nom || '',
        imageUrl: editingProduct.imageUrl || '',
        description: editingProduct.description || '',
        categorie: editingProduct.categorie || '',
        unite: editingProduct.unite || 'PIECE',
        prixAchat: editingProduct.prixAchat?.toString() || '',
        prixVente: editingProduct.prixVente?.toString() || '',
        quantiteStock: editingProduct.quantiteStock?.toString() || '',
        seuilAlerte: editingProduct.seuilAlerte?.toString() || '',
        seuilRupture: editingProduct.seuilRupture?.toString() || '',
        emplacement: editingProduct.emplacement || '',
        status: editingProduct.status || 'ACTIF',
      });
    } else {
      form.reset({
        reference: '',
        nom: '',
        imageUrl: '',
        description: '',
        categorie: '',
        unite: 'PIECE',
        prixAchat: '',
        prixVente: '',
        quantiteStock: '',
        seuilAlerte: '',
        seuilRupture: '',
        emplacement: '',
        status: 'ACTIF',
      });
    }
  }, [dialogOpen, editingProduct, form]);

  const openCreate = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const openEdit = (product: InventoryArticle) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = (product: InventoryArticle) => {
    if (confirm(`Supprimer le produit ${product.nom} ?`)) {
      deleteMutation.mutate(product.id);
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, values });
    } else {
      createMutation.mutate(values);
    }
    setDialogOpen(false);
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats">Retour aux achats</Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">Catalogue produits</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsPrintOpen(true)}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
          {canCreate && (
            <Button onClick={openCreate}>
              <Package className="mr-2 h-4 w-4" />
              Nouveau produit
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total produits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Discontinues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.discontinued}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valeur stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} F
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des produits</CardTitle>
          <CardDescription>Vue catalogue et niveaux de stock.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un produit..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'ALL' ? 'Toutes categories' : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Image</th>
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium">Nom</th>
                    <th className="px-4 py-3 font-medium">Categorie</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                    <th className="px-4 py-3 font-medium">Prix achat</th>
                    <th className="px-4 py-3 font-medium">Prix vente</th>
                    <th className="px-4 py-3 font-medium">Unite</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-12 w-12 rounded-md border object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted text-[10px] text-muted-foreground">
                            Sans image
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {product.reference || product.id}
                      </td>
                      <td className="px-4 py-3">{product.name}</td>
                      <td className="px-4 py-3">{product.category}</td>
                      <td className="px-4 py-3">{product.stock}</td>
                      <td className="px-4 py-3 font-medium">
                        {product.purchasePrice !== undefined
                          ? `${product.purchasePrice.toLocaleString('fr-FR', {
                              minimumFractionDigits: 2,
                            })} F`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {product.salePrice !== undefined
                          ? `${product.salePrice.toLocaleString('fr-FR', {
                              minimumFractionDigits: 2,
                            })} F`
                          : '-'}
                      </td>
                      <td className="px-4 py-3">{product.unit || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[product.status]}>
                          {statusLabels[product.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(product.raw)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(product.raw)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProducts.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  Aucun produit trouve.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {(canCreate || canUpdate) && (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Mettre a jour les informations produit.'
                : 'Creer un produit pour le stock.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference</label>
              <Input
                {...form.register('reference')}
                placeholder="Laisser vide pour génération automatique"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom</label>
              <Input {...form.register('nom', { required: true })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Image du produit</label>
              <Input
                {...form.register('imageUrl')}
                placeholder="https://... ou URL publique de l'image"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <Input {...form.register('description')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categorie</label>
              <Input {...form.register('categorie')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unite</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register('unite')}
              >
                {UNIT_OPTIONS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prix achat</label>
              <Input type="number" step="0.01" {...form.register('prixAchat')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prix vente</label>
              <Input type="number" step="0.01" {...form.register('prixVente')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantite stock</label>
              <Input type="number" step="0.01" {...form.register('quantiteStock')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Seuil alerte</label>
              <Input type="number" step="0.01" {...form.register('seuilAlerte')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Seuil rupture</label>
              <Input type="number" step="0.01" {...form.register('seuilRupture')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Emplacement</label>
              <Input {...form.register('emplacement')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register('status')}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Enregistrer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      )}

      {isPrintOpen && (
        <TabularListPrint
          title="Liste des produits"
          subtitle="Catalogue achat et niveaux de stock"
          serviceName={user?.service?.name || user?.department || 'Service achat'}
          columns={[
            { key: 'reference', label: 'Référence' },
            { key: 'name', label: 'Nom' },
            { key: 'category', label: 'Catégorie' },
            { key: 'stock', label: 'Stock', align: 'right' },
            { key: 'purchasePrice', label: 'Prix achat', align: 'right' },
            { key: 'salePrice', label: 'Prix vente', align: 'right' },
            { key: 'unit', label: 'Unité', align: 'center' },
            { key: 'status', label: 'Statut', align: 'center' },
          ]}
          rows={filteredProducts.map((product) => ({
            reference: product.reference || product.id,
            name: product.name,
            category: product.category,
            stock: product.stock,
            purchasePrice: product.purchasePrice !== undefined ? formatFCFA(product.purchasePrice) : '-',
            salePrice: product.salePrice !== undefined ? formatFCFA(product.salePrice) : '-',
            unit: textOrDash(product.unit),
            status: statusLabels[product.status],
          }))}
          summary={[
            { label: 'Total produits', value: stats.total },
            { label: 'Actifs', value: stats.active },
            { label: 'Discontinus', value: stats.discontinued },
            { label: 'Valeur stock', value: formatFCFA(stats.totalValue) },
          ]}
          onClose={() => setIsPrintOpen(false)}
        />
      )}
    </div>
  );
}
