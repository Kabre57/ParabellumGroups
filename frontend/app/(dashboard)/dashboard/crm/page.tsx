'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Filter, Target, TrendingUp, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { commercialService } from '@/shared/api/commercial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

const stageLabels: Record<string, string> = {
  PREPARATION: 'Preparation',
  RECHERCHE: 'Recherche',
  CONTACT_INITIAL: 'Contact initial',
  DECOUVERTE: 'Decouverte',
  PROPOSITION: 'Proposition',
  NEGOCIATION: 'Negociation',
  GAGNE: 'Gagne',
  PERDU: 'Perdu',
  MISE_EN_ATTENTE: 'Mise en attente',
};

const priorityLabels: Record<string, string> = {
  A: 'Priorite A',
  B: 'Priorite B',
  C: 'Priorite C',
  D: 'Priorite D',
};

const stageColors: Record<string, string> = {
  PREPARATION: '#94a3b8',
  RECHERCHE: '#0ea5e9',
  CONTACT_INITIAL: '#2563eb',
  DECOUVERTE: '#6366f1',
  PROPOSITION: '#f59e0b',
  NEGOCIATION: '#f97316',
  GAGNE: '#16a34a',
  PERDU: '#dc2626',
  MISE_EN_ATTENTE: '#64748b',
};

export default function DashboardPage() {
  const [period, setPeriod] = useState<'7j' | '30j' | '90j' | '12m'>('30j');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['crm-dashboard-stats'],
    queryFn: () => commercialService.getStats(),
  });

  const { data: prospects = [] } = useQuery({
    queryKey: ['crm-dashboard-prospects', period],
    queryFn: () => commercialService.getProspects({ limit: 300 }),
  });

  const periodStart = useMemo(() => {
    const now = new Date();
    const days = period === '7j' ? 7 : period === '30j' ? 30 : period === '90j' ? 90 : 365;
    const copy = new Date(now);
    copy.setDate(copy.getDate() - (days - 1));
    return new Date(copy.getFullYear(), copy.getMonth(), copy.getDate());
  }, [period]);

  const filteredProspects = useMemo(
    () =>
      (Array.isArray(prospects) ? prospects : []).filter((item: any) => {
        const created = new Date(item?.createdAt || Date.now());
        if (Number.isNaN(created.getTime())) return false;
        return created >= periodStart;
      }),
    [prospects, periodStart]
  );

  const stageEntries = useMemo(
    () =>
      Object.entries(stats?.byStage || {})
        .filter(([, value]) => Number(value) > 0)
        .sort((left, right) => Number(right[1]) - Number(left[1])),
    [stats?.byStage]
  );

  const priorityEntries = useMemo(
    () =>
      Object.entries(stats?.byPriority || {})
        .filter(([, value]) => Number(value) > 0)
        .sort((left, right) => String(left[0]).localeCompare(String(right[0]), 'fr')),
    [stats?.byPriority]
  );

  const stageChartData = useMemo(
    () =>
      stageEntries.map(([stage, count]) => ({
        name: stageLabels[stage] || stage,
        value: Number(count),
        stage,
      })),
    [stageEntries]
  );

  const priorityChartData = useMemo(
    () =>
      priorityEntries.map(([priority, count]) => ({
        name: priorityLabels[priority] || priority,
        value: Number(count),
      })),
    [priorityEntries]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const cards = [
    {
      title: 'Total prospects',
      value: stats?.totalProspects || 0,
      subtitle: 'Dans le pipeline commercial',
      icon: Users,
    },
    {
      title: 'Prospects convertis',
      value: stats?.convertedProspects || 0,
      subtitle: 'Devenus clients',
      icon: Target,
    },
    {
      title: 'Taux de conversion',
      value: `${(stats?.conversionRate || 0).toFixed(1)}%`,
      subtitle: 'Performance globale',
      icon: TrendingUp,
    },
    {
      title: 'Activites recentes',
      value: stats?.recentActivities || 0,
      subtitle: 'Sur les prospects suivis',
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard CRM</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Vue synthese de la prospection et du pipeline commercial.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as typeof period)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="7j">7 jours</option>
            <option value="30j">30 jours</option>
            <option value="90j">90 jours</option>
            <option value="12m">12 mois</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Repartition par etape</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {stageChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Aucune donnee disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageChartData} margin={{ left: 4, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {stageChartData.map((entry) => (
                      <Cell key={entry.stage} fill={stageColors[entry.stage] || '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repartition par priorite</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {priorityChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Aucune donnee disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={priorityChartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                    {priorityChartData.map((entry) => (
                      <Cell key={entry.name} fill="#2563eb" />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prospects récents sur la période</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredProspects.slice(0, 5).map((prospect: any) => (
            <div key={prospect.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <div className="text-sm font-semibold">{prospect.companyName || prospect.contactName}</div>
                <div className="text-xs text-muted-foreground">{prospect.email || prospect.phone || '-'}</div>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(prospect.createdAt).toLocaleDateString('fr-FR')}</div>
            </div>
          ))}
          {filteredProspects.length === 0 && (
            <div className="text-sm text-muted-foreground">Aucun prospect recent.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
