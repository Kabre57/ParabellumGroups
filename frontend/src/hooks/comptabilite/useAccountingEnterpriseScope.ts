'use client';

import { useAuth } from '@/shared/hooks/useAuth';
import { isAdminRole } from '@/shared/permissions';
import { useEnterprise } from '@/shared/providers/EnterpriseProvider';

export function useAccountingEnterpriseScope() {
  const { user } = useAuth();
  const { selectedEnterprise, isAccountingConsolidated } = useEnterprise();
  const canConsolidate = isAdminRole(user);
  const isConsolidated = canConsolidate && isAccountingConsolidated;

  return {
    enterpriseId: isConsolidated ? undefined : selectedEnterprise?.id,
    enterpriseScope: isConsolidated ? ('consolidated' as const) : undefined,
    isConsolidated,
    isReady: Boolean(selectedEnterprise),
    scopeKey: isConsolidated ? `consolidated:${selectedEnterprise?.id ?? ''}` : String(selectedEnterprise?.id ?? ''),
  };
}
