'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import ImportCsvButton, { CsvImportRow } from '@/components/import/ImportCsvButton';

// État, chargement et actions du parcours d'interface.


export type ProductStatus = 'active' | 'discontinued';



export interface Product {
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



export const statusColors: Record<ProductStatus, string> = {
  active: 'bg-green-100 text-green-800',
  discontinued: 'bg-red-100 text-red-800',
};



export const statusLabels: Record<ProductStatus, string> = {
  active: 'Actif',
  discontinued: 'Discontinue',
};



export const STATUS_OPTIONS: { value: ArticleStatus; label: string }[] = [
  { value: 'ACTIF', label: 'Actif' },
  { value: 'INACTIF', label: 'Inactif' },
  { value: 'OBSOLETE', label: 'Obsolete' },
];



export const UNIT_OPTIONS: { value: ArticleUnit; label: string }[] = [
  { value: 'PIECE', label: 'Piece' },
  { value: 'KG', label: 'Kg' },
  { value: 'M', label: 'Metre' },
  { value: 'L', label: 'Litre' },
];



export const PRODUCT_IMPORT_HEADERS = [
  'reference',
  'nom',
  'description',
  'categorie',
  'unite',
  'prixAchat',
  'prixVente',
  'quantiteStock',
  'seuilAlerte',
  'seuilRupture',
  'emplacement',
  'status',
];



export interface ProductFormValues {
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

export function useProductsPageModel() {

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryArticle | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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
        reference: undefined,
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

  const importMutation = useMutation({
    mutationFn: (rows: CsvImportRow[]) => inventoryService.importArticles(rows),
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

  const imageUrlValue = form.watch('imageUrl');

  const handleImagePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      form.setValue('imageUrl', String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };
  return {
    user,
    queryClient,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    dialogOpen,
    setDialogOpen,
    editingProduct,
    setEditingProduct,
    isPrintOpen,
    setIsPrintOpen,
    imageInputRef,
    articlesResponse,
    isLoading,
    products,
    filteredProducts,
    stats,
    categories,
    canCreate,
    canUpdate,
    canDelete,
    createMutation,
    updateMutation,
    deleteMutation,
    importMutation,
    form,
    openCreate,
    openEdit,
    handleDelete,
    onSubmit,
    imageUrlValue,
    handleImagePick,
  };
}
