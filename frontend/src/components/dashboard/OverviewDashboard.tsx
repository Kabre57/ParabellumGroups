'use client';

import React, { useState } from 'react';
import { EnterpriseRealtimeDashboard } from './EnterpriseRealtimeDashboard';

export function OverviewDashboard() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  return (
    <EnterpriseRealtimeDashboard
      title="Vue d'ensemble analytique"
      description="KPI, tendances et activité consolidée des services en quasi temps réel."
      showQuickActions={false}
      period={period}
      onPeriodChange={setPeriod}
    />
  );
}
