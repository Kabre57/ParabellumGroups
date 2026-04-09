'use client';
import React, { useMemo, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import billingService, { type AccountingMovement } from '@/shared/api/billing';
import {
  useTresorerieFlows, useTreasuryClosures,
  useCreateTreasuryAccount, useCreateClosure, useValidateClosure
} from '@/hooks/comptabilite/tresorerie/useTresorerie';
import {
  TresorerieStats, TresorerieAccountsList,
  TresorerieFlowsTable, TresorerieClosuresTable
} from '@/components/comptabilite/tresorerie';
import { Button } from '@/components/ui/button';
import { Calendar, PlusCircle } from 'lucide-react';
import { AccountingDateRangeDialog } from '@/components/accounting/AccountingDateRangeDialog';
import { CreateTreasuryAccountDialog } from '@/components/accounting/CreateTreasuryAccountDialog';
import { TreasuryClosureDialog } from '@/components/accounting/TreasuryClosureDialog';
import TabularListPrint from '@/components/printComponents/TabularListPrint';
import { formatAccountingCurrency, formatAccountingDate } from '@/components/accounting/accountingFormat';
import { formatFCFA } from '@/components/printComponents/printUtils';
import { exportTreasuryCsv } from '@/components/accounting/accountingExport';

export default function TresoreriePage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'week'|'month'|'quarter'|'year'|'all'>('month');
  const [customRange, setCustomRange] = useState<{startDate?:string;endDate?:string}|null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [closureDialogOpen, setClosureDialogOpen] = useState(false);
  const [printJournalOpen, setPrintJournalOpen] = useState(false);
  const [accountFilter, setAccountFilter] = useState('all');
  const [closureFilter, setClosureFilter] = useState('all');

  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canRead = isAdminRole(user) || ['reports.read_financial','expenses.read','expenses.read_all','payments.read','invoices.read'].some(p => permissionSet.has(p));
  const canValidateClosure = isAdminRole(user) || ['payments.validate','expenses.approve','expenses.update'].some(p => permissionSet.has(p));

  const periodRange = useMemo(() => {
    if (customRange) return customRange;
    if (period === 'all') return null;
    const now = new Date();
    if (period === 'week') { const s = new Date(now); s.setDate(now.getDate()-now.getDay()); const e = new Date(s); e.setDate(s.getDate()+6); return {startDate:s.toISOString(),endDate:e.toISOString()}; }
    if (period === 'month') { const s = new Date(now.getFullYear(),now.getMonth(),1); const e = new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59); return {startDate:s.toISOString(),endDate:e.toISOString()}; }
    if (period === 'quarter') { const qm = Math.floor(now.getMonth()/3)*3; const s = new Date(now.getFullYear(),qm,1); const e = new Date(now.getFullYear(),qm+3,0,23,59,59); return {startDate:s.toISOString(),endDate:e.toISOString()}; }
    return { startDate: new Date(now.getFullYear(),0,1).toISOString(), endDate: new Date(now.getFullYear(),11,31,23,59,59).toISOString() };
  }, [customRange, period]);

  const { data, isLoading } = useTresorerieFlows(period, customRange, canRead);
  const { data: closuresResponse } = useTreasuryClosures(periodRange, period, customRange, canRead);

  const createAccountMutation = useCreateTreasuryAccount(() => setAccountDialogOpen(false));
  const createClosureMutation = useCreateClosure(() => setClosureDialogOpen(false));
  const validateClosureMutation = useValidateClosure();

  const cashFlows: AccountingMovement[] = data?.data?.treasuryMovements ?? [];
  const report = data?.data?.reports?.treasury;
  const treasuryAccounts = report?.accounts ?? [];
  const totalIncome = report?.inflows || 0;
  const totalExpense = report?.outflows || 0;
  const currentBalance = report?.closingBalance || 0;

  const filteredFlows = useMemo(() => {
    let flows = cashFlows;
    if (accountFilter !== 'all') flows = flows.filter((f:AccountingMovement) => f.treasuryAccountId === accountFilter);
    if (closureFilter !== 'all') {
      const cl = closuresResponse?.data?.find(c => c.id === closureFilter);
      if (cl) { const s = new Date(cl.periodStart); const e = new Date(cl.periodEnd); flows = flows.filter((f:AccountingMovement) => { const d = new Date(f.date); return d>=s && d<=e; }); }
    }
    return flows;
  }, [cashFlows, accountFilter, closureFilter, closuresResponse?.data]);

  if (!canRead) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">Vous n&apos;avez pas accès à la trésorerie.</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div><h1 className="text-3xl font-bold">Trésorerie</h1><p className="text-muted-foreground mt-2">Suivi des flux de trésorerie, soldes multi-banques et sous-caisses.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAccountDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Nouveau compte</Button>
          <Button variant="outline" onClick={() => setClosureDialogOpen(true)}>Clôturer la caisse</Button>
          <select value={period} onChange={e => { setPeriod(e.target.value as any); setCustomRange(null); }} className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700">
            <option value="week">Cette semaine</option><option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option><option value="year">Cette année</option>
          </select>
          <Button variant="outline" onClick={() => setPrintJournalOpen(true)}>Imprimer le journal</Button>
          <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700">
            <option value="all">Tous les comptes</option>
            {treasuryAccounts.map((a:any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={closureFilter} onChange={e => setClosureFilter(e.target.value)} className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700">
            <option value="all">Toutes clôtures</option>
            {(closuresResponse?.data ?? []).map(c => <option key={c.id} value={c.id}>{new Date(c.periodStart).toLocaleDateString('fr-FR')} - {new Date(c.periodEnd).toLocaleDateString('fr-FR')}</option>)}
          </select>
          <Button variant="outline" onClick={() => exportTreasuryCsv(filteredFlows)}>Exporter Excel</Button>
          <Button onClick={() => setDialogOpen(true)}><Calendar className="h-4 w-4 mr-2" />{customRange?.startDate ? 'Plage active' : 'Personnalisé'}</Button>
        </div>
      </div>

      <TresorerieAccountsList accounts={treasuryAccounts} />
      <TresorerieStats currentBalance={currentBalance} totalIncome={totalIncome} totalExpense={totalExpense} />
      <TresorerieFlowsTable flows={filteredFlows} isLoading={isLoading} />
      <TresorerieClosuresTable closures={closuresResponse?.data ?? []} canValidate={canValidateClosure} onValidate={id => validateClosureMutation.mutate(id)} />

      <AccountingDateRangeDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultRange={customRange} onApply={r => setCustomRange(r.startDate||r.endDate ? r : null)} />
      <CreateTreasuryAccountDialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen} isSubmitting={createAccountMutation.isPending} onSubmit={p => createAccountMutation.mutate(p)} />
      <TreasuryClosureDialog open={closureDialogOpen} onOpenChange={setClosureDialogOpen} accounts={treasuryAccounts} isSubmitting={createClosureMutation.isPending}
        onSubmit={p => { const { status, ...rest } = p; createClosureMutation.mutate(rest as any); }} />

      {printJournalOpen && (
        <TabularListPrint title="Journal de trésorerie" subtitle="Mouvements de trésorerie sur la période"
          columns={[{key:'date',label:'Date'},{key:'type',label:'Type'},{key:'category',label:'Catégorie'},{key:'account',label:'Compte'},{key:'description',label:'Description'},{key:'amount',label:'Montant',align:'right'},{key:'balance',label:'Solde',align:'right'}]}
          rows={filteredFlows.map((f:AccountingMovement) => ({ date:formatAccountingDate(f.date), type:f.type==='income'?'Encaissement':'Décaissement', category:f.category, account:f.treasuryAccountName||'-', description:f.description, amount:`${f.type==='income'?'+':'-'}${formatFCFA(f.amount)}`, balance:formatFCFA(f.balance) }))}
          summary={[{label:'Total encaissements',value:formatFCFA(totalIncome)},{label:'Total décaissements',value:formatFCFA(totalExpense)}]}
          onClose={() => setPrintJournalOpen(false)} />
      )}
    </div>
  );
}
