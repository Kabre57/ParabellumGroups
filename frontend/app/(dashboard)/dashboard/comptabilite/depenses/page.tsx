'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/shared/hooks/useAuth';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import billingService, {
  type PurchaseCommitment,
} from '@/shared/api/billing';
import { useAccountingEnterpriseScope } from '@/hooks/comptabilite/useAccountingEnterpriseScope';
import { useEnterprise } from '@/shared/providers/EnterpriseProvider';
import { CreateEncaissementDialog } from '@/components/accounting/CreateEncaissementDialog';
import { CreateDecaissementDialog } from '@/components/accounting/CreateDecaissementDialog';
import { CreateFactureFournisseurDialog } from '@/components/accounting/CreateFactureFournisseurDialog';
import TabularListPrint from '@/components/printComponents/TabularListPrint';
import CashVoucherPrint from '@/components/printComponents/CashVoucherPrint';
import { formatFCFA } from '@/components/printComponents/printUtils';
import { AccountingDateRangeDialog } from '@/components/accounting/AccountingDateRangeDialog';
import {
  DepensesHeader,
  DepensesStats,
  DepensesTable,
} from '@/components/comptabilite/depenses';
import { formatCurrency, formatDate, sourceLabels, useDepensesPageModel } from './page.model';

export default function DepensesPage() {  const { user, selectedEnterprise, accountingScope, queryClient, permissionSet, canRead, canMutate, canCreateVoucher, canImportVoucher, canApproveVoucher, search, setSearch, period, setPeriod, selectedDay, setSelectedDay, customRange, setCustomRange, rangeDialogOpen, setRangeDialogOpen, activeTab, setActiveTab, encaissementOpen, setEncaissementOpen, decaissementOpen, setDecaissementOpen, liquidationOpen, setLiquidationOpen, importOpen, setImportOpen, importFile, setImportFile, importDefaultFlowType, setImportDefaultFlowType, importDefaultStatus, setImportDefaultStatus, selectedCommitment, setSelectedCommitment, printVoucher, setPrintVoucher, printListOpen, setPrintListOpen, range, data, isLoading, createEncaissementMutation, createDecaissementMutation, createLiquidationMutation, validateCommitmentMutation, validateEncaissementMutation, validateDecaissementMutation, updateVoucherMutation, importCashVouchersMutation, commitments, vouchers, encaissements, decaissements, filteredCommitments, filteredVouchers, filteredEncaissements, filteredDecaissements, consolidatedRows } = useDepensesPageModel();



  if (!canRead) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Vous n&apos;avez pas acces au module comptable des depenses et bons de caisse.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DepensesHeader
        period={period}
        selectedDay={selectedDay}
        hasCustomRange={Boolean(customRange)}
        onPeriodChange={(nextPeriod) => {
          setPeriod(nextPeriod);
          setCustomRange(null);
        }}
        onSelectedDayChange={(day) => {
          setSelectedDay(day);
          setCustomRange(null);
        }}
        onCustomRange={() => setRangeDialogOpen(true)}
        onPrintList={() => setPrintListOpen(true)}
        onImport={() => setImportOpen(true)}
        onNewEncaissement={() => setEncaissementOpen(true)}
        onNewDecaissement={() => {
          setSelectedCommitment(null);
          setDecaissementOpen(true);
        }}
        canCreate={canCreateVoucher}
        canImport={canImportVoucher}
      />

      <AccountingDateRangeDialog
        open={rangeDialogOpen}
        onOpenChange={setRangeDialogOpen}
        defaultRange={customRange}
        onApply={(nextRange) => {
          setCustomRange(nextRange.startDate || nextRange.endDate ? nextRange : null);
        }}
      />

      <DepensesStats
        totalCommitted={data?.data?.totals?.totalCommitted || 0}
        totalVouchered={data?.data?.totals?.totalVouchered || 0}
        totalDisbursed={data?.data?.totals?.totalDisbursed || 0}
        totalReceived={data?.data?.totals?.totalReceived || 0}
        pendingVouchersAmount={data?.data?.totals?.pendingVouchersAmount || 0}
      />

      <Card className="p-4 shadow-sm">
        <div className="grid gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par piece, client, fournisseur, beneficiaire ou reference..."
              className="pl-9"
            />
          </div>
        </div>
      </Card>

      <DepensesTable
        isLoading={isLoading}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        filteredCommitments={filteredCommitments}
        filteredVouchers={filteredVouchers}
        filteredEncaissements={filteredEncaissements}
        filteredDecaissements={filteredDecaissements}
        consolidatedRows={consolidatedRows}
        showEnterpriseColumn={accountingScope.isConsolidated}
        canMutate={canMutate}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        sourceLabels={sourceLabels}
        canApprove={canApproveVoucher}
        onValidateCommitment={(commitment) => validateCommitmentMutation.mutate(commitment.id)}
        onValidateEncaissement={(encaissement) => validateEncaissementMutation.mutate(encaissement.id)}
        onValidateDecaissement={(decaissement) => validateDecaissementMutation.mutate(decaissement.id)}
        onUpdateVoucher={(id, status) => updateVoucherMutation.mutate({ id, status })}
        onPrintVoucher={setPrintVoucher}
        onLiquider={(commitment) => {
          setSelectedCommitment(commitment);
          setLiquidationOpen(true);
        }}
        onPayer={(commitment) => {
          setSelectedCommitment(commitment);
          setDecaissementOpen(true);
        }}
      />

      <CreateEncaissementDialog
        open={encaissementOpen && canMutate}
        onOpenChange={setEncaissementOpen}
        isSubmitting={createEncaissementMutation.isPending}
        onSubmit={async (payload) => {
          await createEncaissementMutation.mutateAsync(payload);
        }}
      />

      <CreateDecaissementDialog
        open={decaissementOpen && canMutate}
        onOpenChange={setDecaissementOpen}
        defaultCommitment={selectedCommitment}
        isSubmitting={createDecaissementMutation.isPending}
        onSubmit={async (payload) => {
          await createDecaissementMutation.mutateAsync(payload);
        }}
      />

      {selectedCommitment && (
        <CreateFactureFournisseurDialog
          open={liquidationOpen && canMutate}
          onOpenChange={setLiquidationOpen}
          commitment={selectedCommitment}
          isSubmitting={createLiquidationMutation.isPending}
          onSubmit={async (payload) => {
            await createLiquidationMutation.mutateAsync(payload);
          }}
        />
      )}

      {canImportVoucher && (
        <Dialog open={importOpen && canMutate} onOpenChange={setImportOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Importer des bons de caisse historiques</DialogTitle>
              <DialogDescription>
                Importez un fichier Excel `.xlsx` contenant vos bons de caisse saisis manuellement en 2024 ou sur une autre période.
                Colonnes reconnues: `numeroPiece`, `beneficiaire`, `description`, `montantTTC`, `modePaiement`, `date`,
                `reference`, `notes`, `typeFlux`, `statut`.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Les operations importees seront affectees a l&apos;entreprise active : <strong>{selectedEnterprise?.name || 'aucune entreprise selectionnee'}</strong>.
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fichier Excel</label>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">

                <div className="space-y-2">
                  <label className="text-sm font-medium">Flux par défaut</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={importDefaultFlowType}
                    onChange={(event) => setImportDefaultFlowType(event.target.value as 'ENCAISSEMENT' | 'DECAISSEMENT')}
                  >
                    <option value="DECAISSEMENT">Décaissement</option>
                    <option value="ENCAISSEMENT">Encaissement</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Statut par défaut</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={importDefaultStatus}
                    onChange={(event) => setImportDefaultStatus(event.target.value as any)}
                  >
                    <option value="BROUILLON">Brouillon</option>
                    <option value="EN_ATTENTE">En attente</option>
                    <option value="VALIDE">Valide</option>
                    <option value="DECAISSE">Décaisse</option>
                    <option value="ANNULE">Annule</option>
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importCashVouchersMutation.isPending}>
                Annuler
              </Button>
              <Button onClick={() => void importCashVouchersMutation.mutateAsync()} disabled={!importFile || importCashVouchersMutation.isPending}>
                {importCashVouchersMutation.isPending ? 'Import en cours...' : 'Importer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {printVoucher && (
        <CashVoucherPrint voucher={printVoucher} onClose={() => setPrintVoucher(null)} />
      )}

      {printListOpen && (
        <TabularListPrint
          title="Flux de caisse et depenses"
          subtitle={
            accountingScope.isConsolidated
              ? 'Liste consolidee des engagements, encaissements, decaissements et pieces de caisse'
              : `Liste des flux comptables - ${selectedEnterprise?.name || 'Entreprise active'}`
          }
          columns={[
            { key: 'number', label: 'N° Piece' },
            { key: 'date', label: 'Date' },
            { key: 'label', label: 'Type' },
            ...(accountingScope.isConsolidated ? [{ key: 'enterpriseName', label: 'Entreprise / Entité' }] : []),
            { key: 'thirdParty', label: 'Tiers' },
            { key: 'amount', label: 'Montant TTC', align: 'right' },
            { key: 'status', label: 'Statut' },
          ]}
          rows={consolidatedRows.map((row) => ({
            number: row.number,
            date: formatDate(row.date),
            label: row.label,
            ...(accountingScope.isConsolidated ? { enterpriseName: row.enterpriseName || '-' } : {}),
            thirdParty: row.thirdParty,
            amount: formatFCFA(row.amount),
            status: row.status,
          }))}
          summary={[
            {
              label: 'Total Encaissements',
              value: formatFCFA(data?.data?.totals?.totalReceived || 0),
            },
            {
              label: 'Total Decaissements',
              value: formatFCFA(data?.data?.totals?.totalDisbursed || 0),
            },
            {
              label: 'Net Tresorerie',
              value: formatFCFA((data?.data?.totals?.totalReceived || 0) - (data?.data?.totals?.totalDisbursed || 0)),
            },
          ]}
          onClose={() => setPrintListOpen(false)}
        />
      )}
    </div>
  );
}
