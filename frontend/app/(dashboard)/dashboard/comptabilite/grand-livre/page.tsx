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

export default function GrandLivrePage() {
  const { user } = useAuth();
  const permissionSet = buildPermissionSet(user);
  const canRead = isAdminRole(user) || permissionSet.has('accounting.read') || permissionSet.has('reports.read_financial');
  
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    periodId: '',
    fiscalYearId: '',
    enterpriseId: user?.enterpriseId || '',
    accountIds: '',
  });

  const loadData = async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const response = await accountingService.getLedger(filters);
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
  }, [filters.enterpriseId]);

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
          <Button>
            <Download className="h-4 w-4 mr-2" /> Exporter PDF
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
          <Input type="date" className="h-10" />
          <Input type="date" className="h-10" />
        </div>
      </Card>

      <GeneralLedgerTable accounts={accounts} loading={loading} />
    </div>
  );
}
