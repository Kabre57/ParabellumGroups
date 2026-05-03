'use client';

import React, { useState, useEffect } from 'react';
import { TrialBalanceTable } from '@/components/comptabilite/rapports/TrialBalanceTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Download, Printer, Filter } from 'lucide-react';
import { accountingService } from '@/shared/api/billing/accounting.service';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/shared/hooks/useAuth';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';

export default function TrialBalancePage() {
  const { user } = useAuth();
  const permissionSet = buildPermissionSet(user);
  const canRead = isAdminRole(user) || permissionSet.has('accounting.read') || permissionSet.has('reports.read_financial');
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    periodId: '',
    fiscalYearId: '',
    enterpriseId: user?.enterpriseId || '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await accountingService.getTrialBalance(filters);
      if (response.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error("Erreur chargement balance:", error);
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
        Vous n&apos;avez pas accès à la balance des comptes.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Balance des Comptes</h1>
          <p className="text-muted-foreground">
            Vue auditable basée sur le journal comptable persistant.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" /> Imprimer
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" /> Exporter CSV
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Période / Exercice</label>
            <select 
              className="w-full h-10 px-3 rounded-md border"
              value={filters.fiscalYearId}
              onChange={(e) => setFilters({...filters, fiscalYearId: e.target.value})}
            >
              <option value="">Tous les exercices</option>
              {/* Options dynamiques à charger */}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Recherche</label>
            <div className="relative">
              <Input placeholder="Compte ou libellé..." className="pl-8" />
              <Filter className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </Card>

      <TrialBalanceTable data={data} loading={loading} />
    </div>
  );
}
