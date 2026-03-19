'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OverviewDashboard } from '@/components/dashboard/OverviewDashboard';
import { FinancialDashboard } from '@/components/dashboard/FinancialDashboard';
import { TechnicalDashboard } from '@/components/dashboard/TechnicalDashboard';
import { HRDashboard } from '@/components/dashboard/HRDashboard';
import { CustomerDashboard } from '@/components/dashboard/CustomerDashboard';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getPreferredAnalyticsRoute } from '@/shared/dashboard-routing';
import { hasPermission, isAdminRole } from '@/shared/permissions';
import { 
  BarChart3, 
  DollarSign, 
  Wrench, 
  Users, 
  Building2 
} from 'lucide-react';

type DashboardType = 'overview' | 'financial' | 'technical' | 'hr' | 'customer';

interface Tab {
  id: DashboardType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string;
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3, permission: 'dashboard.read' },
  { id: 'financial', label: 'Financier', icon: DollarSign, permission: 'reports.read_financial' },
  { id: 'technical', label: 'Technique', icon: Wrench, permission: 'missions.read' },
  { id: 'hr', label: 'Ressources Humaines', icon: Users, permission: 'employees.read' },
  { id: 'customer', label: 'Clients', icon: Building2, permission: 'customers.read' },
];

export default function AnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const isAdmin = isAdminRole(user);
  const preferredAnalyticsRoute = getPreferredAnalyticsRoute(user);
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => isAdmin || hasPermission(user, tab.permission)),
    [isAdmin, user]
  );
  const [activeTab, setActiveTab] = useState<DashboardType>('overview');

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user || isAdmin) return;
    if (preferredAnalyticsRoute !== '/dashboard/analytics') {
      router.replace(preferredAnalyticsRoute);
    }
  }, [isAdmin, isAuthenticated, isLoading, preferredAnalyticsRoute, router, user]);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || 'technical');
    }
  }, [activeTab, visibleTabs]);

  const renderDashboard = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewDashboard />;
      case 'financial':
        return <FinancialDashboard />;
      case 'technical':
        return <TechnicalDashboard />;
      case 'hr':
        return <HRDashboard />;
      case 'customer':
        return <CustomerDashboard />;
      default:
        return <OverviewDashboard />;
    }
  };

  if (!isAdmin && preferredAnalyticsRoute !== '/dashboard/analytics') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Tableau de bord Analytics
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Visualisez et analysez vos données métiers
        </p>
      </div>

      {/* Dashboard Selector - Tabs */}
      <Card>
        <CardContent className="p-2">
          <div className="flex flex-wrap gap-2">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <Button
                  key={tab.id}
                  variant={isActive ? 'default' : 'ghost'}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 ${
                    isActive 
                      ? '' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Dashboard */}
      <div className="animate-in fade-in duration-300">
        {renderDashboard()}
      </div>
    </div>
  );
}
