'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  DollarSign,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { CreateOpportunityDialog } from '@/components/commercial/CreateOpportunityDialog';
import { PipelineKanban } from '@/components/Pipeline/PipelineKanban';
import { OpportunityModal } from '@/components/Pipeline/OpportunityModal';
import { useOpportunities } from '@/hooks/Pipeline/useOpportunities';
import type { PipelineOpportunity } from '@/components/Pipeline/types';
import { PIPELINE_COLUMNS } from '@/components/Pipeline/types';

export default function PipelinePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<PipelineOpportunity | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [viewOpen, setViewOpen] = useState<'view' | 'edit' | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { canCreate, canUpdate, canDelete } = getCrudVisibility(user, {
    read: ['opportunities.read', 'opportunities.read_all', 'opportunities.read_own'],
    create: ['opportunities.create'],
    update: ['opportunities.update', 'opportunities.change_stage'],
    remove: ['opportunities.delete'],
  });

  const {
    opportunities: rawOpportunities,
    isLoading,
    updateMutation,
    deleteMutation,
    updateStageMutation,
    closeMutation,
  } = useOpportunities({ clientStatus: 'PROSPECT' });

  const opportunities: PipelineOpportunity[] = useMemo(() => {
    return rawOpportunities.map((opp) => {
      const updatedAt = (opp as any).updatedAt;
      const createdAt = (opp as any).createdAt;
      return {
        id: opp.id,
        title: opp.nom,
        company: opp.client?.nom || opp.client?.raisonSociale || 'Prospect',
        contact: (opp as any).contact || '-',
        value: opp.montantEstime,
        probability: opp.probabilite || 0,
        expectedCloseDate: opp.dateFermetureEstimee || updatedAt || createdAt || new Date().toISOString(),
        lastActivity: updatedAt || createdAt || '',
        etape: opp.etape as any,
        statut: opp.statut as any,
        description: opp.description,
      };
    });
  }, [rawOpportunities]);

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.contact.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStage =
      stageFilter === 'all' ||
      opp.etape === stageFilter ||
      opp.statut === stageFilter;
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
      currency: 'XOF',
      minimumFractionDigits: 0,
    })
      .format(value)
      .replace('XOF', 'F CFA');

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const openView = (opp: PipelineOpportunity) => {
    setSelectedOpportunity(opp);
    setViewOpen('view');
  };

  const openEdit = (opp: PipelineOpportunity) => {
    setSelectedOpportunity(opp);
    setViewOpen('edit');
  };

  const handleDelete = (opp: PipelineOpportunity) => {
    if (confirm(`Supprimer l opportunite "${opp.title}" ?`)) {
      deleteMutation.mutate(opp.id);
    }
  };

  const handleStageChange = async (opportunityId: string, target: string) => {
    if (target === 'GAGNEE' || target === 'PERDUE') {
      closeMutation.mutate({ id: opportunityId, statut: target });
      return;
    }
    updateStageMutation.mutate({ id: opportunityId, etape: target as any });
  };

  const onSubmit = async (values: any) => {
    if (!selectedOpportunity) return;
    await updateMutation.mutateAsync({ id: selectedOpportunity.id, data: values });
    setViewOpen(null);
    setSelectedOpportunity(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline Commercial</h1>
          <p className="text-muted-foreground">Suivi des opportunites et previsions de vente</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border bg-white">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              className="rounded-none"
              onClick={() => setViewMode('table')}
            >
              Tableau
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              className="rounded-none"
              onClick={() => setViewMode('kanban')}
            >
              Kanban
            </Button>
          </div>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <Users className="mr-2 h-4 w-4" />
              Nouvelle opportunite
            </Button>
          )}
        </div>
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
                onChange={(e) => setStageFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Toutes les etapes</option>
                {PIPELINE_COLUMNS.map((stage) => (
                  <option key={stage.id} value={stage.id}>{stage.label}</option>
                ))}
              </select>
            </div>
          </div>

          {viewMode === 'table' ? (
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
                      {(canUpdate || canDelete) && <th className="text-left p-4 font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpportunities.map((opp) => {
                      const stageBadge = PIPELINE_COLUMNS.find((s) => s.id === (opp.statut || opp.etape));
                      return (
                        <tr key={opp.id} className="border-t hover:bg-muted/50">
                          <td className="p-4 font-medium">{opp.title}</td>
                          <td className="p-4 text-sm text-muted-foreground">{opp.company}</td>
                          <td className="p-4 text-sm">{formatCurrency(opp.value)}</td>
                          <td className="p-4">
                            <Badge className="bg-gray-500">
                              {stageBadge?.label || opp.etape || opp.statut}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm">{opp.probability}%</td>
                          <td className="p-4 text-sm text-muted-foreground">
                            <Calendar className="inline h-4 w-4 mr-1" />
                            {formatDate(opp.expectedCloseDate)}
                          </td>
                          {(canUpdate || canDelete) && (
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => openView(opp)}>
                                  Voir
                                </Button>
                                {canUpdate && (
                                  <Button variant="outline" size="sm" onClick={() => openEdit(opp)}>
                                    Modifier
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600"
                                    onClick={() => handleDelete(opp)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    Supprimer
                                  </Button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="rounded-lg border bg-white p-4">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Spinner />
                </div>
              ) : (
                <PipelineKanban
                  opportunities={filteredOpportunities}
                  onStageChange={handleStageChange}
                  onView={openView}
                  onEdit={canUpdate ? openEdit : undefined}
                />
              )}
            </div>
          )}

          {!isLoading && filteredOpportunities.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucune opportunite trouvee
            </div>
          )}
        </CardContent>
      </Card>

      {viewOpen && (
        <OpportunityModal
          open={!!viewOpen}
          mode={viewOpen === 'edit' ? 'edit' : 'view'}
          opportunity={selectedOpportunity}
          onClose={() => setViewOpen(null)}
          onSubmit={onSubmit}
        />
      )}

      <CreateOpportunityDialog isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
