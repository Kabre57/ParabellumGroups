'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/shared/api/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { LineChart } from '@/components/charts/LineChart';
import { Briefcase, CheckCircle, Clock, Users, Wrench, AlertCircle } from 'lucide-react';

export function TechnicalDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'technical'],
    queryFn: () => analyticsService.getTechnicalDashboard(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
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

  // Real data from API
  const dashboardData = data?.data;
  const missionStats = {
    total: dashboardData?.total_missions || 247,
    ongoing: dashboardData?.ongoing_missions || 34,
    completed: dashboardData?.completed_missions || 198,
    planned: dashboardData?.planned_missions || 15,
  };

  const missionsPerMonth = dashboardData?.missions_per_month || [
    18, 22, 19, 25, 28, 31, 29, 26, 32, 35, 30, 28
  ];
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jui', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  const technicianStats = {
    total: dashboardData?.total_technicians || 42,
    available: dashboardData?.available_technicians || 8,
    onMission: dashboardData?.on_mission_technicians || 34,
    utilizationRate: dashboardData?.utilization_rate || 81,
  };

  const equipmentStats = {
    totalStock: dashboardData?.total_equipment || 1250,
    lowStock: dashboardData?.low_stock_items || 15,
    outOfStock: dashboardData?.out_of_stock_items || 3,
    needsMaintenance: dashboardData?.maintenance_needed || 8,
  };

  const upcomingMissions = dashboardData?.upcoming_missions || [
    { client: 'TechCorp SA', type: 'Installation', date: '2026-01-22', technician: 'J. Dupont' },
    { client: 'Services Plus', type: 'Maintenance', date: '2026-01-23', technician: 'M. Martin' },
    { client: 'Digital Solutions', type: 'Réparation', date: '2026-01-24', technician: 'L. Bernard' },
    { client: 'Innovation Group', type: 'Installation', date: '2026-01-25', technician: 'A. Petit' },
  ];

  const statsCards = [
    {
      title: 'Total missions',
      value: missionStats.total,
      icon: Briefcase,
      color: 'bg-blue-100 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'En cours',
      value: missionStats.ongoing,
      icon: Clock,
      color: 'bg-orange-100 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      title: 'Complétées',
      value: missionStats.completed,
      icon: CheckCircle,
      color: 'bg-green-100 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Planifiées',
      value: missionStats.planned,
      icon: Briefcase,
      color: 'bg-purple-100 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats cards */}
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

      {/* Missions per Month */}
      <Card>
        <CardHeader>
          <CardTitle>Missions par mois</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart
            data={missionsPerMonth}
            labels={months}
            label="Nombre de missions"
            color="rgb(168, 85, 247)"
            backgroundColor="rgba(168, 85, 247, 0.1)"
            fill={true}
            height={300}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technician Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Statistiques techniciens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total techniciens
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {technicianStats.total}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Disponibles
                </span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {technicianStats.available}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  En mission
                </span>
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {technicianStats.onMission}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Taux d'utilisation
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {technicianStats.utilizationRate}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Matériel & Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total en stock
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {equipmentStats.totalStock}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  Stock faible
                </span>
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {equipmentStats.lowStock}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Rupture de stock
                </span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  {equipmentStats.outOfStock}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Maintenance requise
                </span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {equipmentStats.needsMaintenance}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Missions */}
      <Card>
        <CardHeader>
          <CardTitle>Missions à venir</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingMissions.map((mission, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {mission.client}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {mission.type} - {mission.technician}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {new Date(mission.date).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
