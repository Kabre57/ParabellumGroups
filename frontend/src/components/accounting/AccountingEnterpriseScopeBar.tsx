'use client';

import { Building2, Layers3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/shared/hooks/useAuth';
import { isAdminRole } from '@/shared/permissions';
import { useEnterprise } from '@/shared/providers/EnterpriseProvider';

export function AccountingEnterpriseScopeBar() {
  const { user } = useAuth();
  const { selectedEnterprise, isAccountingConsolidated, setAccountingConsolidated } = useEnterprise();
  const canConsolidate = isAdminRole(user);

  if (!selectedEnterprise) {
    return (
      <Card className="border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Sélectionnez une entreprise pour consulter la Comptabilité.
      </Card>
    );
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-slate-700">
        {isAccountingConsolidated ? <Layers3 className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
        <span>
          {isAccountingConsolidated
            ? `Vue consolidée en lecture seule à partir de ${selectedEnterprise.name} et de ses entités accessibles`
            : `Entreprise active : ${selectedEnterprise.name}`}
        </span>
      </div>
      {canConsolidate && (
        <button
          type="button"
          aria-pressed={isAccountingConsolidated}
          onClick={() => setAccountingConsolidated(!isAccountingConsolidated)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {isAccountingConsolidated ? 'Revenir à l’entreprise active' : 'Vue consolidée'}
        </button>
      )}
    </Card>
  );
}
