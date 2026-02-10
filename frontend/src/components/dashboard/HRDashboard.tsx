'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/shared/api/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Users, TrendingUp, DollarSign, Calendar, Briefcase } from 'lucide-react';

export function HRDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'hr'],
    queryFn: () => analyticsService.getHRStats(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">
            Erreur lors du chargement des données
          </p>
        </div>
      </div>
    );
  }

  const headcount = data.effectifs;
  const turnover = data.turnover;
  const absences = data.absences;
  const recrutement = data.recrutement;
  const formations = data.formations;

  const statsCards = [
    {
      title: 'Effectif total',
      value: headcount?.total ?? 0,
      icon: Users,
      color: 'bg-blue-100 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Turnover',
      value: `${(turnover?.taux ?? 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-green-100 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Absenteisme',
      value: `${(absences?.tauxAbsenteisme ?? 0).toFixed(1)}%`,
      icon: Calendar,
      color: 'bg-orange-100 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      title: 'Postes ouverts',
      value: recrutement?.postesOuverts ?? 0,
      icon: Briefcase,
      color: 'bg-purple-100 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
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
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Formation & Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Nombre</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {formations?.nombre ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Heures</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {formations?.heures ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Budget</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {formations?.budget ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
