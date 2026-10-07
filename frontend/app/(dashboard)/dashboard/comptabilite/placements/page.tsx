'use client';

import { InvestmentDashboard } from '@/components/comptabilite/investments/InvestmentDashboard';
import { useAccountingEnterpriseScope } from '@/hooks/comptabilite/useAccountingEnterpriseScope';

export default function PlacementsPage() {
  const accountingScope = useAccountingEnterpriseScope();
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <InvestmentDashboard scope={accountingScope} />
    </div>
  );
}
