'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/shared/api/services/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { LineChart } from '@/components/charts/LineChart';
import { PieChart } from '@/components/charts/PieChart';
import { Users, Building2, DollarSign, Calendar, Briefcase, TrendingUp } from 'lucide-react';

export function HRDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'hr'],
    queryFn: () => analyticsService.getHRDashboard(),
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

  // Mock data for demonstration
  const headcountStats = {
    total: data?.headcount || 47,
    newHires: data?.new_hires || 5,
    departures: data?.departures || 2,
    turnoverRate: data?.turnover_rate || 4.2,
  };

  const departmentBreakdown = data?.department_breakdown || {
    labels: ['Technique', 'Commercial', 'Administration', 'Support', 'Direction'],
    data: [24, 8, 7, 5, 3],
  };

  const payrollStats = {
    totalPayroll: data?.total_payroll || 285000,
    averageSalary: data?.average_salary || 6064,
    benefits: data?.benefits || 42000,
    taxes: data?.taxes || 95000,
  };

  const leaveStats = data?.leave_stats || {
    taken: [18, 22, 25, 28, 32, 35, 30, 28, 24, 20, 15, 12],
    remaining: [12, 15, 18, 22, 25, 28, 26, 24, 22, 18, 15, 10],
  };
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jui', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  const loanStats = {
    totalLoans: data?.total_loans || 8,
    activeLoans: data?.active_loans || 5,
    totalAmount: data?.total_loan_amount || 45000,
    remainingAmount: data?.remaining_loan_amount || 28000,
  };

  const statsCards = [
    {
      title: 'Effectif total',
      value: headcountStats.total,
      icon: Users,
      color: 'bg-blue-100 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Nouvelles embauches',
      value: headcountStats.newHires,
      icon: TrendingUp,
      color: 'bg-green-100 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Masse salariale',
      value: `${(payrollStats.totalPayroll / 1000).toFixed(0)}KF`,
      icon: DollarSign,
      color: 'bg-orange-100 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      title: 'Prêts en cours',
      value: loanStats.activeLoans,
      subValue: `${(loanStats.remainingAmount / 1000).toFixed(0)}KF`,
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
                    {stat.subValue && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {stat.subValue}
                      </p>
                    )}
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
        {/* Department Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Répartition par département
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart
              data={departmentBreakdown.data}
              labels={departmentBreakdown.labels}
              height={280}
            />
          </CardContent>
        </Card>

        {/* Payroll Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Détail masse salariale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Salaires bruts
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {payrollStats.totalPayroll.toLocaleString()} F
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Salaire moyen
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {payrollStats.averageSalary.toLocaleString()} F
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Avantages sociaux
                </span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {payrollStats.benefits.toLocaleString()} F
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Charges patronales
                </span>
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {payrollStats.taxes.toLocaleString()} F
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Congés sur l'année
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: 300 }}>
            <LineChart
              data={leaveStats.taken}
              labels={months}
              label="Jours pris"
              color="rgb(251, 146, 60)"
              backgroundColor="rgba(251, 146, 60, 0.1)"
              fill={true}
              height={300}
            />
          </div>
        </CardContent>
      </Card>

      {/* Loan Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Prêts employés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Total des prêts
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {loanStats.totalLoans}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Actifs
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {loanStats.activeLoans}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Montant total
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loanStats.totalAmount.toLocaleString()} F
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Restant dû
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {loanStats.remainingAmount.toLocaleString()} F
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
