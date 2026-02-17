'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useOpportunites,
  useCreateOpportunite,
  useUpdateOpportunite,
  useDeleteOpportunite,
  useClients,
} from '@/hooks/useCrm';
import { Client, Opportunite } from '@/shared/api/crm/types';
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
  TrendingUp,
  DollarSign,
  Target,
  Calendar,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';

const STAGE_OPTIONS = [
  'PROSPECTION',
  'QUALIFICATION',
  'PROPOSITION',
  'NEGOCIATION',
  'FINALISATION',
  'GAGNEE',
  'PERDUE',
];

const STATUS_OPTIONS = [
  'OUVERTE',
  'GAGNEE',
  'PERDUE',
  'MISE_EN_ATTENTE',
];

interface OpportuniteFormValues {
  clientId: string;
  nom: string;
  description?: string;
  montantEstime: string;
  probabilite: string;
  dateFermetureEstimee?: string;
  etape: string;
  statut: string;
}

export default function OpportunitiesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunite | null>(null);

  const { data: opportunites = [], isLoading } = useOpportunites({ page: 1, limit: 200 });
  const { data: clients = [] } = useClients({ pageSize: 200 });

  const opportunitesArray: Opportunite[] = Array.isArray(opportunites)
    ? (opportunites as Opportunite[])
    : ((opportunites as any)?.data || []);
  const clientsArray: Client[] = Array.isArray(clients)
    ? (clients as Client[])
    : ((clients as any)?.data || []);

  const createMutation = useCreateOpportunite();
  const updateMutation = useUpdateOpportunite();
  const deleteMutation = useDeleteOpportunite();

  const clientMap = useMemo(() => {
    const entries = clientsArray.map((c) => [c.id, c]);
    return new Map(entries);
  }, [clientsArray]);

  const filteredOpportunities = useMemo(() => {
    return opportunitesArray.filter((opp: Opportunite) => {
      const client = clientMap.get(opp.clientId);
      const clientName = client?.nom || '';
      const matchesSearch =
        opp.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opp.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStage = stageFilter === 'all' || opp.etape === stageFilter;

      return matchesSearch && matchesStage;
    });
  }, [opportunitesArray, clientMap, searchTerm, stageFilter]);

  const stats = useMemo(() => {
    const total = opportunitesArray.length;
    const pipelineValue = opportunitesArray.reduce((acc, o) => acc + (o.montantEstime || 0), 0);
    const conversionRate = total > 0
      ? Math.round((opportunitesArray.filter((o) => o.statut === 'GAGNEE').length / total) * 100)
      : 0;
    return { total, pipelineValue, conversionRate };
  }, [opportunitesArray]);

  const getEtapeBadge = (etape: string) => {
    const stages: Record<string, string> = {
      PROSPECTION: 'bg-blue-100 text-blue-800',
      QUALIFICATION: 'bg-purple-100 text-purple-800',
      PROPOSITION: 'bg-orange-100 text-orange-800',
      NEGOCIATION: 'bg-yellow-100 text-yellow-800',
      FINALISATION: 'bg-indigo-100 text-indigo-800',
      GAGNEE: 'bg-green-100 text-green-800',
      PERDUE: 'bg-red-100 text-red-800',
    };
    return <Badge className={stages[etape] || 'bg-gray-100 text-gray-800'}>{etape}</Badge>;
  };

  const form = useForm<OpportuniteFormValues>({
    defaultValues: {
      clientId: '',
      nom: '',
      description: '',
      montantEstime: '',
      probabilite: '50',
      dateFermetureEstimee: '',
      etape: 'PROSPECTION',
      statut: 'OUVERTE',
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingOpportunity) {
      form.reset({
        clientId: editingOpportunity.clientId || '',
        nom: editingOpportunity.nom || '',
        description: editingOpportunity.description || '',
        montantEstime: String(editingOpportunity.montantEstime || ''),
        probabilite: String(editingOpportunity.probabilite || 50),
        dateFermetureEstimee: editingOpportunity.dateFermetureEstimee || '',
        etape: editingOpportunity.etape || 'PROSPECTION',
        statut: editingOpportunity.statut || 'OUVERTE',
      });
    } else {
      form.reset({
        clientId: '',
        nom: '',
        description: '',
        montantEstime: '',
        probabilite: '50',
        dateFermetureEstimee: '',
        etape: 'PROSPECTION',
        statut: 'OUVERTE',
      });
    }
  }, [dialogOpen, editingOpportunity, form]);

  const openCreate = () => {
    setEditingOpportunity(null);
    setDialogOpen(true);
  };

  const openEdit = (opp: Opportunite) => {
    setEditingOpportunity(opp);
    setDialogOpen(true);
  };

  const handleDelete = (opp: Opportunite) => {
    if (confirm(`Supprimer l'opportunite ${opp.nom} ?`)) {
      deleteMutation.mutate(opp.id, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['crm', 'opportunites'] });
        },
      });
    }
  };

  const onSubmit = async (values: OpportuniteFormValues) => {
    try {
      const payload = {
        ...values,
        montantEstime: parseFloat(values.montantEstime || '0'),
        probabilite: parseFloat(values.probabilite || '0'),
      };

      if (editingOpportunity) {
        await updateMutation.mutateAsync({ id: editingOpportunity.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      queryClient.invalidateQueries({ queryKey: ['crm', 'opportunites'] });
      setDialogOpen(false);
      setEditingOpportunity(null);
    } catch (error) {
      console.error('Erreur opportunite:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Opportunites</h1>
        <p className="text-muted-foreground">Gerez votre pipeline commercial</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur du pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.pipelineValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunites actives</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux conversion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des opportunites</CardTitle>
          <CardDescription>Rechercher, modifier et supprimer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Toutes etapes</option>
                {STAGE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle opportunite
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
                    <th className="text-left p-4 font-medium">Nom</th>
                    <th className="text-left p-4 font-medium">Client</th>
                    <th className="text-left p-4 font-medium">Montant</th>
                    <th className="text-left p-4 font-medium">Probabilite</th>
                    <th className="text-left p-4 font-medium">Etape</th>
                    <th className="text-left p-4 font-medium">Fermeture prevue</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOpportunities.map((opp) => (
                    <tr key={opp.id} className="border-t hover:bg-muted/50">
                      <td className="p-4 font-medium">{opp.nom}</td>
                      <td className="p-4">{clientMap.get(opp.clientId)?.nom || 'Inconnu'}</td>
                      <td className="p-4">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(opp.montantEstime)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${opp.probabilite}%` }}></div>
                          </div>
                          <span className="text-xs">{opp.probabilite}%</span>
                        </div>
                      </td>
                      <td className="p-4">{getEtapeBadge(opp.etape)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-xs">
                          <Calendar className="h-3 w-3" />
                          {opp.dateFermetureEstimee ? new Date(opp.dateFermetureEstimee).toLocaleDateString('fr-FR') : 'Non definie'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(opp)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleDelete(opp)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOpportunities.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucune opportunite trouvee
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
            <DialogTitle>
              {editingOpportunity ? 'Modifier opportunite' : 'Nouvelle opportunite'}
            </DialogTitle>
            <DialogDescription>
              {editingOpportunity ? 'Mettez a jour les details de l opportunite.' : 'Creez une nouvelle opportunite commerciale.'}
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
                <label className="block text-sm font-medium mb-1">Nom *</label>
                <Input {...form.register('nom', { required: true })} />
                {form.formState.errors.nom && (
                  <p className="text-xs text-red-600">Nom requis</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Montant estime *</label>
                <Input type="number" step="0.01" {...form.register('montantEstime', { required: true })} />
                {form.formState.errors.montantEstime && (
                  <p className="text-xs text-red-600">Montant requis</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Probabilite (%)</label>
                <Input type="number" min="0" max="100" {...form.register('probabilite')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Etape *</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('etape')}>
                  {STAGE_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Statut *</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('statut')}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date fermeture estimee</label>
                <Input type="date" {...form.register('dateFermetureEstimee')} />
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
                {editingOpportunity ? 'Mettre a jour' : 'Creer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
