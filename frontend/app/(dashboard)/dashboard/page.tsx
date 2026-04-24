'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { EnterpriseRealtimeDashboard } from '@/components/dashboard/EnterpriseRealtimeDashboard';
import { isAdminRole } from '@/shared/permissions';
import { getPreferredServiceRoute } from '@/shared/dashboard-routing';
import { useState } from 'react';

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const isAdmin = isAdminRole(user);
  const preferredServiceRoute = getPreferredServiceRoute(user);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    setHasToken(!!token);
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user || isAdmin) return;
    if (preferredServiceRoute !== '/dashboard') {
      router.replace(preferredServiceRoute);
    }
  }, [authLoading, isAdmin, isAuthenticated, preferredServiceRoute, router, user]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin && preferredServiceRoute !== '/dashboard') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <EnterpriseRealtimeDashboard
      title="Tableau de bord direction"
      description="KPI, graphes et activité consolidée de tous les services avec rafraîchissement régulier."
      showQuickActions
      period={dateRange}
      onPeriodChange={setDateRange}
    />
  );
}
