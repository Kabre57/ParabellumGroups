'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AccountingAccount } from '@/shared/api/billing';

interface CreateJournalEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountingAccount[];
  onSubmit: (payload: {
    entryDate?: string;
    journalCode?: string;
    journalLabel?: string;
    label: string;
    reference?: string;
    debitAccountId: string;
    creditAccountId: string;
    amount: number;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
}

const initialState = {
  entryDate: new Date().toISOString().slice(0, 10),
  journalCode: 'OD',
  journalLabel: 'Opérations diverses',
  label: '',
  reference: '',
  debitAccountId: '',
  creditAccountId: '',
  amount: '',
};

export function CreateJournalEntryDialog({
  open,
  onOpenChange,
  accounts,
  onSubmit,
  isSubmitting = false,
}: CreateJournalEntryDialogProps) {
  const [form, setForm] = useState(initialState);

  useEffect(() => {
    if (open) {
      setForm(initialState);
    }
  }, [open]);

  const sortedAccounts = useMemo(
    () => [...accounts].sort((left, right) => left.code.localeCompare(right.code, 'fr')),
    [accounts]
  );

  const amount = Number(form.amount || 0);

  const handleSubmit = async () => {
    await onSubmit({
      entryDate: form.entryDate || undefined,
      journalCode: form.journalCode.trim() || undefined,
      journalLabel: form.journalLabel.trim() || undefined,
      label: form.label.trim(),
      reference: form.reference.trim() || undefined,
      debitAccountId: form.debitAccountId,
      creditAccountId: form.creditAccountId,
      amount: Number(form.amount || 0),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[92vh] max-w-6xl grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Nouvelle écriture comptable</DialogTitle>
          <DialogDescription>
            Présentation dense type journal ERP. Le débit et le crédit restent équilibrés sur la même pièce.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="entry-date">Date</Label>
            <Input
              id="entry-date"
              type="date"
              value={form.entryDate}
              onChange={(event) => setForm((current) => ({ ...current, entryDate: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-journal-code">Code journal</Label>
            <Input
              id="entry-journal-code"
              value={form.journalCode}
              onChange={(event) => setForm((current) => ({ ...current, journalCode: event.target.value.toUpperCase() }))}
              placeholder="OD, CA, BQ..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-journal-label">Libellé journal</Label>
            <Input
              id="entry-journal-label"
              value={form.journalLabel}
              onChange={(event) => setForm((current) => ({ ...current, journalLabel: event.target.value }))}
              placeholder="Journal de caisse, banque..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-reference">Référence</Label>
            <Input
              id="entry-reference"
              value={form.reference}
              onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))}
              placeholder="Pièce, facture, bon de caisse..."
            />
          </div>

          <div className="space-y-2 md:col-span-4">
            <Label htmlFor="entry-label">Libellé de l'écriture</Label>
            <Input
              id="entry-label"
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              placeholder="Achat fournitures, ajustement de caisse..."
            />
          </div>

          <div className="space-y-2 md:col-span-4">
            <Label htmlFor="entry-amount">Montant pièce</Label>
            <Input
              id="entry-amount"
              type="number"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-background">
          <div className="overflow-auto h-[320px]">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr className="border-b">
                  <th className="w-20 px-3 py-3 font-semibold">Ligne</th>
                  <th className="min-w-[280px] px-3 py-3 font-semibold">Compte</th>
                  <th className="min-w-[280px] px-3 py-3 font-semibold">Libellé</th>
                  <th className="w-40 px-3 py-3 font-semibold text-right">Débit</th>
                  <th className="w-40 px-3 py-3 font-semibold text-right">Crédit</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b align-top">
                  <td className="px-3 py-3 text-xs font-semibold text-muted-foreground">1</td>
                  <td className="px-3 py-3">
                    <Select value={form.debitAccountId} onValueChange={(value) => setForm((current) => ({ ...current, debitAccountId: value }))}>
                      <SelectTrigger id="entry-debit">
                        <SelectValue placeholder="Choisir le compte débit" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.code} - {account.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-3">{form.label || 'Ligne débit'}</td>
                  <td className="px-3 py-3 text-right font-semibold text-green-600">
                    {new Intl.NumberFormat('fr-FR').format(amount)} F CFA
                  </td>
                  <td className="px-3 py-3 text-right text-muted-foreground">0 F CFA</td>
                </tr>
                <tr className="align-top">
                  <td className="px-3 py-3 text-xs font-semibold text-muted-foreground">2</td>
                  <td className="px-3 py-3">
                    <Select value={form.creditAccountId} onValueChange={(value) => setForm((current) => ({ ...current, creditAccountId: value }))}>
                      <SelectTrigger id="entry-credit">
                        <SelectValue placeholder="Choisir le compte crédit" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.code} - {account.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-3">{form.label || 'Ligne crédit'}</td>
                  <td className="px-3 py-3 text-right text-muted-foreground">0 F CFA</td>
                  <td className="px-3 py-3 text-right font-semibold text-red-600">
                    {new Intl.NumberFormat('fr-FR').format(amount)} F CFA
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 border-t bg-slate-50 px-4 py-3 text-sm md:grid-cols-4">
            <div className="rounded-md border bg-white px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Pièce</div>
              <div className="font-semibold">{form.reference || 'Sans référence'}</div>
            </div>
            <div className="rounded-md border bg-white px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Débit</div>
              <div className="font-semibold text-green-600">{new Intl.NumberFormat('fr-FR').format(amount)} F CFA</div>
            </div>
            <div className="rounded-md border bg-white px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Crédit</div>
              <div className="font-semibold text-red-600">{new Intl.NumberFormat('fr-FR').format(amount)} F CFA</div>
            </div>
            <div className="rounded-md border bg-blue-50 px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-blue-700">Équilibre</div>
              <div className="font-semibold text-blue-900">{form.debitAccountId && form.creditAccountId && amount > 0 ? 'Écriture équilibrée' : 'À compléter'}</div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t bg-background pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !form.label.trim() ||
              !form.debitAccountId ||
              !form.creditAccountId ||
              Number(form.amount || 0) <= 0
            }
          >
            Créer l&apos;écriture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
