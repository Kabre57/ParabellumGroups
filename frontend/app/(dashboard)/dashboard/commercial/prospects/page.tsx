'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity,
  Eye,
  Edit,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { useAuth } from '@/shared/hooks/useAuth';
import { commercialService } from '@/shared/api/commercial';
import { getCrudVisibility } from '@/shared/action-visibility';
import type { Prospect, ProspectPriority, ProspectStage, ProspectionStats } from '@/shared/api/commercial/types';
import CreateProspectModal from '@/components/commercial/CreateProspectModal';
import EditProspectModal from '@/components/commercial/EditProspectModal';
import ViewProspectModal from '@/components/commercial/ViewProspectModal';

const STAGE_OPTIONS: { value: ProspectStage; label: string }[] = [
  { value: 'preparation', label: 'Preparation' },
  { value: 'research', label: 'Recherche' },
  { value: 'contact', label: 'Contact' },
  { value: 'discovery', label: 'Decouverte' },
  { value: 'proposal', label: 'Proposition' },
  { value: 'negotiation', label: 'Negociation' },
  { value: 'on_hold', label: 'En attente' },
  { value: 'won', label: 'Converti' },
  { value: 'lost', label: 'Perdu' },
];

const PRIORITY_OPTIONS: { value: ProspectPriority; label: string }[] = [
  { value: 'A', label: 'Haute' },
  { value: 'B', label: 'Moyenne' },
  { value: 'C', label: 'Basse' },
  { value: 'D', label: 'Tres basse' },
];

const getStageBadge = (stage: ProspectStage) => {
  const label = STAGE_OPTIONS.find((s) => s.value === stage)?.label || stage;
  const classNameMap: Record<ProspectStage, string> = {
    preparation: 'bg-blue-500',
    research: 'bg-amber-500',
    contact: 'bg-purple-500',
    discovery: 'bg-indigo-500',
    proposal: 'bg-green-500',
    negotiation: 'bg-cyan-600',
    on_hold: 'bg-slate-500',
    won: 'bg-emerald-600',
    lost: 'bg-red-500',
  };
  return { label, className: classNameMap[stage] || 'bg-gray-500' };
};

const getPriorityBadge = (priority: ProspectPriority) => {
  const label = PRIORITY_OPTIONS.find((p) => p.value === priority)?.label || priority;
  const classNameMap: Record<ProspectPriority, string> = {
    A: 'bg-red-500',
    B: 'bg-amber-500',
    C: 'bg-green-500',
    D: 'bg-slate-500',
  };
  return { label, className: classNameMap[priority] || 'bg-gray-500' };
};

export default function ProspectionWorkflowPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<ProspectStage | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ProspectPriority | 'all'>('all');
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [prospectToDelete, setProspectToDelete] = useState<Prospect | null>(null);
  const { canCreate, canUpdate, canDelete } = getCrudVisibility(user, {
    read: ['prospects.read', 'prospects.read_all', 'prospects.read_own'],
    create: ['prospects.create'],
    update: ['prospects.update'],
    remove: ['prospects.delete'],
  });

  const { data: prospectsData, isLoading } = useQuery<Prospect[]>({
    queryKey: ['prospects', stageFilter, searchQuery],
    queryFn: () =>
      commercialService.getProspects({
        stage: stageFilter !== 'all' ? stageFilter : undefined,
        search: searchQuery || undefined,
        limit: 200,
      }),
  });

  const { data: statsData } = useQuery<ProspectionStats>({
    queryKey: ['prospection-stats'],
    queryFn: () => commercialService.getStats(),
  });

  const deleteProspectMutation = useMutation({
    mutationFn: (id: string) => commercialService.deleteProspect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['prospection-stats'] });
      toast.success('Prospect supprime avec succes');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression du prospect');
    },
  });

  const prospects: Prospect[] = Array.isArray(prospectsData)
    ? prospectsData
    : ((prospectsData as any)?.data || []);

  const filteredProspects = useMemo(() => {
    return prospects.filter((prospect) => {
      const matchesSearch =
        prospect.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.mobile?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.idu?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.ncc?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.rccm?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.codeActivite?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStage = stageFilter === 'all' || prospect.stage === stageFilter;
      const matchesPriority = priorityFilter === 'all' || prospect.priority === priorityFilter;

      return matchesSearch && matchesStage && matchesPriority;
    });
  }, [prospects, searchQuery, stageFilter, priorityFilter]);

  const stats = useMemo(() => {
    if (statsData) return statsData;
    const total = prospects.length;
    const converted = prospects.filter((p) => p.isConverted).length;
    const conversionRate = total > 0 ? (converted / total) * 100 : 0;
    return {
      totalProspects: total,
      convertedProspects: converted,
      conversionRate,
      recentActivities: prospects.reduce((sum, p) => sum + (p.activities?.length ? 1 : 0), 0),
      byStage: {} as ProspectionStats['byStage'],
      byPriority: {} as ProspectionStats['byPriority'],
    };
  }, [prospects, statsData]);

  const handleEdit = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setShowEditModal(true);
  };

  const handleView = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setShowViewModal(true);
  };

  const handleDelete = (prospect: Prospect) => {
    setProspectToDelete(prospect);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prospection commerciale</h1>
          <p className="text-muted-foreground">Suivez vos prospects.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau prospect
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total prospects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProspects || 0}</div>
            <p className="text-xs text-muted-foreground">Dans le pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convertis</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.convertedProspects || 0}</div>
            <p className="text-xs text-muted-foreground">Prospects devenus clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.conversionRate || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Performance globale</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activites recentes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivities || 0}</div>
            <p className="text-xs text-muted-foreground">Sur les 7 derniers jours</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des prospects</CardTitle>
          <CardDescription>Suivez vos prospects et leurs avances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par entreprise, contact, IDU, RCCM ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as ProspectStage | 'all')}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Toutes les etapes</option>
                {STAGE_OPTIONS.map((stage) => (
                  <option key={stage.value} value={stage.value}>{stage.label}</option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as ProspectPriority | 'all')}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Toutes priorites</option>
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
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
                    <th className="text-left p-4 font-medium">Entreprise</th>
                    <th className="text-left p-4 font-medium">Contact principal</th>
                    <th className="text-left p-4 font-medium">Etape</th>
                    <th className="text-left p-4 font-medium">Priorite</th>
                    {/* Colonne supprimée: Valeur potentielle */}
                    <th className="text-left p-4 font-medium">Commune</th>
                    <th className="text-left p-4 font-medium">Mise a jour</th>
                    {(canUpdate || canDelete) && <th className="text-left p-4 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredProspects.map((prospect) => {
                    const stageBadge = getStageBadge(prospect.stage);
                    const priorityBadge = getPriorityBadge(prospect.priority);
                    return (
                      <tr key={prospect.id} className="border-t hover:bg-muted/50">
                        <td className="p-4">
                          <div className="text-sm">
                            <div className="font-medium">{prospect.companyName}</div>
                            <div className="text-muted-foreground">
                              {prospect.idu || prospect.rccm || prospect.ncc || 'Identifiant non renseigne'}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div className="font-medium">{prospect.contactName}</div>
                              <div className="text-muted-foreground">
                                {prospect.email || prospect.mobile || prospect.phone || '-'}
                              </div>
                            </div>
                          </td>
                        <td className="p-4">
                          <Badge className={stageBadge.className}>{stageBadge.label}</Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={priorityBadge.className}>{priorityBadge.label}</Badge>
                        </td>
                        {/* Valeur potentielle supprimée */}
                          <td className="p-4 text-sm text-muted-foreground">
                            {prospect.city || prospect.region || 'A definir'}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(prospect.updatedAt).toLocaleDateString('fr-FR')}
                          </td>
                        {(canUpdate || canDelete) && (
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleView(prospect)}>
                                <Eye className="h-4 w-4 mr-1" />
                                Voir
                              </Button>
                              {canUpdate && (
                                <Button variant="outline" size="sm" onClick={() => handleEdit(prospect)}>
                                  <Edit className="h-4 w-4 mr-1" />
                                  Modifier
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => handleDelete(prospect)}
                                >
                                  <Trash2 className="h-4 w-4" />
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

2
          {!isLoading && filteredProspects.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucun prospect trouve pour ces criteres
            </div>
          )}
        </CardContent>
      </Card>

      {canCreate && (
        <CreateProspectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {canUpdate && (
        <EditProspectModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProspect(null);
          }}
          prospect={selectedProspect}
        />
      )}

      <ViewProspectModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedProspect(null);
        }}
        prospect={selectedProspect}
      />

      <ConfirmDialog
        open={Boolean(prospectToDelete)}
        title="Supprimer le prospect"
        description={
          prospectToDelete
            ? `Le prospect "${prospectToDelete.companyName}" sera supprimé définitivement.`
            : 'Confirmez la suppression du prospect.'
        }
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        isPending={deleteProspectMutation.isPending}
        onConfirm={() => {
          if (!prospectToDelete) return;
          deleteProspectMutation.mutate(prospectToDelete.id);
          setProspectToDelete(null);
        }}
        onOpenChange={(open) => !open && setProspectToDelete(null)}
      />
    </div>
  );
}
