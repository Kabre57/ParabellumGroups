'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CashVoucherStatusBadge } from '@/components/accounting/CashVoucherStatusBadge';
import { textOrDash } from '@/components/printComponents/printUtils';
import { OverviewTab } from './DepensesTableOverviewTab';
import { CommitmentsTab } from './DepensesTableCommitmentsTab';
import { DecaissementsTab } from './DepensesTableDecaissementsTab';
import { EncaissementsTab } from './DepensesTableEncaissementsTab';
import { VouchersTab } from './DepensesTableVouchersTab';
import { PurchaseCommitment, Encaissement, Decaissement } from '@/shared/api/billing';

export interface DepensesTableProps {
  isLoading: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  filteredCommitments: PurchaseCommitment[];
  filteredVouchers: any[];
  filteredEncaissements: any[];
  filteredDecaissements: any[];
  consolidatedRows: any[];
  showEnterpriseColumn: boolean;
  canMutate: boolean;
  formatCurrency: (v: number) => string;
  formatDate: (v?: string | null) => string;
  sourceLabels: Record<string, string>;
  canApprove: boolean;
  onValidateCommitment: (commitment: PurchaseCommitment) => void;
  onValidateEncaissement: (encaissement: Encaissement) => void;
  onValidateDecaissement: (decaissement: Decaissement) => void;
  onUpdateVoucher: (id: string, status: string) => void;
  onPrintVoucher: (voucher: any) => void;
  onLiquider: (commitment: PurchaseCommitment) => void;
  onPayer: (commitment: PurchaseCommitment) => void;
}



function SectionIntro({
  title,
  description,
  accentClassName,
}: {
  title: string;
  description: string;
  accentClassName: string;
}) {
  return (
    <div className={`mb-4 rounded-xl border p-4 shadow-sm ${accentClassName}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
      <p className="mt-2 text-sm leading-6">{description}</p>
    </div>
  );
}

export function DepensesTable({
  isLoading,
  activeTab,
  onTabChange,
  filteredCommitments,
  filteredVouchers,
  filteredEncaissements,
  filteredDecaissements,
  consolidatedRows,
  showEnterpriseColumn,
  canMutate,
  formatCurrency,
  formatDate,
  sourceLabels,
  canApprove,
  onValidateCommitment,
  onValidateEncaissement,
  onValidateDecaissement,
  onUpdateVoucher,
  onPrintVoucher,
  onLiquider,
  onPayer,
}: DepensesTableProps) {
  const tableProps: DepensesTableProps = {
    isLoading,
    activeTab,
    onTabChange,
    filteredCommitments,
    filteredVouchers,
    filteredEncaissements,
    filteredDecaissements,
    consolidatedRows,
    showEnterpriseColumn,
    canMutate,
    formatCurrency,
    formatDate,
    sourceLabels,
    canApprove,
    onValidateCommitment,
    onValidateEncaissement,
    onValidateDecaissement,
    onUpdateVoucher,
    onPrintVoucher,
    onLiquider,
    onPayer,
  };


  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <div className="overflow-x-auto pb-2">
        <TabsList className="h-auto min-w-max justify-start gap-1 rounded-xl bg-slate-100 p-1">
          <TabsTrigger className="whitespace-nowrap" value="overview">
            Vue globale
          </TabsTrigger>
          <TabsTrigger className="whitespace-nowrap" value="commitments">
            Engagements achats
          </TabsTrigger>
          <TabsTrigger className="whitespace-nowrap" value="decaissements">
            Decaissements
          </TabsTrigger>
          <TabsTrigger className="whitespace-nowrap" value="encaissements">
            Encaissements
          </TabsTrigger>
          <TabsTrigger className="whitespace-nowrap" value="vouchers">
            Pieces de caisse
          </TabsTrigger>
        </TabsList>
      </div>

      <OverviewTab {...tableProps} />

      <CommitmentsTab {...tableProps} />

      <DecaissementsTab {...tableProps} />

      <EncaissementsTab {...tableProps} />

      <VouchersTab {...tableProps} />
    </Tabs>
  );
}
