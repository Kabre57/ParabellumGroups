'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OverviewDashboard } from '@/components/dashboard/OverviewDashboard';
import { FinancialDashboard } from '@/components/dashboard/FinancialDashboard';
import { TechnicalDashboard } from '@/components/dashboard/TechnicalDashboard';
import { HRDashboard } from '@/components/dashboard/HRDashboard';
import { CustomerDashboard } from '@/components/dashboard/CustomerDashboard';
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
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
  { id: 'financial', label: 'Financier', icon: DollarSign },
  { id: 'technical', label: 'Technique', icon: Wrench },
  { id: 'hr', label: 'Ressources Humaines', icon: Users },
  { id: 'customer', label: 'Clients', icon: Building2 },
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<DashboardType>('overview');

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
            {tabs.map((tab) => {
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
