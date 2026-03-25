'use client';

import React, { useState } from 'react';
import { EnterpriseRealtimeDashboard } from './EnterpriseRealtimeDashboard';

export function OverviewDashboard() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

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
