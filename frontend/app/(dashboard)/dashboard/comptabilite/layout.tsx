import type { ReactNode } from 'react';
import { AccountingEnterpriseScopeBar } from '@/components/accounting/AccountingEnterpriseScopeBar';

export default function AccountingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <AccountingEnterpriseScopeBar />
      {children}
    </div>
  );
}
