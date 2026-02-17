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

const TYPE_OPTIONS = [
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

interface DocumentFormValues {
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

const DocumentsPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<CrmDocument | null>(null);

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
    const entries = clientsArray.map((c) => [c.id, c]);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documents CRM</h1>
        <p className="text-muted-foreground">Gerez vos documents clients</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contrats</CardTitle>
            <File className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contrats}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rapports</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rapports}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financier</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.financiers}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bibliotheque de documents</CardTitle>
          <CardDescription>Rechercher, modifier et supprimer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un document..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Tous les types</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <Button onClick={openCreate}>
              <Upload className="mr-2 h-4 w-4" />
              Nouveau document
            </Button>
          </div>

          <div className="rounded-md border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Nom</th>
                  <th className="p-3 text-left font-medium">Client</th>
                  <th className="p-3 text-left font-medium">Type</th>
                  <th className="p-3 text-left font-medium">Taille</th>
                  <th className="p-3 text-left font-medium">Date</th>
                  <th className="p-3 text-left font-medium">Valide</th>
                  <th className="p-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((document) => (
                  <tr key={document.id} className="border-t hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{document.displayName}</span>
                      </div>
                    </td>
                    <td className="p-3">{document.clientName}</td>
                    <td className="p-3">
                      <Badge className={getTypeColor(document.displayType)}>
                        {document.displayType}
                      </Badge>
                    </td>
                    <td className="p-3">{document.displaySize}</td>
                    <td className="p-3">
                      {document.uploadedAt ? new Date(document.uploadedAt).toLocaleDateString('fr-FR') : '--'}
                    </td>
                    <td className="p-3">
                      <Badge className={document.estValide ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {document.estValide ? 'VALIDE' : 'BROUILLON'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(document)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleValidity(document, !document.estValide)}
                        >
                          {document.estValide ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDelete(document)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDocuments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucun document trouve
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingDoc ? 'Modifier document' : 'Nouveau document'}</DialogTitle>
            <DialogDescription>
              {editingDoc ? 'Modifiez les metadonnees du document.' : 'Televersez un document client.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!editingDoc && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Client *</label>
                    <select className="w-full px-3 py-2 border rounded-md" {...form.register('clientId', { required: true })}>
                      <option value="">Selectionner un client</option>
                      {clientsArray.map((client) => (
                        <option key={client.id} value={client.id}>{client.nom}</option>
                      ))}
                    </select>
                    {form.formState.errors.clientId && (
                      <p className="text-xs text-red-600">Client requis</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Fichier (optionnel)</label>
                    <Input type="file" {...form.register('file')} onChange={handleFileChange} />
                    <p className="text-xs text-muted-foreground mt-1">
                      Si vous ajoutez un fichier, ses metadonnees seront utilisees automatiquement.
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Nom du fichier *</label>
                <Input {...form.register('nomFichier', { required: true })} />
                {form.formState.errors.nomFichier && (
                  <p className="text-xs text-red-600">Nom requis</p>
                )}
              </div>

              {!editingDoc && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Chemin *</label>
                    <Input {...form.register('chemin', { required: !editingDoc })} />
                    {form.formState.errors.chemin && (
                      <p className="text-xs text-red-600">Chemin requis</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Type MIME *</label>
                    <Input {...form.register('mimeType', { required: !editingDoc })} />
                    {form.formState.errors.mimeType && (
                      <p className="text-xs text-red-600">Type MIME requis</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Taille (octets) *</label>
                    <Input type="number" {...form.register('taille', { required: !editingDoc })} />
                    {form.formState.errors.taille && (
                      <p className="text-xs text-red-600">Taille requise</p>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Type document *</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('typeDocument')}>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" {...form.register('confidential')} />
                <span className="text-sm">Confidentiel</span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea className="w-full px-3 py-2 border rounded-md" rows={3} {...form.register('description')} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingDoc ? 'Mettre a jour' : 'Creer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
