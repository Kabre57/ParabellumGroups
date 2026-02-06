'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/shared/api/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart } from '@/components/charts/LineChart';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

export function FinancialDashboard() {
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'financial', 'real'],
    queryFn: () => analyticsService.getFinancialDashboard(),
    refetchInterval: 300000, // Rafraîchir toutes les 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            Chargement des données financières RÉELLES...
          </p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData?.data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-10 w-10 text-red-600" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">
              Données financières indisponibles
            </h3>
            <p className="text-sm text-red-600 mt-1">
              Le service billing n'est pas accessible. Vérifiez la connexion.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Données RÉELLES
  const realData = dashboardData.data;
  const revenueVariation = realData.revenus?.variation ?? 0;
  const trendData = (() => {
    if (Array.isArray(realData.revenue_trend) && realData.revenue_trend.length > 0) {
      return {
        labels: realData.revenue_trend.map((_, index) => `M${index + 1}`),
        data: realData.revenue_trend,
      };
    }
    if (Array.isArray(realData.evolutionTemporelle) && realData.evolutionTemporelle.length > 0) {
      return {
        labels: realData.evolutionTemporelle.map((item) => item.date || ''),
        data: realData.evolutionTemporelle.map((item) => item.valeur ?? item.value ?? 0),
      };
    }
    return null;
  })();
  
  return (
    <div className="space-y-6">
      {/* Source des données */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-blue-800">
              Données en temps réel
            </span>
          </div>
          <span className="text-xs text-blue-600">
            Source: {dashboardData.source} • Mise à jour: {new Date(dashboardData.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* KPI Cards avec données RÉELLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF'
                  }).format(realData.revenus?.total || 0)}
                </p>
                <div className={`flex items-center gap-1 mt-1 text-sm ${
                  revenueVariation > 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  <TrendingUp className={`h-4 w-4 ${
                    revenueVariation < 0 ? 'transform rotate-180' : ''
                  }`} />
                  <span>{revenueVariation.toFixed(1)}%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plus de cartes KPI avec données réelles... */}
      </div>

      {/* Graphique avec données RÉELLES */}
      {trendData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Évolution du chiffre d'affaires (Données réelles)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={trendData.data}
              labels={trendData.labels}
              label="CA (FCFA)"
              color="rgb(34, 197, 94)"
              backgroundColor="rgba(34, 197, 94, 0.1)"
              fill={true}
              height={300}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
