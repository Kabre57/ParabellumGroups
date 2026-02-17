'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useContrats,
  useCreateContrat,
  useUpdateContratStatus,
  useContratsExpiring,
  useClients,
} from '@/hooks/useCrm';
import { Client, Contrat } from '@/shared/api/crm/types';
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
  Calendar,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Edit,
  RefreshCw,
} from 'lucide-react';
import { useForm } from 'react-hook-form';

const STATUS_OPTIONS = [
  'BROUILLON',
  'EN_ATTENTE_SIGNATURE',
  'ACTIF',
  'SUSPENDU',
  'RESILIE',
  'TERMINE',
  'EN_RENOUVELLEMENT',
];

const TYPE_OPTIONS = [
  'MAINTENANCE',
  'SERVICE',
  'PRODUIT',
  'PARTENARIAT',
  'ABONNEMENT',
  'FORFAIT',
  'CONSULTING',
  'FORMATION',
  'LICENCE',
  'SAAS',
];

interface ContratFormValues {
  clientId: string;
  titre: string;
  description?: string;
  typeContrat: string;
  dateDebut: string;
  dateFin?: string;
  dateSignature?: string;
  dateEffet?: string;
  montantHT: string;
  montantTTC: string;
  tauxTVA: string;
  devise: string;
  status: string;
  periodicitePaiement?: string;
  jourPaiement?: string;
  estRenouvelable?: boolean;
  periodeRenouvellement?: string;
  dateProchainRenouvellement?: string;
  preavisRenouvellement?: string;
  conditionsParticulieres?: string;
  signataireId?: string;
}

export default function ContractsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contrat | null>(null);

  const { data: contrats = [], isLoading } = useContrats({ page: 1, limit: 200 });
  const { data: clients = [] } = useClients({ pageSize: 200 });
  const { data: expiringData } = useContratsExpiring({ days: 30 });

  const contratsArray: Contrat[] = Array.isArray(contrats) ? (contrats as Contrat[]) : [];
  const clientsArray: Client[] = Array.isArray(clients)
    ? (clients as Client[])
    : ((clients as any)?.data || []);

  const createMutation = useCreateContrat();
  const updateStatusMutation = useUpdateContratStatus();

  const clientMap = useMemo(() => {
    const entries = clientsArray.map((c) => [c.id, c]);
    return new Map(entries);
  }, [clientsArray]);

  const filteredContrats = useMemo(() => {
    return contratsArray.filter((contrat: Contrat) => {
      const client = clientMap.get(contrat.clientId);
      const clientName = client?.nom || '';
      const matchesSearch =
        contrat.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contrat.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contrat.numeroContrat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || contrat.status === statusFilter;
      const matchesType = typeFilter === 'all' || contrat.typeContrat === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [contratsArray, clientMap, searchTerm, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const total = contratsArray.length;
    const actifs = contratsArray.filter((c: Contrat) => c.status === 'ACTIF').length;
    const attente = contratsArray.filter((c: Contrat) => c.status === 'EN_ATTENTE_SIGNATURE').length;
    const expiringSoon = (expiringData as any)?.meta?.count || 0;
    return { total, actifs, attente, expiringSoon };
  }, [contratsArray, expiringData]);

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, string> = {
      ACTIF: 'bg-green-100 text-green-800',
      BROUILLON: 'bg-gray-100 text-gray-800',
      EN_ATTENTE_SIGNATURE: 'bg-yellow-100 text-yellow-800',
      SUSPENDU: 'bg-orange-100 text-orange-800',
      TERMINE: 'bg-blue-100 text-blue-800',
      RESILIE: 'bg-red-100 text-red-800',
      EN_RENOUVELLEMENT: 'bg-purple-100 text-purple-800',
    };
    return <Badge className={statuses[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
  };

  const openCreate = () => {
    setEditingContract(null);
    setDialogOpen(true);
  };

  const openStatusEdit = (contrat: Contrat) => {
    setEditingContract(contrat);
    setStatusDialogOpen(true);
  };

  const form = useForm<ContratFormValues>({
    defaultValues: {
      clientId: '',
      titre: '',
      description: '',
      typeContrat: 'SERVICE',
      dateDebut: '',
      dateFin: '',
      dateSignature: '',
      dateEffet: '',
      montantHT: '',
      montantTTC: '',
      tauxTVA: '20',
      devise: 'EUR',
      status: 'BROUILLON',
      periodicitePaiement: '',
      jourPaiement: '',
      estRenouvelable: false,
      periodeRenouvellement: '',
      dateProchainRenouvellement: '',
      preavisRenouvellement: '',
      conditionsParticulieres: '',
      signataireId: '',
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset({
      clientId: '',
      titre: '',
      description: '',
      typeContrat: 'SERVICE',
      dateDebut: '',
      dateFin: '',
      dateSignature: '',
      dateEffet: '',
      montantHT: '',
      montantTTC: '',
      tauxTVA: '20',
      devise: 'EUR',
      status: 'BROUILLON',
      periodicitePaiement: '',
      jourPaiement: '',
      estRenouvelable: false,
      periodeRenouvellement: '',
      dateProchainRenouvellement: '',
      preavisRenouvellement: '',
      conditionsParticulieres: '',
      signataireId: '',
    });
  }, [dialogOpen, form]);

  const onSubmit = async (values: ContratFormValues) => {
    try {
      const montantHT = parseFloat(values.montantHT || '0');
      const tauxTVA = parseFloat(values.tauxTVA || '0');
      const montantTTC = parseFloat(values.montantTTC || '0') || montantHT * (1 + tauxTVA / 100);

      await createMutation.mutateAsync({
        ...values,
        jourPaiement: values.jourPaiement ? Number(values.jourPaiement) : undefined,
        preavisRenouvellement: values.preavisRenouvellement ? Number(values.preavisRenouvellement) : undefined,
        montantHT,
        montantTTC,
        tauxTVA,
      });

      queryClient.invalidateQueries({ queryKey: ['crm', 'contrats'] });
      setDialogOpen(false);
    } catch (error) {
      console.error('Erreur contrat:', error);
    }
  };

  const onUpdateStatus = async (status: string) => {
    if (!editingContract) return;
    try {
      await updateStatusMutation.mutateAsync({ id: editingContract.id, status });
      queryClient.invalidateQueries({ queryKey: ['crm', 'contrats'] });
      setStatusDialogOpen(false);
      setEditingContract(null);
    } catch (error) {
      console.error('Erreur statut contrat:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contrats</h1>
        <p className="text-muted-foreground">Suivi et gestion des contrats clients</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total contrats</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contrats actifs</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.actifs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attente}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A renouveler</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringSoon}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des contrats</CardTitle>
          <CardDescription>Filtrez et gerez vos contrats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par reference, titre, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Tous types</option>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Tous statuts</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau contrat
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Spinner />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Reference</th>
                    <th className="text-left p-4 font-medium">Titre</th>
                    <th className="text-left p-4 font-medium">Client</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">Montant TTC</th>
                    <th className="text-left p-4 font-medium">Statut</th>
                    <th className="text-left p-4 font-medium">Fin de contrat</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContrats.map((contract) => (
                    <tr key={contract.id} className="border-t hover:bg-muted/50">
                      <td className="p-4 font-medium">{contract.numeroContrat || contract.reference}</td>
                      <td className="p-4">{contract.titre}</td>
                      <td className="p-4">{clientMap.get(contract.clientId)?.nom || 'Inconnu'}</td>
                      <td className="p-4">{contract.typeContrat}</td>
                      <td className="p-4">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: contract.devise || 'EUR' }).format(contract.montantTTC)}
                      </td>
                      <td className="p-4">{getStatusBadge(contract.status)}</td>
                      <td className="p-4">
                        {contract.dateFin ? new Date(contract.dateFin).toLocaleDateString('fr-FR') : 'Indeterminee'}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openStatusEdit(contract)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Statut
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredContrats.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        Aucun contrat trouve
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nouveau contrat</DialogTitle>
            <DialogDescription>
              Renseignez les informations principales du contrat.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium mb-1">Titre *</label>
                <Input {...form.register('titre', { required: true })} />
                {form.formState.errors.titre && (
                  <p className="text-xs text-red-600">Titre requis</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type contrat *</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('typeContrat')}>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Statut *</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('status')}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date debut *</label>
                <Input type="date" {...form.register('dateDebut', { required: true })} />
                {form.formState.errors.dateDebut && (
                  <p className="text-xs text-red-600">Date debut requise</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date fin</label>
                <Input type="date" {...form.register('dateFin')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date signature</label>
                <Input type="date" {...form.register('dateSignature')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date effet</label>
                <Input type="date" {...form.register('dateEffet')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Montant HT *</label>
                <Input type="number" step="0.01" {...form.register('montantHT', { required: true })} />
                {form.formState.errors.montantHT && (
                  <p className="text-xs text-red-600">Montant HT requis</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Montant TTC *</label>
                <Input type="number" step="0.01" {...form.register('montantTTC', { required: true })} />
                {form.formState.errors.montantTTC && (
                  <p className="text-xs text-red-600">Montant TTC requis</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Taux TVA (%)</label>
                <Input type="number" step="0.01" {...form.register('tauxTVA')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Devise *</label>
                <Input {...form.register('devise', { required: true })} />
                {form.formState.errors.devise && (
                  <p className="text-xs text-red-600">Devise requise</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Periodicite paiement</label>
                <Input {...form.register('periodicitePaiement')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Jour de paiement</label>
                <Input type="number" min="1" max="31" {...form.register('jourPaiement')} />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" {...form.register('estRenouvelable')} />
                <span className="text-sm">Renouvelable</span>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Periode renouvellement</label>
                <Input {...form.register('periodeRenouvellement')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date prochain renouvellement</label>
                <Input type="date" {...form.register('dateProchainRenouvellement')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Preavis renouvellement (jours)</label>
                <Input type="number" min="0" {...form.register('preavisRenouvellement')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Signataire ID</label>
                <Input {...form.register('signataireId')} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea className="w-full px-3 py-2 border rounded-md" rows={3} {...form.register('description')} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Conditions particulieres</label>
                <textarea className="w-full px-3 py-2 border rounded-md" rows={3} {...form.register('conditionsParticulieres')} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Creer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le statut</DialogTitle>
            <DialogDescription>
              Choisissez un statut autorise pour ce contrat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={editingContract?.status || ''}
              onChange={(e) => {
                if (!editingContract) return;
                setEditingContract({ ...editingContract, status: e.target.value });
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => editingContract && onUpdateStatus(editingContract.status)}
                disabled={updateStatusMutation.isPending}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Mettre a jour
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
