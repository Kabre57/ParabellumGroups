'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { technicalService } from '@/shared/api/technical';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { PieChart } from '@/components/charts/PieChart';
import { LineChart } from '@/components/charts/LineChart';
import { Briefcase, CheckCircle, Clock, AlertCircle, Wrench } from 'lucide-react';

export function TechnicalDashboard() {
  const { data: missionsStats, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ['technical', 'missions-stats'],
    queryFn: () => technicalService.getMissionsStats(),
  });

  const { data: interventionsResponse, isLoading: isLoadingInterventions } = useQuery({
    queryKey: ['technical', 'interventions-performance'],
    queryFn: async () => {
      const res = await technicalService.getInterventions({ pageSize: 500 });
      return res;
    },
  });

  const interventions = Array.isArray(interventionsResponse?.data)
    ? interventionsResponse.data
    : (interventionsResponse as any)?.data ?? [];

  const isLoading = isLoadingStats;
  const error = statsError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !missionsStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">
            Erreur lors du chargement des données techniques
          </p>
        </div>
      </div>
    );
  }

  const pieData = [
    missionsStats.planifiees ?? 0,
    missionsStats.enCours ?? 0,
    missionsStats.terminees ?? 0,
    missionsStats.annulees ?? 0,
  ].filter((n) => n > 0);
  const pieLabels = ['Planifiées', 'En cours', 'Terminées', 'Annulées'].slice(
    0,
    pieData.length
  );

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d;
  });
  const monthLabels = last6Months.map((d) =>
    d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
  );
  const interventionsByMonth = last6Months.map((monthStart) => {
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    return (interventions as any[]).filter((i) => {
      const date = i.dateDebut ? new Date(i.dateDebut) : null;
      return date && date >= monthStart && date < monthEnd;
    }).length;
  });

  const statsCards = [
    {
      title: 'Total missions',
      value: missionsStats.total ?? 0,
      icon: Briefcase,
      color: 'bg-blue-100 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Planifiées',
      value: missionsStats.planifiees ?? 0,
      icon: Clock,
      color: 'bg-cyan-100 dark:bg-cyan-900/20',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      title: 'En cours',
      value: missionsStats.enCours ?? 0,
      icon: Wrench,
      color: 'bg-orange-100 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      title: 'Terminées',
      value: missionsStats.terminees ?? 0,
      icon: CheckCircle,
      color: 'bg-green-100 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Annulées',
      value: missionsStats.annulees ?? 0,
      icon: AlertCircle,
      color: 'bg-red-100 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Répartition des missions</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <PieChart
                data={pieData}
                labels={pieLabels}
                height={280}
                colors={[
                  'rgb(6, 182, 212)',
                  'rgb(251, 146, 60)',
                  'rgb(34, 197, 94)',
                  'rgb(239, 68, 68)',
                ]}
              />
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-12">
                Aucune mission
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance interventions (6 derniers mois)</CardTitle>
          </CardHeader>
          <CardContent>
            {!isLoadingInterventions ? (
              <LineChart
                data={interventionsByMonth}
                labels={monthLabels}
                label="Interventions"
                height={280}
                color="rgb(59, 130, 246)"
                fill
              />
            ) : (
              <div className="flex items-center justify-center h-[280px]">
                <Spinner size="md" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
