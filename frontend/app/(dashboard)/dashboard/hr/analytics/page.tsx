'use client';

import React from 'react';
import { useContracts } from '@/hooks/useContracts';
import { usePayslips } from '@/hooks/usePayslips';
import { Card } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Users, FileText, TrendingUp, Calendar } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function HRAnalyticsPage() {
  const { data: contractsData } = useContracts({ pageSize: 1000 });
  const { data: payslipsData } = usePayslips({ pageSize: 1000 });

  const contracts = contractsData?.data || [];
  const payslips = payslipsData?.data || [];

  // Stats globales
  const stats = {
    totalContracts: contracts.length,
    activeContracts: contracts.filter((c: any) => c.status === 'ACTIVE').length,
    totalPayslips: payslips.length,
    paidPayslips: payslips.filter((p: any) => p.status === 'PAID').length,
  };

  // Répartition par type de contrat
  const contractsByType = contracts.reduce((acc: any, contract: any) => {
    const type = contract.contractType || contract.contract_type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const contractTypeData = Object.entries(contractsByType).map(([name, value]) => ({
    name,
    value,
  }));

  // Répartition par département
  const contractsByDept = contracts.reduce((acc: any, contract: any) => {
    const dept = contract.department || 'Non spécifié';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const deptData = Object.entries(contractsByDept).map(([name, value]) => ({
    name,
    value,
  }));

  // Évolution mensuelle des bulletins
  const payslipsByMonth = payslips.reduce((acc: any, payslip: any) => {
    const period = payslip.period?.slice(0, 7) || 'Inconnu';
    if (!acc[period]) {
      acc[period] = {
        count: 0,
        totalNet: 0,
      };
    }
    acc[period].count += 1;
    acc[period].totalNet += payslip.netSalary || payslip.net_salary || 0;
    return acc;
  }, {});

  const monthlyData = Object.entries(payslipsByMonth)
    .sort()
    .slice(-12)
    .map(([month, data]: [string, any]) => ({
      month,
      count: data.count,
      totalNet: Math.round(data.totalNet / 1000000), // En millions
    }));

  // Masse salariale moyenne
  const avgSalary =
    payslips.length > 0
      ? payslips.reduce((sum: number, p: any) => sum + (p.netSalary || p.net_salary || 0), 0) /
        payslips.length
      : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Tableau de Bord RH
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Contrats</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.totalContracts}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {stats.activeContracts} actifs
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bulletins Générés</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.totalPayslips}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {stats.paidPayslips} payés
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Salaire Moyen</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {formatCurrency(avgSalary)}
              </p>
              <p className="text-sm text-gray-500 mt-1">net mensuel</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
              <TrendingUp className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bulletins ce mois</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {monthlyData[monthlyData.length - 1]?.count || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {monthlyData[monthlyData.length - 1]?.month || '-'}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par type de contrat */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Répartition par Type de Contrat
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={contractTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {contractTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Répartition par département */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Contrats par Département
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deptData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Évolution mensuelle */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Évolution Mensuelle des Bulletins et Masse Salariale
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              name="Nombre de bulletins"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="totalNet"
              stroke="#10b981"
              name="Masse salariale (M XOF)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
