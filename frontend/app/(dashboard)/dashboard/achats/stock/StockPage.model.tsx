'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, List, MoveRight, Plus, Printer } from 'lucide-react';
import { inventoryService } from '@/shared/api/inventory/inventory.service';
import type {
  InventoryArticle,
  StockMovement,
  StockMovementType,
  ArticleUnit,
} from '@/shared/api/inventory/types';
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
import { formatFCFA, formatPrintDate, textOrDash } from '@/components/printComponents/printUtils';



interface MovementFormValues {
  articleId: string;
  type: StockMovementType;
  quantite: string;
  dateOperation?: string;
  numeroDocument?: string;
  emplacement?: string;
  notes?: string;
}

interface CreateArticleFormValues {
  reference?: string;
  nom: string;
  description?: string;
  categorie?: string;
  unite?: ArticleUnit;
  prixAchat?: string;
  prixVente?: string;
  quantiteStock?: string;
  seuilAlerte?: string;
  seuilRupture?: string;
  emplacement?: string;
}

export function useStockPageModel() {
const { user } = useAuth();

const [categoryFilter, setCategoryFilter] = useState('');

const [showLowStock, setShowLowStock] = useState(false);

const [activeTab, setActiveTab] = useState<'items' | 'movements'>('items');

const queryClient = useQueryClient();

const [dialogOpen, setDialogOpen] = useState(false);

const [selectedArticle, setSelectedArticle] = useState<InventoryArticle | null>(null);

const [createDialogOpen, setCreateDialogOpen] = useState(false);

const [isPrintOpen, setIsPrintOpen] = useState(false);

const { data: stockItemsResponse, isLoading: itemsLoading } = useQuery<
    Awaited<ReturnType<typeof inventoryService.getArticles>>
  >({
    queryKey: ['inventory-articles', categoryFilter, showLowStock],
    queryFn: () =>
      inventoryService.getArticles({
        categorie: categoryFilter || undefined,
      }),
  });

const { data: movementsResponse, isLoading: movementsLoading } = useQuery<
    Awaited<ReturnType<typeof inventoryService.getMovements>>
  >({
    queryKey: ['inventory-movements'],
    queryFn: () => inventoryService.getMovements(),
    enabled: activeTab === 'movements',
  });

const stockItems = Array.isArray(stockItemsResponse?.data) ? stockItemsResponse?.data : [];

const movements = Array.isArray(movementsResponse?.data) ? movementsResponse?.data : [];

const filteredItems = useMemo(() => {
    const normalizedCategory = categoryFilter.trim().toLowerCase();
    return stockItems.filter((item) => {
      const itemCategory = (item.categorie || '').toLowerCase();
      if (normalizedCategory && !itemCategory.includes(normalizedCategory)) {
        return false;
      }
      if (showLowStock) {
        return (item.quantiteStock ?? 0) <= (item.seuilAlerte ?? 0);
      }
      return true;
    });
  }, [stockItems, categoryFilter, showLowStock]);

const lowStockCount = stockItems.filter(
    (item: InventoryArticle) =>
      (item.quantiteStock ?? 0) <= (item.seuilAlerte ?? 0)
  ).length;

const totalStockValue = stockItems.reduce(
    (sum, item) => sum + (item.quantiteStock ?? 0) * (item.prixAchat ?? 0),
    0
  );

const { canCreate, canUpdate } = getCrudVisibility(user, {
    read: ['inventory.read', 'inventory.read_all', 'inventory.read_warehouse'],
    create: ['inventory.create'],
    update: ['inventory.update', 'inventory.adjust', 'inventory.transfer', 'inventory.count'],
  });

const createMovementMutation = useMutation({
    mutationFn: (values: MovementFormValues) =>
      inventoryService.createMovement({
        articleId: values.articleId,
        type: values.type,
        quantite: Number(values.quantite) || 0,
        dateOperation: values.dateOperation || undefined,
        numeroDocument: values.numeroDocument || undefined,
        emplacement: values.emplacement || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-articles'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
    },
  });

const form = useForm<MovementFormValues>({
    defaultValues: {
      articleId: '',
      type: 'AJUSTEMENT',
      quantite: '',
      dateOperation: '',
      numeroDocument: '',
      emplacement: '',
      notes: '',
    },
  });

useEffect(() => {
    if (!dialogOpen) return;
    form.reset({
      articleId: selectedArticle?.id || stockItems[0]?.id || '',
      type: 'AJUSTEMENT',
      quantite: '',
      dateOperation: '',
      numeroDocument: '',
      emplacement: selectedArticle?.emplacement || '',
      notes: '',
    });
  }, [dialogOpen, selectedArticle, stockItems, form]);

const openAdjust = (article?: InventoryArticle) => {
    setSelectedArticle(article || null);
    setDialogOpen(true);
  };

const createArticleForm = useForm<CreateArticleFormValues>({
    defaultValues: {
      reference: '',
      nom: '',
      categorie: '',
      unite: 'PIECE',
      prixAchat: '',
      prixVente: '',
      quantiteStock: '',
      seuilAlerte: '',
      seuilRupture: '',
      emplacement: '',
    },
  });

const createArticleMutation = useMutation({
    mutationFn: (values: CreateArticleFormValues) =>
      inventoryService.createArticle({
        reference: values.reference || undefined,
        nom: values.nom,
        description: values.description || undefined,
        categorie: values.categorie || undefined,
        unite: values.unite,
        prixAchat: values.prixAchat ? Number(values.prixAchat) : undefined,
        prixVente: values.prixVente ? Number(values.prixVente) : undefined,
        quantiteStock: values.quantiteStock ? Number(values.quantiteStock) : undefined,
        seuilAlerte: values.seuilAlerte ? Number(values.seuilAlerte) : undefined,
        seuilRupture: values.seuilRupture ? Number(values.seuilRupture) : undefined,
        emplacement: values.emplacement || undefined,
        status: 'ACTIF',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-articles'] });
    },
  });

const onSubmit = form.handleSubmit((values) => {
    createMovementMutation.mutate(values);
    setDialogOpen(false);
  });

const onCreateArticle = createArticleForm.handleSubmit((values) => {
    createArticleMutation.mutate(values);
    setCreateDialogOpen(false);
  });

  return {
    user,
    categoryFilter,
    setCategoryFilter,
    showLowStock,
    setShowLowStock,
    activeTab,
    setActiveTab,
    queryClient,
    dialogOpen,
    setDialogOpen,
    selectedArticle,
    setSelectedArticle,
    createDialogOpen,
    setCreateDialogOpen,
    isPrintOpen,
    setIsPrintOpen,
    stockItemsResponse,
    itemsLoading,
    movementsResponse,
    movementsLoading,
    stockItems,
    movements,
    filteredItems,
    lowStockCount,
    totalStockValue,
    canCreate,
    canUpdate,
    createMovementMutation,
    form,
    openAdjust,
    createArticleForm,
    createArticleMutation,
    onSubmit,
    onCreateArticle,
  };
}

export type StockPageModel = ReturnType<typeof useStockPageModel>;
