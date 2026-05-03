'use client';
import { useState } from 'react';
import { useRapports } from '@/hooks/comptabilite/rapports/useRapports';
import { RapportsHeader, RapportsQuickCards, RapportsBilan, RapportsResultat, RapportsKPIs } from '@/components/comptabilite/rapports';
import { SyscoaReportDialog } from '@/components/comptabilite/rapports/SyscoaReportDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';

export default function RapportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [isSyscoaOpen, setIsSyscoaOpen] = useState(false);
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
      <div className="flex justify-end">
        <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => setIsSyscoaOpen(true)}>
          <FileText className="h-4 w-4" />
          Générer États Réglementaires (SYSCOA)
        </Button>
      </div>

      <RapportsHeader period={period} onPeriodChange={setPeriod} canExport={canExport} overview={overview} />
      
      <SyscoaReportDialog 
        open={isSyscoaOpen} 
        onOpenChange={setIsSyscoaOpen} 
        enterpriseId={user?.enterpriseId ? Number(user.enterpriseId) : undefined} 
      />

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
