'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMateriel, useCreateMateriel, useUpdateMateriel, useDeleteMateriel } from '@/hooks/useTechnical';
import { materielService } from '@/shared/api/technical/materiel.service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Pencil, Trash2, Plus, AlertTriangle, Package, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { isAdminRole } from '@/shared/permissions';
import TabularListPrint from '@/components/printComponents/TabularListPrint';
import { formatFCFA, textOrDash } from '@/components/printComponents/printUtils';
import ImportCsvButton, { CsvImportRow } from '@/components/import/ImportCsvButton';

// État, chargement et actions du parcours d'interface.


export const materielSchema = z.object({
  reference: z.string().min(1, 'Référence requise'),
  nom: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  categorie: z.string().min(1, 'Catégorie requise'),
  quantiteStock: z.number().min(0, 'Quantité minimale: 0'),
  seuilAlerte: z.number().min(0, 'Seuil minimal: 0'),
  seuilRupture: z.number().min(0, 'Seuil minimal: 0'),
  prixUnitaire: z.number().optional(),
  fournisseur: z.string().optional(),
  emplacementStock: z.string().optional(),
  notes: z.string().optional(),
});



export type MaterielFormData = z.infer<typeof materielSchema>;



export const MATERIEL_IMPORT_HEADERS = [
  'reference',
  'nom',
  'description',
  'categorie',
  'quantiteStock',
  'seuilAlerte',
  'seuilRupture',
  'prixUnitaire',
  'fournisseur',
  'emplacementStock',
  'notes',
];

export function useMaterielPageModel() {

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = isAdminRole(user);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMateriel, setEditingMateriel] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const { data: materiels = [], isLoading } = useMateriel({ pageSize: 100 });
  const createMutation = useCreateMateriel();
  const updateMutation = useUpdateMateriel();
  const deleteMutation = useDeleteMateriel();
  const importMutation = useMutation({
    mutationFn: (rows: CsvImportRow[]) => materielService.importMateriels(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiel'] });
      queryClient.invalidateQueries({ queryKey: ['materiel-alertes'] });
    },
  });
  const { canCreate, canUpdate, canDelete } = getCrudVisibility(user, {
    read: ['materiel.read'],
    create: ['materiel.create'],
    update: ['materiel.update', 'materiel.assign', 'materiel.maintenance'],
    remove: ['materiel.delete'],
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MaterielFormData>({
    resolver: zodResolver(materielSchema),
  });

  const handleOpenCreate = () => {
    reset({
      reference: '',
      nom: '',
      description: '',
      categorie: '',
      quantiteStock: 0,
      seuilAlerte: 10,
      seuilRupture: 5,
      prixUnitaire: 0,
      fournisseur: '',
      emplacementStock: '',
      notes: '',
    });
    setEditingMateriel(null);
    setIsCreateDialogOpen(true);
  };

  const handleOpenEdit = (materiel: any) => {
    reset({
      reference: materiel.reference,
      nom: materiel.nom,
      description: materiel.description || '',
      categorie: materiel.categorie,
      quantiteStock: materiel.quantiteStock,
      seuilAlerte: materiel.seuilAlerte,
      seuilRupture: materiel.seuilRupture,
      prixUnitaire: materiel.prixUnitaire || 0,
      fournisseur: materiel.fournisseur || '',
      emplacementStock: materiel.emplacementStock || '',
      notes: materiel.notes || '',
    });
    setEditingMateriel(materiel);
    setIsCreateDialogOpen(true);
  };

  const onSubmit = async (data: MaterielFormData) => {
    try {
      if (editingMateriel) {
        await updateMutation.mutateAsync({
          id: editingMateriel.id,
          data,
        });
        toast.success('Matériel modifié avec succès');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Matériel créé avec succès');
      }
      setIsCreateDialogOpen(false);
      reset();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string, nom: string, force = false) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${nom}" ?`)) {
      try {
        await deleteMutation.mutateAsync({ id, force });
        toast.success('Matériel supprimé');
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Erreur lors de la suppression');
      }
    }
  };

  const getStockBadge = (materiel: any) => {
    const stock = materiel.quantiteDisponible ?? materiel.quantiteStock ?? 0;
    if (stock <= materiel.seuilRupture) {
      return <Badge variant="destructive">Rupture</Badge>;
    }
    if (stock <= materiel.seuilAlerte) {
      return <Badge variant="warning">Alerte</Badge>;
    }
    return <Badge variant="success">Disponible</Badge>;
  };

  const filteredMateriels = materiels.filter((m: any) =>
    m.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.categorie?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return {
    user,
    queryClient,
    isAdmin,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    editingMateriel,
    setEditingMateriel,
    searchQuery,
    setSearchQuery,
    isPrintOpen,
    setIsPrintOpen,
    materiels,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
    importMutation,
    canCreate,
    canUpdate,
    canDelete,
    register,
    handleSubmit,
    errors,
    reset,
    handleOpenCreate,
    handleOpenEdit,
    onSubmit,
    handleDelete,
    getStockBadge,
    filteredMateriels,
  };
}
