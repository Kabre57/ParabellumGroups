'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { EnterpriseRealtimeDashboard } from '@/components/dashboard/EnterpriseRealtimeDashboard';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/shared/permissions';
import { getPreferredAnalyticsRoute } from '@/shared/dashboard-routing';

export default function AnalyticsPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const isAdmin = isAdminRole(user);
  const preferredAnalyticsRoute = getPreferredAnalyticsRoute(user);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user || isAdmin) return;
    if (preferredAnalyticsRoute !== '/dashboard/analytics') {
      router.replace(preferredAnalyticsRoute);
    }
  }, [isAdmin, isAuthenticated, isLoading, preferredAnalyticsRoute, router, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin && preferredAnalyticsRoute !== '/dashboard/analytics') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <EnterpriseRealtimeDashboard
      title="Analytics entreprise"
      description="KPI, graphes et indicateurs temps réel de tous les services avec filtres jour, semaine, mois et année."
      showQuickActions={false}
      period={period}
      onPeriodChange={setPeriod}
    />
  );
}
