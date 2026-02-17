'use client';

import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Calendar,
  DollarSign,
  Edit,
  Eye,
  Search,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { opportunitesService } from '@/shared/api/crm/opportunites.service';
import { Opportunite } from '@/shared/api/crm/types';
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
import { useForm } from 'react-hook-form';

type PipelineStage = 'prospect' | 'qualification' | 'proposal' | 'negotiation' | 'won' | 'lost';

type Etape = 'PROSPECTION' | 'QUALIFICATION' | 'PROPOSITION' | 'NEGOCIATION' | 'FINALISATION';

type Statut = 'OUVERTE' | 'GAGNEE' | 'PERDUE' | 'MISE_EN_ATTENTE';

interface PipelineOpportunity {
  id: string;
  title: string;
  company: string;
  contact: string;
  value: number;
  probability: number;
  stage: PipelineStage;
  expectedCloseDate: string;
  lastActivity: string;
  etape?: Etape;
  statut?: Statut;
  description?: string;
}

interface OpportunityFormValues {
  nom: string;
  description?: string;
  montantEstime: number;
  probabilite: number;
  dateFermetureEstimee?: string;
  etape?: Etape;
  statut?: Statut;
}

const STAGES: { value: PipelineStage; label: string; className: string }[] = [
  { value: 'prospect', label: 'Prospect', className: 'bg-gray-500' },
  { value: 'qualification', label: 'Qualification', className: 'bg-blue-500' },
  { value: 'proposal', label: 'Proposition', className: 'bg-amber-500' },
  { value: 'negotiation', label: 'Negotiation', className: 'bg-orange-500' },
  { value: 'won', label: 'Gagne', className: 'bg-green-600' },
  { value: 'lost', label: 'Perdu', className: 'bg-red-500' },
];

const ETAPE_OPTIONS: { value: Etape; label: string }[] = [
  { value: 'PROSPECTION', label: 'Prospection' },
  { value: 'QUALIFICATION', label: 'Qualification' },
  { value: 'PROPOSITION', label: 'Proposition' },
  { value: 'NEGOCIATION', label: 'Negotiation' },
  { value: 'FINALISATION', label: 'Finalisation' },
];

const STATUT_OPTIONS: { value: Statut; label: string }[] = [
  { value: 'OUVERTE', label: 'Ouverte' },
  { value: 'GAGNEE', label: 'Gagnee' },
  { value: 'PERDUE', label: 'Perdue' },
  { value: 'MISE_EN_ATTENTE', label: 'Mise en attente' },
];

const toInputDate = (value?: string) => {
  if (!value) return '';
  return value.length >= 16 ? value.slice(0, 16) : value;
};

const normalizeDate = (value?: string) => {
  if (!value) return undefined;
  return value.length === 16 ? `${value}:00` : value;
};

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<PipelineStage | 'all'>('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<PipelineOpportunity | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: opportunitiesResponse, isLoading } = useQuery({
    queryKey: ['opportunites'],
    queryFn: () => opportunitesService.getOpportunites({ limit: 200 }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: OpportunityFormValues }) =>
      opportunitesService.updateOpportunite(id, {
        nom: data.nom,
        description: data.description || undefined,
        montantEstime: Number(data.montantEstime) || 0,
        probabilite: Number(data.probabilite) || 0,
        dateFermetureEstimee: normalizeDate(data.dateFermetureEstimee),
        etape: data.etape,
        statut: data.statut,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunites'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => opportunitesService.deleteOpportunite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunites'] });
    },
  });

  const opportunities: PipelineOpportunity[] = useMemo(() => {
    const list = opportunitiesResponse?.data || (opportunitiesResponse as any)?.data?.data || [];
    return list.map((opp: Opportunite) => {
      const stageMap: Record<string, PipelineStage> = {
        PROSPECTION: 'prospect',
        QUALIFICATION: 'qualification',
        PROPOSITION: 'proposal',
        NEGOCIATION: 'negotiation',
        FINALISATION: 'negotiation',
      };
      const statusStage: Record<string, PipelineStage> = {
        GAGNEE: 'won',
        PERDUE: 'lost',
      };
      const stage = statusStage[opp.statut] || stageMap[opp.etape] || 'prospect';
      const updatedAt = (opp as any).updatedAt;
      const createdAt = (opp as any).createdAt;
      return {
        id: opp.id,
        title: opp.nom,
        company: opp.client?.nom || 'Client',
        contact: (opp as any).contact || '-',
        value: opp.montantEstime,
        probability: opp.probabilite || 0,
        stage,
        expectedCloseDate: opp.dateFermetureEstimee || updatedAt || createdAt || new Date().toISOString(),
        lastActivity: updatedAt || createdAt || '',
        etape: opp.etape,
        statut: opp.statut,
        description: opp.description,
      };
    });
  }, [opportunitiesResponse]);

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.contact.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStage = stageFilter === 'all' || opp.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const totalValue = filteredOpportunities.reduce((sum, opp) => sum + opp.value, 0);
  const weightedValue = filteredOpportunities.reduce(
    (sum, opp) => sum + (opp.value * opp.probability) / 100,
    0
  );
  const averageProbability =
    filteredOpportunities.length > 0
      ? filteredOpportunities.reduce((sum, opp) => sum + opp.probability, 0) /
        filteredOpportunities.length
      : 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const form = useForm<OpportunityFormValues>({
    defaultValues: {
      nom: '',
      description: '',
      montantEstime: 0,
      probabilite: 0,
      dateFermetureEstimee: '',
      etape: 'PROSPECTION',
      statut: 'OUVERTE',
    },
  });

  useEffect(() => {
    if (!editOpen || !selectedOpportunity) return;
    form.reset({
      nom: selectedOpportunity.title,
      description: selectedOpportunity.description || '',
      montantEstime: selectedOpportunity.value,
      probabilite: selectedOpportunity.probability,
      dateFermetureEstimee: toInputDate(selectedOpportunity.expectedCloseDate),
      etape: selectedOpportunity.etape || 'PROSPECTION',
      statut: selectedOpportunity.statut || 'OUVERTE',
    });
  }, [editOpen, selectedOpportunity, form]);

  const openView = (opp: PipelineOpportunity) => {
    setSelectedOpportunity(opp);
    setViewOpen(true);
  };

  const openEdit = (opp: PipelineOpportunity) => {
    setSelectedOpportunity(opp);
    setEditOpen(true);
  };

  const handleDelete = (opp: PipelineOpportunity) => {
    if (confirm(`Supprimer l opportunite "${opp.title}" ?`)) {
      deleteMutation.mutate(opp.id);
    }
  };

  const onSubmit = async (values: OpportunityFormValues) => {
    if (!selectedOpportunity) return;
    await updateMutation.mutateAsync({ id: selectedOpportunity.id, data: values });
    setEditOpen(false);
    setSelectedOpportunity(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline Commercial</h1>
          <p className="text-muted-foreground">Suivi des opportunites et previsions de vente</p>
        </div>
        <Button>
          <Users className="mr-2 h-4 w-4" />
          Nouvelle opportunite
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          
            <CardTitle className="text-sm font-medium">Valeur totale</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Opportunites actives</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur ponderee</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(weightedValue)}</div>
            <p className="text-xs text-muted-foreground">Selon probabilites</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunites</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredOpportunities.length}</div>
            <p className="text-xs text-muted-foreground">Dans le pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Probabilite moyenne</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageProbability.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Sur opportunites filtrees</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Opportunites du pipeline</CardTitle>
          <CardDescription>Suivez l avancement commercial</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre, client ou contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as PipelineStage | 'all')}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Toutes les etapes</option>
                {STAGES.map((stage) => (
                  <option key={stage.value} value={stage.value}>{stage.label}</option>
                ))}
              </select>
            </div>
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
                    <th className="text-left p-4 font-medium">Opportunite</th>
                    <th className="text-left p-4 font-medium">Client</th>
                    <th className="text-left p-4 font-medium">Montant</th>
                    <th className="text-left p-4 font-medium">Etape</th>
                    <th className="text-left p-4 font-medium">Probabilite</th>
                    <th className="text-left p-4 font-medium">Fermeture estimee</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOpportunities.map((opp) => {
                    const stageBadge = STAGES.find((s) => s.value === opp.stage);
                    return (
                      <tr key={opp.id} className="border-t hover:bg-muted/50">
                        <td className="p-4 font-medium">{opp.title}</td>
                        <td className="p-4 text-sm text-muted-foreground">{opp.company}</td>
                        <td className="p-4 text-sm">{formatCurrency(opp.value)}</td>
                        <td className="p-4">
                          <Badge className={stageBadge?.className || 'bg-gray-500'}>
                            {stageBadge?.label || opp.stage}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm">{opp.probability}%</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          {formatDate(opp.expectedCloseDate)}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openView(opp)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Voir
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEdit(opp)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Modifier
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
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {!isLoading && filteredOpportunities.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucune opportunite trouvee
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detail opportunite</DialogTitle>
            <DialogDescription>Informations principales</DialogDescription>
          </DialogHeader>
          {selectedOpportunity && (
            <div className="space-y-2 text-sm">
              <div><strong>Nom:</strong> {selectedOpportunity.title}</div>
              <div><strong>Client:</strong> {selectedOpportunity.company}</div>
              <div><strong>Montant:</strong> {formatCurrency(selectedOpportunity.value)}</div>
              <div><strong>Probabilite:</strong> {selectedOpportunity.probability}%</div>
              <div><strong>Etape:</strong> {selectedOpportunity.etape || '-'}</div>
              <div><strong>Statut:</strong> {selectedOpportunity.statut || '-'}</div>
              <div><strong>Fermeture estimee:</strong> {formatDate(selectedOpportunity.expectedCloseDate)}</div>
              <div><strong>Description:</strong> {selectedOpportunity.description || '-'}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier opportunite</DialogTitle>
            <DialogDescription>Mettez a jour les informations commerciales.</DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Nom *</label>
                <Input {...form.register('nom', { required: true })} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Montant estime</label>
                <Input type="number" min={0} {...form.register('montantEstime', { valueAsNumber: true })} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Probabilite</label>
                <Input type="number" min={0} max={100} {...form.register('probabilite', { valueAsNumber: true })} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Etape</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('etape')}>
                  {ETAPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Statut</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('statut')}>
                  {STATUT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fermeture estimee</label>
                <Input type="datetime-local" {...form.register('dateFermetureEstimee')} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea className="w-full px-3 py-2 border rounded-md" {...form.register('description')} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                Mettre a jour
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
