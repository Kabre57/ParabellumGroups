'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AccountingAccount, AccountingFamilyRule } from '@/shared/api/billing';

interface CreateJournalEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountingAccount[];
  familyRules?: AccountingFamilyRule[];
  onSubmit: (payload: {
    entryDate?: string;
    journalCode?: string;
    journalLabel?: string;
    label: string;
    reference?: string;
    lines: Array<{
      accountId: string;
      side: 'DEBIT' | 'CREDIT';
      amount: number;
      description?: string;
    }>;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
}

interface EntryLineForm {
  id: string;
  family: string;
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

const initialState = {
  entryDate: new Date().toISOString().slice(0, 10),
  journalCode: 'OD',
  journalLabel: 'Opérations diverses',
  label: '',
  reference: '',
};

const createLine = (overrides: Partial<EntryLineForm> = {}): EntryLineForm => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  family: '',
  accountId: '',
  description: '',
  debit: '',
  credit: '',
  ...overrides,
});

const initialLines = () => [
  createLine({ description: 'Ligne débit' }),
  createLine({ description: 'Ligne crédit' }),
];

const toAmount = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function CreateJournalEntryDialog({
  open,
  onOpenChange,
  accounts,
  familyRules = [],
  onSubmit,
  isSubmitting = false,
}: CreateJournalEntryDialogProps) {
  const [form, setForm] = useState(initialState);
  const [lines, setLines] = useState<EntryLineForm[]>(initialLines);

  useEffect(() => {
    if (open) {
      setForm(initialState);
      setLines(initialLines());
    }
  }, [open]);

  const sortedAccounts = useMemo(
    () => [...accounts].sort((left, right) => left.code.localeCompare(right.code, 'fr')),
    [accounts]
  );
  const sortedFamilies = useMemo(
    () => [...familyRules].sort((left, right) => left.family.localeCompare(right.family, 'fr')),
    [familyRules]
  );
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );
  const useFamilies = sortedFamilies.length > 0;

  const normalizedLines = useMemo(
    () =>
      lines
        .map((line) => {
          const debit = toAmount(line.debit);
          const credit = toAmount(line.credit);
          if (!line.accountId || (debit <= 0 && credit <= 0) || (debit > 0 && credit > 0)) {
            return null;
          }
          return {
            accountId: line.accountId,
            side: debit > 0 ? ('DEBIT' as const) : ('CREDIT' as const),
            amount: debit > 0 ? debit : credit,
            description: line.description.trim() || form.label.trim(),
          };
        })
        .filter(Boolean) as Array<{
        accountId: string;
        side: 'DEBIT' | 'CREDIT';
        amount: number;
        description: string;
      }>,
    [form.label, lines]
  );

  const totalDebit = lines.reduce((sum, line) => sum + toAmount(line.debit), 0);
  const totalCredit = lines.reduce((sum, line) => sum + toAmount(line.credit), 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.0001;
  const hasInvalidFilledLine = lines.some((line) => {
    const debit = toAmount(line.debit);
    const credit = toAmount(line.credit);
    return (debit > 0 || credit > 0) && (!line.accountId || (debit > 0 && credit > 0));
  });
  const canSubmit =
    form.label.trim() &&
    normalizedLines.length >= 2 &&
    isBalanced &&
    !hasInvalidFilledLine;

  const updateLine = (id: string, patch: Partial<EntryLineForm>) => {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const updateAmount = (id: string, side: 'debit' | 'credit', value: string) => {
    const patch: Partial<EntryLineForm> = { [side]: value };
    if (toAmount(value) > 0) {
      patch[side === 'debit' ? 'credit' : 'debit'] = '';
    }
    updateLine(id, patch);
  };

  const selectFamily = (lineId: string, familyCode: string) => {
    const family = sortedFamilies.find((item) => item.family === familyCode);
    updateLine(lineId, {
      family: familyCode,
      accountId: family?.primaryAccountId || '',
    });
  };

  const handleSubmit = async () => {
    await onSubmit({
      entryDate: form.entryDate || undefined,
      journalCode: form.journalCode.trim() || undefined,
      journalLabel: form.journalLabel.trim() || undefined,
      label: form.label.trim(),
      reference: form.reference.trim() || undefined,
      lines: normalizedLines,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[92vh] max-w-6xl grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Nouvelle écriture comptable</DialogTitle>
          <DialogDescription>Journal multi-lignes avec contrôle automatique de l'équilibre débit/crédit.</DialogDescription>
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
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background">
          <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
            <div className="text-sm font-semibold">Lignes d'écriture</div>
            <Button type="button" variant="outline" size="sm" onClick={() => setLines((current) => [...current, createLine()])}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter ligne
            </Button>
          </div>
          <div className="h-[340px] overflow-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr className="border-b">
                  <th className="w-16 px-3 py-3 font-semibold">N°</th>
                  <th className="min-w-[260px] px-3 py-3 font-semibold">Famille</th>
                  <th className="min-w-[260px] px-3 py-3 font-semibold">Compte réel</th>
                  <th className="min-w-[260px] px-3 py-3 font-semibold">Libellé ligne</th>
                  <th className="w-40 px-3 py-3 font-semibold text-right">Débit</th>
                  <th className="w-40 px-3 py-3 font-semibold text-right">Crédit</th>
                  <th className="w-16 px-3 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const account = accountById.get(line.accountId);
                  return (
                    <tr key={line.id} className="border-b align-top">
                      <td className="px-3 py-3 text-xs font-semibold text-muted-foreground">{index + 1}</td>
                      <td className="px-3 py-3">
                        {useFamilies ? (
                          <Select value={line.family} onValueChange={(value) => selectFamily(line.id, value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir une famille" />
                            </SelectTrigger>
                            <SelectContent>
                              {sortedFamilies.map((family) => (
                                <SelectItem key={family.family} value={family.family}>
                                  {family.label} ({family.family})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select value={line.accountId} onValueChange={(value) => updateLine(line.id, { accountId: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir le compte" />
                            </SelectTrigger>
                            <SelectContent>
                              {sortedAccounts.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.code} - {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="min-h-10 rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          {account ? `${account.code} - ${account.label}` : 'Compte non configuré'}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          value={line.description}
                          onChange={(event) => updateLine(line.id, { description: event.target.value })}
                          placeholder={form.label || 'Libellé'}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          min="0"
                          value={line.debit}
                          onChange={(event) => updateAmount(line.id, 'debit', event.target.value)}
                          className="text-right"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          min="0"
                          value={line.credit}
                          onChange={(event) => updateAmount(line.id, 'credit', event.target.value)}
                          className="text-right"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          disabled={lines.length <= 2}
                          onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                          aria-label="Supprimer la ligne"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 border-t bg-slate-50 px-4 py-3 text-sm md:grid-cols-4">
            <div className="rounded-md border bg-white px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Lignes</div>
              <div className="font-semibold">{normalizedLines.length}</div>
            </div>
            <div className="rounded-md border bg-white px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Débit</div>
              <div className="font-semibold text-green-600">{new Intl.NumberFormat('fr-FR').format(totalDebit)} F CFA</div>
            </div>
            <div className="rounded-md border bg-white px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Crédit</div>
              <div className="font-semibold text-red-600">{new Intl.NumberFormat('fr-FR').format(totalCredit)} F CFA</div>
            </div>
            <div className={`rounded-md border px-3 py-2 ${isBalanced ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <div className={`text-xs uppercase tracking-wide ${isBalanced ? 'text-emerald-700' : 'text-amber-700'}`}>Écart</div>
              <div className={`font-semibold ${isBalanced ? 'text-emerald-900' : 'text-amber-900'}`}>
                {new Intl.NumberFormat('fr-FR').format(Math.abs(totalDebit - totalCredit))} F CFA
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t bg-background pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !canSubmit}>
            Créer l&apos;écriture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
