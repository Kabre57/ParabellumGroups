'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import billingService from '@/shared/api/billing';
import type { OperationalRequest } from '@/shared/api/operationalRequests.service';
import { formatMoney } from '../constants';

export type PaymentMethod = 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'CARTE';

export interface CashVoucherSelection {
  paymentMethod: PaymentMethod;
  treasuryAccountId: string;
  counterpartAccountId: string;
}

interface CashVoucherModalProps {
  isOpen: boolean;
  request: OperationalRequest | null;
  enterpriseId?: string | number;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (selection: CashVoucherSelection) => void;
}

type TreasuryOption = {
  id: string | number;
  name: string;
  type: string;
  isActive?: boolean;
  currentBalance?: number;
  accountingAccount?: { code?: string; label?: string } | null;
};
type LedgerOption = { id: string; code: string; label: string; isActive?: boolean; allowManualPosting?: boolean };

const selectClass = 'mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3';

export function CashVoucherModal({ isOpen, request, enterpriseId, isPending, onClose, onSubmit }: CashVoucherModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [treasuryAccountId, setTreasuryAccountId] = useState('');
  const [counterpartAccountId, setCounterpartAccountId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('ESPECES');
      setTreasuryAccountId('');
      setCounterpartAccountId('');
    }
  }, [isOpen, request?.id]);

  const treasuryQuery = useQuery({
    queryKey: ['cash-voucher-treasury-accounts', enterpriseId],
    queryFn: () => billingService.getTreasuryAccounts(),
    enabled: isOpen && Boolean(enterpriseId),
  });
  const ledgerQuery = useQuery({
    queryKey: ['cash-voucher-ledger-accounts', enterpriseId],
    queryFn: () => billingService.getAccountingAccounts(),
    enabled: isOpen && Boolean(enterpriseId),
  });

  const treasuryOptions = useMemo(() => {
    const expectedType = paymentMethod === 'ESPECES' ? 'CASH' : 'BANK';
    return ((treasuryQuery.data?.data ?? []) as TreasuryOption[]).filter(
      (item) => item.isActive !== false && item.type === expectedType
    );
  }, [treasuryQuery.data, paymentMethod]);

  // Contrepartie : tout compte actif imputable hors classe 5 (la trésorerie est choisie à part).
  const counterpartOptions = useMemo(
    () =>
      ((ledgerQuery.data?.data ?? []) as LedgerOption[])
        .filter((item) => item.isActive !== false && item.allowManualPosting !== false && !String(item.code).startsWith('5'))
        .sort((a, b) => String(a.code).localeCompare(String(b.code))),
    [ledgerQuery.data]
  );

  if (!isOpen || !request) return null;

  const amount = request.amountApproved ?? request.amountRequested;
  const selectedTreasury = treasuryOptions.find((item) => String(item.id) === treasuryAccountId);
  const selectedCounterpart = counterpartOptions.find((item) => item.id === counterpartAccountId);
  const isLoading = treasuryQuery.isLoading || ledgerQuery.isLoading;
  const canSubmit = Boolean(treasuryAccountId && counterpartAccountId) && !isPending;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-3 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="cash-voucher-title">
      <div className="mx-auto my-8 max-w-xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <h2 id="cash-voucher-title" className="text-xl font-bold text-slate-950">Créer un bon de caisse</h2>
        <p className="mt-1 text-sm text-slate-600">
          Le bon sera lié à {request.requestNumber} et restera en brouillon dans Billing.
        </p>

        <div className="mt-5 space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex justify-between gap-3"><span>Bénéficiaire</span><strong>{request.beneficiaryName}</strong></div>
            <div className="mt-1 flex justify-between gap-3"><span>Montant</span><strong>{formatMoney(amount)}</strong></div>
          </div>

          <label className="block text-sm font-medium text-slate-800">
            Mode de règlement
            <select
              id="cash-voucher-payment-method"
              value={paymentMethod}
              onChange={(event) => {
                setPaymentMethod(event.target.value as PaymentMethod);
                setTreasuryAccountId('');
              }}
              className={selectClass}
            >
              <option value="ESPECES">Espèces</option>
              <option value="VIREMENT">Virement</option>
              <option value="CHEQUE">Chèque</option>
              <option value="CARTE">Carte</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-800">
            <span className="flex items-center gap-1.5"><ArrowDownLeft className="h-4 w-4 text-emerald-600" /> Compte débité (imputation de la dépense)</span>
            <select id="cash-voucher-debit-account" value={counterpartAccountId} onChange={(e) => setCounterpartAccountId(e.target.value)} className={selectClass}>
              <option value="">Sélectionner le compte à débiter</option>
              {counterpartOptions.map((account) => (
                <option key={account.id} value={account.id}>{account.code} — {account.label}</option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-slate-500">Ex. compte de charge (6x), avance au personnel (42x), fournisseur (40x).</span>
          </label>

          <label className="block text-sm font-medium text-slate-800">
            <span className="flex items-center gap-1.5"><ArrowUpRight className="h-4 w-4 text-rose-600" /> Compte crédité ({paymentMethod === 'ESPECES' ? 'caisse' : 'banque'})</span>
            <select id="cash-voucher-credit-account" value={treasuryAccountId} onChange={(e) => setTreasuryAccountId(e.target.value)} className={selectClass}>
              <option value="">Sélectionner la {paymentMethod === 'ESPECES' ? 'caisse' : 'banque'} à créditer</option>
              {treasuryOptions.map((account) => (
                <option key={account.id} value={String(account.id)} disabled={!account.accountingAccount?.code}>
                  {account.accountingAccount?.code ? `${account.accountingAccount.code} — ` : ''}{account.name}
                  {!account.accountingAccount?.code ? ' (sans compte comptable)' : ''}
                </option>
              ))}
            </select>
          </label>

          {isLoading && <p className="text-sm text-slate-500">Chargement des comptes…</p>}
          {(treasuryQuery.isError || ledgerQuery.isError) && (
            <p className="text-sm text-rose-700">Les comptes de l’entreprise n’ont pas pu être chargés.</p>
          )}
          {!isLoading && !treasuryQuery.isError && treasuryOptions.length === 0 && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Aucune {paymentMethod === 'ESPECES' ? 'caisse' : 'banque'} n’est rattachée à l’entreprise active.{' '}
              <Link href="/dashboard/facturation/tresorerie" className="font-semibold underline">Configurer la trésorerie</Link>
            </p>
          )}
          {!isLoading && !ledgerQuery.isError && counterpartOptions.length === 0 && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Le plan comptable de l’entreprise active ne contient aucun compte imputable.
            </p>
          )}

          {selectedTreasury && selectedCounterpart && (
            <div className="rounded-lg border border-slate-200 text-xs">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b bg-slate-50 px-3 py-2 font-semibold text-slate-600">
                <span>Écriture prévue au décaissement</span><span>Débit</span><span>Crédit</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 py-2">
                <span>{selectedCounterpart.code} — {selectedCounterpart.label}</span><span>{formatMoney(amount)}</span><span>—</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-t px-3 py-2">
                <span>{selectedTreasury.accountingAccount?.code} — {selectedTreasury.name}</span><span>—</span><span>{formatMoney(amount)}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={isPending}>Annuler</Button>
            <Button
              id="cash-voucher-submit"
              className="min-h-11"
              disabled={!canSubmit}
              onClick={() => onSubmit({ paymentMethod, treasuryAccountId, counterpartAccountId })}
            >
              {isPending ? 'Création…' : 'Créer et lier le bon'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
