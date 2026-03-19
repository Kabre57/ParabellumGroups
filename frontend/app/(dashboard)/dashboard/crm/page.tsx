'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Target, TrendingUp, Users } from 'lucide-react';
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

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['crm-dashboard-stats'],
    queryFn: () => commercialService.getStats(),
  });

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard CRM</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Vue synthese de la prospection et du pipeline commercial.
        </p>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Repartition par etape</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stageEntries.map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between gap-4">
                  <div className="text-sm font-medium">{stageLabels[stage] || stage}</div>
                  <div className="text-sm text-muted-foreground">{Number(count)}</div>
                </div>
              ))}
              {stageEntries.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">Aucune donnee disponible</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repartition par priorite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {priorityEntries.map(([priority, count]) => (
                <div key={priority} className="flex items-center justify-between gap-4">
                  <div className="text-sm font-medium">{priorityLabels[priority] || priority}</div>
                  <div className="text-sm text-muted-foreground">{Number(count)}</div>
                </div>
              ))}
              {priorityEntries.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">Aucune donnee disponible</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
