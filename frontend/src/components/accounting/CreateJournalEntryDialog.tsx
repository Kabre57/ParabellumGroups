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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nouvelle écriture comptable</DialogTitle>
          <DialogDescription>
            Enregistrez une écriture équilibrée dans le journal général. Le débit et le crédit sont créés en même temps.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
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
            <Label htmlFor="entry-amount">Montant</Label>
            <Input
              id="entry-amount"
              type="number"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              placeholder="0"
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

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="entry-label">Libellé de l'écriture</Label>
            <Input
              id="entry-label"
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              placeholder="Achat fournitures, ajustement de caisse..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-debit">Compte débit</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-credit">Compte crédit</Label>
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
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="entry-reference">Référence</Label>
            <Input
              id="entry-reference"
              value={form.reference}
              onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))}
              placeholder="Pièce, facture, bon de caisse..."
            />
          </div>
        </div>

        <DialogFooter>
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
