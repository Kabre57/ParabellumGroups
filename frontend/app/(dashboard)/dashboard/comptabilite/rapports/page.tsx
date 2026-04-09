'use client';
import { useState } from 'react';
import { useRapports } from '@/hooks/comptabilite/rapports/useRapports';
import { RapportsHeader, RapportsQuickCards, RapportsBilan, RapportsResultat, RapportsKPIs } from '@/components/comptabilite/rapports';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';

export default function RapportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const permissionSet = buildPermissionSet(user);
  const canRead = isAdminRole(user) || permissionSet.has('reports.read_financial');
  const { canExport } = getCrudVisibility(user, { read: ['reports.read_financial'], export: ['reports.export'] });

  const { data, isLoading } = useRapports(period, canRead);

  const reports = data?.data?.reports;
  const overview = data?.data;
  const balanceSheet = reports?.balanceSheet;
  const incomeStatement = reports?.incomeStatement;
  const treasury = reports?.treasury;
  const commitments = reports?.commitments;
  const kpis = reports?.kpis;

  if (!canRead) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">Vous n&apos;avez pas accès aux rapports comptables.</div>;

  return (
    <div className="space-y-6">
      <RapportsHeader period={period} onPeriodChange={setPeriod} canExport={canExport} overview={overview} />

      {isLoading && <Card className="p-6 text-center text-sm text-gray-500">Chargement des rapports comptables...</Card>}

      <RapportsQuickCards
        balanceSheet={balanceSheet} incomeStatement={incomeStatement}
        treasury={treasury} kpis={kpis} overview={overview} period={period} canExport={canExport}
      />

      <RapportsBilan balanceSheet={balanceSheet} clientReceivables={data?.data?.summary?.clientReceivables || 0} />

      <RapportsResultat
        period={period} incomeStatement={incomeStatement}
        totalReceived={data?.data?.summary?.totalReceived || 0}
        totalDisbursed={data?.data?.summary?.totalDisbursed || 0}
        pendingCommitted={commitments?.pendingCommitted || 0}
      />

      <RapportsKPIs kpis={kpis} balanceSheet={balanceSheet} />
    </div>
  );
}
