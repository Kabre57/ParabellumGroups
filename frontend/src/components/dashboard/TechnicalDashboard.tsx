'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/shared/api/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Briefcase, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export function TechnicalDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'technical'],
    queryFn: () => analyticsService.getProjectsStats(),
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

  const stats = data.nombreProjets;
  const budget = data.budgetTotal;
  const projectsCritiques = data.projetsCritiques ?? [];

  const statsCards = [
    {
      title: 'Total projets',
      value: stats?.total ?? 0,
      icon: Briefcase,
      color: 'bg-blue-100 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'En cours',
      value: stats?.enCours ?? 0,
      icon: Clock,
      color: 'bg-orange-100 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      title: 'Terminés',
      value: stats?.termines ?? 0,
      icon: CheckCircle,
      color: 'bg-green-100 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'En retard',
      value: stats?.enRetard ?? 0,
      icon: AlertCircle,
      color: 'bg-red-100 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
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
            <CardTitle>Budget projets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Alloué</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {budget?.alloue ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Consommé</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {budget?.consomme ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projets critiques</CardTitle>
          </CardHeader>
          <CardContent>
            {projectsCritiques.length > 0 ? (
              <div className="space-y-3">
                {projectsCritiques.map((project: any) => (
                  <div key={project.id} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{project.nom}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Retard: {project.retard} j</p>
                    </div>
                    <span className="text-xs text-red-600">{project.risque}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Aucun projet critique
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
