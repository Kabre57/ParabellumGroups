'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { hrService } from '@/shared/api/hr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export default function RHDashboardPage() {
  const router = useRouter();

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-stats'],
    queryFn: async () => {
      const response = await hrService.getEmployees({ pageSize: 1000 });
      return response.data || [];
    },
  });

  const { data: leaveRequests, isLoading: leavesLoading } = useQuery({
    queryKey: ['leave-requests-stats'],
    queryFn: async () => {
      const response = await hrService.getLeaveRequests({ pageSize: 1000 });
      return response.data || [];
    },
  });

  const { data: loans, isLoading: loansLoading } = useQuery({
    queryKey: ['loans-stats'],
    queryFn: async () => {
      const response = await hrService.getLoans({ pageSize: 1000 });
      return response.data || [];
    },
  });

  const { data: payroll, isLoading: payrollLoading } = useQuery({
    queryKey: ['payroll-stats'],
    queryFn: async () => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const response = await hrService.getPayroll({ 
        pageSize: 1000,
        filters: { month: currentMonth, year: currentYear }
      });
      return response.data || [];
    },
  });

  const isLoading = employeesLoading || leavesLoading || loansLoading || payrollLoading;

  const totalEmployees = employees?.length || 0;
  const activeEmployees = employees?.filter(e => e.isActive).length || 0;
  const onLeave = leaveRequests?.filter(lr => lr.status === 'APPROVED' && 
    new Date(lr.startDate) <= new Date() && 
    new Date(lr.endDate) >= new Date()).length || 0;
  const activeLoans = loans?.filter(l => l.status === 'ACTIVE').length || 0;
  const monthlyPayroll = payroll?.reduce((sum, p) => sum + p.totalPaid, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Ressources Humaines
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Vue d'ensemble de la gestion RH
        </p>
      </div>

      {/* Stats cards */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Effectif total
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {activeEmployees}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  sur {totalEmployees} employés
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  En congé
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {onLeave}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  aujourd'hui
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🏖️</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Prêts actifs
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {activeLoans}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  en cours
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Masse salariale
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF',
                    maximumFractionDigits: 0,
                  }).format(monthlyPayroll)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  ce mois
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💵</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Quick links */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Liens rapides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/dashboard/rh/employes')}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">👤</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Employés
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Gérer les employés
              </p>
            </div>
          </Card>

          <Card 
            className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/dashboard/rh/conges')}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">📅</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Congés
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Demandes de congés
              </p>
            </div>
          </Card>

          <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow opacity-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">💳</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Paie
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Bulletins de paie
              </p>
            </div>
          </Card>

          <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow opacity-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">🏦</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Prêts
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Gestion des prêts
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent activity */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Activité récente
        </h2>
        <div className="space-y-4">
          {leaveRequests?.slice(0, 5).map((lr) => (
            <div key={lr.id} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Demande de congé - {lr.leaveType}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Du {new Date(lr.startDate).toLocaleDateString('fr-FR')} au {new Date(lr.endDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                lr.status === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' :
                lr.status === 'APPROVED' ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              }`}>
                {lr.status}
              </span>
            </div>
          ))}
          {(!leaveRequests || leaveRequests.length === 0) && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              Aucune activité récente
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
