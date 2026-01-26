'use client';

import React from 'react';
import { useInvoices, useInvoiceStats } from '@/hooks/useInvoices';
import { useQuotes } from '@/hooks/useQuotes';
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
import { DollarSign, FileText, TrendingUp, AlertCircle } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function BillingAnalyticsPage() {
  const { data: invoicesData } = useInvoices();
  const { data: quotesData } = useQuotes();

  const invoices = invoicesData || [];
  const quotes = quotesData || [];

  const calculateTotal = (items: any[]) => {
    return items?.reduce((sum, item) => {
      const subtotal = item.quantity * item.unitPrice;
      const vat = subtotal * (item.vatRate / 100);
      return sum + subtotal + vat;
    }, 0) || 0;
  };

  // Stats globales
  const totalRevenue = invoices
    .filter((inv: any) => inv.status === 'PAID')
    .reduce((sum: number, inv: any) => sum + (inv.totalTTC || inv.total_ttc || calculateTotal(inv.items)), 0);

  const pendingAmount = invoices
    .filter((inv: any) => ['PENDING', 'SENT'].includes(inv.status))
    .reduce((sum: number, inv: any) => sum + (inv.totalTTC || inv.total_ttc || calculateTotal(inv.items)), 0);

  const overdueAmount = invoices
    .filter((inv: any) => {
      const dueDate = new Date(inv.dueDate || inv.due_date);
      return dueDate < new Date() && !['PAID', 'CANCELLED'].includes(inv.status);
    })
    .reduce((sum: number, inv: any) => sum + (inv.totalTTC || inv.total_ttc || calculateTotal(inv.items)), 0);

  const stats = {
    totalInvoices: invoices.length,
    totalQuotes: quotes.length,
    paidInvoices: invoices.filter((i: any) => i.status === 'PAID').length,
    acceptedQuotes: quotes.filter((q: any) => q.status === 'ACCEPTED').length,
    totalRevenue,
    pendingAmount,
    overdueAmount,
  };

  // Répartition factures par statut
  const invoicesByStatus = invoices.reduce((acc: any, invoice: any) => {
    const status = invoice.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(invoicesByStatus).map(([name, value]) => ({
    name,
    value,
  }));

  // Répartition devis par statut
  const quotesByStatus = quotes.reduce((acc: any, quote: any) => {
    const status = quote.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const quoteStatusData = Object.entries(quotesByStatus).map(([name, value]) => ({
    name,
    value,
  }));

  // Évolution mensuelle du CA
  const revenueByMonth = invoices
    .filter((inv: any) => inv.status === 'PAID')
    .reduce((acc: any, invoice: any) => {
      const month = invoice.date?.slice(0, 7) || 'Inconnu';
      const amount = invoice.totalTTC || invoice.total_ttc || calculateTotal(invoice.items);
      acc[month] = (acc[month] || 0) + amount;
      return acc;
    }, {});

  const monthlyRevenueData = Object.entries(revenueByMonth)
    .sort()
    .slice(-12)
    .map(([month, amount]) => ({
      month,
      revenue: Math.round((amount as number) / 1000000), // En millions
    }));

  // Top clients par CA
  const customerRevenue = invoices
    .filter((inv: any) => inv.status === 'PAID')
    .reduce((acc: any, invoice: any) => {
      const customerName = invoice.customer?.name || 'Inconnu';
      const amount = invoice.totalTTC || invoice.total_ttc || calculateTotal(invoice.items);
      acc[customerName] = (acc[customerName] || 0) + amount;
      return acc;
    }, {});

  const topCustomers = Object.entries(customerRevenue)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 10)
    .map(([name, value]) => ({
      name,
      value: Math.round((value as number) / 1000000), // En millions
    }));

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
          Tableau de Bord Facturation
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Chiffre d'Affaires</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {stats.paidInvoices} factures payées
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">En Attente</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {formatCurrency(stats.pendingAmount)}
              </p>
              <p className="text-sm text-blue-600 mt-1">à encaisser</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">En Retard</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {formatCurrency(stats.overdueAmount)}
              </p>
              <p className="text-sm text-red-600 mt-1">à relancer</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Devis</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.totalQuotes}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {stats.acceptedQuotes} acceptés
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition factures par statut */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Répartition des Factures par Statut
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Répartition devis par statut */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Répartition des Devis par Statut
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={quoteStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {quoteStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Évolution mensuelle du CA */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Évolution Mensuelle du Chiffre d'Affaires (M XOF)
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={monthlyRevenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              name="CA (Millions XOF)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Top clients */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Top 10 Clients par CA (M XOF)
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topCustomers} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
