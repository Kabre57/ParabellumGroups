'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useDocuments,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
  useUpdateDocumentValidity,
  useClients,
} from '@/hooks/useCrm';
import { Client, Document as CrmDocument } from '@/shared/api/crm/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  FileText,
  Upload,
  Search,
  File,
  FileCheck,
  BarChart,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';

// État, chargement et actions du parcours d'interface.


export const TYPE_OPTIONS = [
  'CONTRAT',
  'FACTURE',
  'DEVIS',
  'AVENANT',
  'KYC',
  'LEGAL',
  'TECHNIQUE',
  'COMMERCIAL',
  'ADMINISTRATIF',
  'FINANCIER',
  'RAPPORT',
];



export interface DocumentFormValues {
  clientId: string;
  typeDocument: string;
  nomFichier: string;
  chemin: string;
  mimeType: string;
  taille: string;
  description?: string;
  confidential: boolean;
  file?: FileList;
}

export function useDocumentsPageModel() {

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<CrmDocument | null>(null);
  const { canCreate, canUpdate, canDelete } = getCrudVisibility(user, {
    read: ['documents.read', 'documents.read_all', 'customers.manage_documents'],
    create: ['documents.upload', 'customers.manage_documents'],
    update: ['documents.update', 'customers.manage_documents'],
    remove: ['documents.delete', 'customers.manage_documents'],
  });

  const { data: documents = [], isLoading } = useDocuments({ page: 1, limit: 200 });
  const { data: clients = [] } = useClients({ pageSize: 200 });

  const documentsArray: CrmDocument[] = Array.isArray(documents)
    ? (documents as CrmDocument[])
    : ((documents as any)?.data || []);
  const clientsArray: Client[] = Array.isArray(clients)
    ? (clients as Client[])
    : ((clients as any)?.data || []);

  const createMutation = useCreateDocument();
  const updateMutation = useUpdateDocument();
  const deleteMutation = useDeleteDocument();
  const validityMutation = useUpdateDocumentValidity();

  const clientMap = useMemo(() => {
    const entries: Array<[string, Client]> = clientsArray.map((c): [string, Client] => [c.id, c]);
    return new Map(entries);
  }, [clientsArray]);

  const docs = useMemo(() => {
    return documentsArray.map((doc) => ({
      ...doc,
      displayName: doc.nomFichier || doc.id,
      displayType: doc.typeDocument || 'AUTRE',
      displaySize: doc.taille ? `${Math.round(doc.taille / 1024)} KB` : '--',
      uploadedAt: doc.dateUpload,
      clientName: (doc as any)?.client?.nom || clientMap.get((doc as any)?.clientId)?.nom || '--',
    }));
  }, [documentsArray, clientMap]);

  const stats = {
    totalDocuments: docs.length,
    contrats: docs.filter((d) => d.displayType === 'CONTRAT').length,
    rapports: docs.filter((d) => d.displayType === 'RAPPORT').length,
    financiers: docs.filter((d) => d.displayType === 'FINANCIER').length,
  };

  const filteredDocuments = docs.filter((document) => {
    const matchesSearch =
      document.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      document.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (document.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || document.displayType === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      CONTRAT: 'bg-purple-500/10 text-purple-500',
      RAPPORT: 'bg-green-500/10 text-green-500',
      FACTURE: 'bg-orange-500/10 text-orange-500',
      FINANCIER: 'bg-yellow-500/10 text-yellow-600',
    };
    return colors[type] || 'bg-gray-500/10 text-gray-500';
  };

  const form = useForm<DocumentFormValues>({
    defaultValues: {
      clientId: '',
      typeDocument: 'CONTRAT',
      nomFichier: '',
      chemin: '',
      mimeType: '',
      taille: '',
      description: '',
      confidential: false,
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingDoc) {
      form.reset({
        clientId: (editingDoc as any)?.clientId || '',
        typeDocument: editingDoc.typeDocument || 'CONTRAT',
        nomFichier: editingDoc.nomFichier || '',
        chemin: '',
        mimeType: '',
        taille: '',
        description: editingDoc.description || '',
        confidential: !!editingDoc.confidential,
      });
    } else {
      form.reset({
        clientId: '',
        typeDocument: 'CONTRAT',
        nomFichier: '',
        chemin: '',
        mimeType: '',
        taille: '',
        description: '',
        confidential: false,
      });
    }
  }, [dialogOpen, editingDoc, form]);

  const openCreate = () => {
    setEditingDoc(null);
    setDialogOpen(true);
  };

  const openEdit = (doc: CrmDocument) => {
    setEditingDoc(doc);
    setDialogOpen(true);
  };

  const handleDelete = (doc: CrmDocument) => {
    if (confirm(`Supprimer le document ${doc.nomFichier || doc.id} ?`)) {
      deleteMutation.mutate(doc.id, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['crm', 'documents'] });
        },
      });
    }
  };

  const handleValidity = (doc: CrmDocument, estValide: boolean) => {
    validityMutation.mutate(
      { id: doc.id, data: { estValide } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['crm', 'documents'] });
        },
      }
    );
  };

  const onSubmit = async (values: DocumentFormValues) => {
    try {
      if (editingDoc) {
        await updateMutation.mutateAsync({
          id: editingDoc.id,
          data: {
            typeDocument: values.typeDocument,
            nomFichier: values.nomFichier,
            description: values.description,
            confidential: values.confidential,
          },
        });
      } else {
        const file = values.file?.[0];
        const nomFichier = values.nomFichier || file?.name || '';
        const mimeType = values.mimeType || file?.type || '';
        const taille = values.taille || (file?.size ? String(file.size) : '');
        const chemin = values.chemin || file?.name || '';

        await createMutation.mutateAsync({
          clientId: values.clientId,
          typeDocument: values.typeDocument,
          nomFichier,
          chemin,
          taille,
          mimeType,
          description: values.description,
          confidential: values.confidential,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['crm', 'documents'] });
      setDialogOpen(false);
      setEditingDoc(null);
    } catch (error) {
      console.error('Erreur document:', error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    form.setValue('nomFichier', file.name, { shouldValidate: true });
    form.setValue('mimeType', file.type || 'application/octet-stream', { shouldValidate: true });
    form.setValue('taille', String(file.size), { shouldValidate: true });
    form.setValue('chemin', file.name, { shouldValidate: true });
  };
  return {
    user,
    queryClient,
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    dialogOpen,
    setDialogOpen,
    editingDoc,
    setEditingDoc,
    canCreate,
    canUpdate,
    canDelete,
    documents,
    isLoading,
    clients,
    documentsArray,
    clientsArray,
    createMutation,
    updateMutation,
    deleteMutation,
    validityMutation,
    clientMap,
    docs,
    stats,
    filteredDocuments,
    getTypeColor,
    form,
    openCreate,
    openEdit,
    handleDelete,
    handleValidity,
    onSubmit,
    handleFileChange,
  };
}
