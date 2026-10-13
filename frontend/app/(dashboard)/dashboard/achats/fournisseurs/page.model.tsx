'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Edit, Plus, Search, Star, Trash2, Printer } from 'lucide-react';
import { procurementService, Supplier } from '@/services/procurement';
import type { SupplierStatus } from '@/services/procurement';
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
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import TabularListPrint from '@/components/printComponents/TabularListPrint';
import { formatFCFA, textOrDash } from '@/components/printComponents/printUtils';
import ImportCsvButton, { CsvImportRow } from '@/components/import/ImportCsvButton';

// État, chargement et actions du parcours d'interface.


export const statusColors: Record<SupplierStatus, string> = {
  ACTIF: 'bg-green-100 text-green-800',
  INACTIF: 'bg-gray-100 text-gray-800',
  BLOQUE: 'bg-red-100 text-red-800',
};



export const statusLabels: Record<SupplierStatus, string> = {
  ACTIF: 'Actif',
  INACTIF: 'Inactif',
  BLOQUE: 'Bloque',
};



export interface SupplierFormValues {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  category?: string;
  rating?: string;
  status: SupplierStatus;
}



export const evaluationLevels = [
  { value: '0', label: 'Non evalue' },
  { value: '1', label: '1 - Faible' },
  { value: '2', label: '2 - Moyen' },
  { value: '3', label: '3 - Correct' },
  { value: '4', label: '4 - Bon' },
  { value: '5', label: '5 - Excellent' },
];



export const SUPPLIER_IMPORT_HEADERS = [
  'nom',
  'email',
  'telephone',
  'adresse',
  'categorieActivite',
  'status',
  'rating',
];

export function useSuppliersPageModel() {

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | 'ALL'>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const resolveName = (supplier: Supplier) =>
    supplier.name || (supplier as any).nom || supplier.email || 'Sans nom';

  const { data: suppliersResponse, isLoading } = useQuery<
    Awaited<ReturnType<typeof procurementService.getSuppliers>>
  >({
    queryKey: ['suppliers', searchTerm, statusFilter],
    queryFn: () =>
      procurementService.getSuppliers({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        limit: 200,
      }),
  });

  const suppliers = suppliersResponse?.data ?? [];

  const filteredSuppliers = useMemo(() => {
    const search = (searchTerm || '').toLowerCase();
    return suppliers.filter((supplier) => {
      const name = resolveName(supplier);
      const matchesSearch =
        name.toLowerCase().includes(search) ||
        (supplier.email || '').toLowerCase().includes(search) ||
        (supplier.phone || '').toLowerCase().includes(search) ||
        (supplier.category || '').toLowerCase().includes(search);
      const matchesStatus = statusFilter === 'ALL' || supplier.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: suppliers.length,
      active: suppliers.filter((s) => s.status === 'ACTIF').length,
      totalOrders: suppliers.reduce((sum, s) => sum + (s.ordersCount || 0), 0),
      totalAmount: suppliers.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
    };
  }, [suppliers]);
  const { canCreate, canUpdate, canDelete } = getCrudVisibility(user, {
    read: ['suppliers.read'],
    create: ['suppliers.create'],
    update: ['suppliers.update', 'suppliers.evaluate'],
    remove: ['suppliers.delete'],
  });

  const createMutation = useMutation({
    mutationFn: (values: SupplierFormValues) =>
      procurementService.createSupplier({
        nom: values.name,
        email: values.email || '',
        telephone: values.phone || undefined,
        adresse: values.address || undefined,
        categorie: values.category || undefined,
        rating: values.rating ? Number(values.rating) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: SupplierFormValues }) =>
      procurementService.updateSupplier(id, {
        nom: values.name,
        email: values.email,
        telephone: values.phone,
        adresse: values.address,
        categorie: values.category,
        rating: values.rating ? Number(values.rating) : undefined,
        status: values.status,
      } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => procurementService.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const importMutation = useMutation({
    mutationFn: (rows: CsvImportRow[]) => procurementService.importSuppliers(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const form = useForm<SupplierFormValues>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      category: '',
      rating: '0',
      status: 'ACTIF',
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingSupplier) {
      form.reset({
        name: resolveName(editingSupplier),
        email: editingSupplier.email || '',
        phone: editingSupplier.phone || '',
        address: editingSupplier.address || '',
        category: editingSupplier.category || '',
        rating: String(editingSupplier.rating ?? 0),
        status: editingSupplier.status || 'ACTIF',
      });
    } else {
      form.reset({
        name: '',
        email: '',
        phone: '',
        address: '',
        category: '',
        rating: '0',
        status: 'ACTIF',
      });
    }
  }, [dialogOpen, editingSupplier, form]);

  const openCreate = () => {
    setEditingSupplier(null);
    setDialogOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setDialogOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, values });
    } else {
      createMutation.mutate(values);
    }
    setDialogOpen(false);
  });

  const renderRating = (rating?: number) => {
    const safeRating = rating || 0;
    const levelLabel =
      evaluationLevels.find((level) => Number(level.value) === Math.round(safeRating))?.label || 'Non evalue';
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < Math.floor(safeRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
              }`}
            />
          ))}
          <span className="text-xs text-muted-foreground">{safeRating.toFixed(1)}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{levelLabel}</p>
      </div>
    );
  };
  return {
    user,
    queryClient,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    dialogOpen,
    setDialogOpen,
    editingSupplier,
    setEditingSupplier,
    isPrintOpen,
    setIsPrintOpen,
    supplierToDelete,
    setSupplierToDelete,
    resolveName,
    suppliersResponse,
    isLoading,
    suppliers,
    filteredSuppliers,
    stats,
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
    renderRating,
  };
}
