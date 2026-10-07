'use client';

import React, { useState, useEffect } from 'react';
import { GeneralLedgerTable } from '@/components/comptabilite/rapports/GeneralLedgerTable';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, Search } from 'lucide-react';
import { accountingService } from '@/shared/api/billing/accounting.service';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/shared/hooks/useAuth';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { useAccountingEnterpriseScope } from '@/hooks/comptabilite/useAccountingEnterpriseScope';

export default function GrandLivrePage() {
  const { user } = useAuth();
  const accountingScope = useAccountingEnterpriseScope();
  const permissionSet = buildPermissionSet(user);
  const canRead = isAdminRole(user) || permissionSet.has('accounting.reports.read');
  
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    periodId: '',
    fiscalYearId: '',
    accountIds: '',
    startDate: '',
    endDate: '',
  });

  const loadData = async () => {
    if (!canRead || !accountingScope.isReady) return;
    setLoading(true);
    try {
      const response = await accountingService.getLedger({ ...filters, ...accountingScope });
      if (response.success) {
        setAccounts(response.data);
      }
    } catch (error) {
      console.error("Erreur chargement grand livre:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accountingScope.scopeKey]);

  if (!canRead) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Vous n&apos;avez pas accès au grand livre.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grand Livre</h1>
          <p className="text-muted-foreground">
            Détail des mouvements par compte issus du journal auditable.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
          <Button variant="outline" onClick={() => {
            const rows = [['Compte', 'Intitulé', 'Date', 'Journal', 'N° pièce', 'Libellé', 'Débit', 'Crédit', 'Solde']];
            accounts.forEach((account) => account.lines.forEach((line: any) => rows.push([account.accountCode, account.accountLabel, new Date(line.date).toLocaleDateString('fr-FR'), line.journal, line.entryNumber, line.label, line.debit, line.credit, line.runningBalance])));
            const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(';')).join('\r\n');
            const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'grand-livre.csv'; link.click(); URL.revokeObjectURL(url);
          }} disabled={!accounts.length}>
            <Download className="h-4 w-4 mr-2" /> Exporter CSV
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filtrer par comptes (ex: 512, 401)..." 
              className="pl-8"
              value={filters.accountIds}
              onChange={(e) => setFilters({...filters, accountIds: e.target.value})}
            />
          </div>
          <Input aria-label="Date de début" type="date" className="h-10" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} />
          <Input aria-label="Date de fin" type="date" className="h-10" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} />
        </div>
      </Card>

      <GeneralLedgerTable accounts={accounts} loading={loading} />
    </div>
  );
}
