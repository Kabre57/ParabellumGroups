'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  History, 
  Search,
  Building2,
  MoreVertical,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuth } from '@/shared/hooks/useAuth';
import billingService, { type Placement } from '@/shared/api/billing';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  })
    .format(value || 0)
    .replace('XOF', 'F CFA');

const formatPercent = (value: number) => {
  const formatted = value.toFixed(2) + '%';
  return value > 0 ? '+' + formatted : formatted;
};

const typeLabels: Record<string, string> = {
  ACTION: 'Action',
  OBLIGATION: 'Obligation',
  TCN: 'TCN',
  IMMOBILIER: 'Immobilier',
};

export default function PlacementsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCourseOpen, setIsCourseOpen] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | null>(null);
  
  // Form states
  const [newCourseValue, setNewCourseValue] = useState('');
  const [newCourseDate, setNewCourseDate] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useQuery({
    queryKey: ['billing-placements'],
    queryFn: () => billingService.getPlacements(),
  });

  const { data: performanceData, isLoading: isPerfLoading } = useQuery({
    queryKey: ['billing-placements-performance'],
    queryFn: () => billingService.getPlacementsPerformance(),
  });

  const placements = data?.data || [];
  const summary = data?.summary || { totalInvested: 0, currentValuation: 0, totalGainLoss: 0, totalGainLossPercent: 0 };
  const history = performanceData?.data || [];

  const addCourseMutation = useMutation({
    mutationFn: ({ id, value, atDate }: { id: string; value: number; atDate: string }) => 
      billingService.addAssetCourse(id, { value, atDate }),
    onSuccess: () => {
      toast.success('Cours mis à jour avec succès.');
      setIsCourseOpen(false);
      setNewCourseValue('');
      queryClient.invalidateQueries({ queryKey: ['billing-placements'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la mise à jour du cours.');
    }
  });

  const filteredPlacements = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return placements;
    return placements.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.issuer?.toLowerCase().includes(query) ||
      typeLabels[p.type].toLowerCase().includes(query)
    );
  }, [placements, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Placements</h1>
          <p className="mt-2 text-muted-foreground">
            Suivi des actifs financiers, actions, obligations et placements immobiliers du groupe.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Placement
          </Button>
        </div>
      </div>

      {/* Cartes de synthèse */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-50 p-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Investi</p>
              <p className="text-xl font-bold">{formatCurrency(summary.totalInvested)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-indigo-50 p-2">
              <PieChart className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Valorisation Actuelle</p>
              <p className="text-xl font-bold text-indigo-700">{formatCurrency(summary.currentValuation)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-50 p-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Plus/Moins Value</p>
              <div className="flex items-center gap-2">
                <p className={`text-xl font-bold ${summary.totalGainLoss >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatCurrency(summary.totalGainLoss)}
                </p>
                <Badge variant={summary.totalGainLoss >= 0 ? 'success' as any : 'destructive'}>
                  {formatPercent(summary.totalGainLossPercent)}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-50 p-2">
              <History className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Actifs Engagés</p>
              <p className="text-xl font-bold">{placements.length} placements</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Graphique de performance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-1">
        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Évolution de la Valeur & ROI</h3>
              <p className="text-sm text-muted-foreground">Tendance historique basée sur les cours saisis.</p>
            </div>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              Reporting Mensuel
            </Badge>
          </div>
          <div className="h-[300px] w-full">
            {isPerfLoading ? (
              <div className="flex h-full items-center justify-center italic text-muted-foreground tabular-nums">
                Chargement du graphique...
              </div>
            ) : history.length < 2 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                Pas assez de données historiques pour afficher le graphique.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={12} 
                    tickFormatter={(val) => new Date(val).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
                  />
                  <YAxis fontSize={12} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
                  <Tooltip 
                    formatter={(val: number) => [formatCurrency(val), "Valorisation"]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalValuation" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorVal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Barre de recherche et filtres */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un placement, un émetteur ou un type..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {/* Table des placements */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                <th className="px-6 py-4">Placement / Émetteur</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Quantité</th>
                <th className="px-6 py-4 text-right">Prix Moyen</th>
                <th className="px-6 py-4 text-right">Dernier Cours</th>
                <th className="px-6 py-4 text-right">Valorisation</th>
                <th className="px-6 py-4 text-right">Gain / Perte</th>
                <th className="px-6 py-4 text-center">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground italic">
                    Chargement des placements...
                  </td>
                </tr>
              ) : filteredPlacements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                    Aucun placement trouvé.
                  </td>
                </tr>
              ) : (
                filteredPlacements.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold">{p.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {p.issuer || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">{typeLabels[p.type]}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums">{p.quantity}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{formatCurrency(p.purchasePrice)}</td>
                    <td className="px-6 py-4 text-right tabular-nums font-semibold text-indigo-600">
                      {formatCurrency(p.lastCourse)}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums font-bold">
                      {formatCurrency(p.currentValuation)}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums">
                      <div className={p.gainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        <div className="font-bold">{formatCurrency(p.gainLoss)}</div>
                        <div className="text-[10px] flex items-center justify-end">
                          {p.gainLoss >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {formatPercent(p.gainLossPercent)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={p.status === 'ACTIF' ? 'success' as any : 'secondary'}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedPlacement(p);
                            setIsCourseOpen(true);
                          }}>
                            <History className="mr-2 h-4 w-4" />
                            Saisie du cours
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <PieChart className="mr-2 h-4 w-4" />
                            Détails & Graphique
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialog: Saisie manuelle du cours */}
      <Dialog open={isCourseOpen} onOpenChange={setIsCourseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Saisie manuelle du cours - {selectedPlacement?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="courseValue">Valeur du cours ({selectedPlacement?.currency || 'XOF'})</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="courseValue"
                  type="number"
                  placeholder="0.00"
                  className="pl-9"
                  value={newCourseValue}
                  onChange={(e) => setNewCourseValue(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="courseDate">Date du cours</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="courseDate"
                  type="date"
                  className="pl-9"
                  value={newCourseDate}
                  onChange={(e) => setNewCourseDate(e.target.value)}
                />
              </div>
            </div>
            {selectedPlacement && (
              <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground flex gap-2 items-start">
                <AlertCircle className="h-4 w-4 text-blue-500 shrink-0" />
                <p>
                  Le prix d&apos;acquisition était de <strong>{formatCurrency(selectedPlacement.purchasePrice)}</strong>.
                  La valorisation actuelle sera mise à jour dès la validation.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCourseOpen(false)}>Annuler</Button>
            <Button 
              onClick={() => {
                if (!selectedPlacement || !newCourseValue) return;
                addCourseMutation.mutate({
                  id: selectedPlacement.id,
                  value: parseFloat(newCourseValue),
                  atDate: newCourseDate
                });
              }}
              disabled={addCourseMutation.isPending || !newCourseValue}
            >
              {addCourseMutation.isPending ? 'Enregistrement...' : 'Mettre à jour'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
