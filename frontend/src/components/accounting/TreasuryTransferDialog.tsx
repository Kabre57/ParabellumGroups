'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { TreasuryAccount } from '@/shared/api/billing';

const normalizeCurrency = (currency?: string | null) => {
  const normalized = String(currency || 'XOF').trim().toUpperCase().replace(/[\s._-]/g, '');
  return ['FCFA', 'CFA'].includes(normalized) ? 'XOF' : normalized;
};

interface TreasuryTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: TreasuryAccount[];
  isSubmitting?: boolean;
  onSubmit: (payload: {
    sourceTreasuryAccountId: string;
    destinationTreasuryAccountId: string;
    amount: number;
    date: string;
    reference: string;
    notes?: string;
  }) => void | Promise<void>;
}

export function TreasuryTransferDialog({ open, onOpenChange, accounts, isSubmitting, onSubmit }: TreasuryTransferDialogProps) {
  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const source = accounts.find((account) => account.id === sourceId);
  const destinations = useMemo(
    () => accounts.filter((account) => account.id !== sourceId && (!source || normalizeCurrency(account.currency) === normalizeCurrency(source.currency))),
    [accounts, source, sourceId]
  );

  const submit = async () => {
    if (!sourceId || !destinationId || Number(amount) <= 0 || !date || !reference.trim()) return;
    await onSubmit({
      sourceTreasuryAccountId: sourceId,
      destinationTreasuryAccountId: destinationId,
      amount: Number(amount),
      date: new Date(`${date}T12:00:00`).toISOString(),
      reference: reference.trim(),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Transfert interne</DialogTitle>
          <DialogDescription>Déplacez des fonds entre deux caisses. Le transfert ne crée ni charge ni produit.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">Caisse source
              <select className="w-full rounded-md border bg-background px-3 py-2 font-normal" value={sourceId} onChange={(event) => { setSourceId(event.target.value); setDestinationId(''); }}>
                <option value="">Choisir une caisse</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} — {account.type === 'CASH' ? 'Caisse' : 'Banque'}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium">Caisse destinataire
              <select className="w-full rounded-md border bg-background px-3 py-2 font-normal" value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>
                <option value="">Choisir une caisse</option>
                {destinations.map((account) => <option key={account.id} value={account.id}>{account.name} — {account.type === 'CASH' ? 'Caisse' : 'Banque'}</option>)}
              </select>
            </label>
          </div>
          {source && destinations.length === 0 && (
            <p className="text-sm text-amber-700">Aucune autre caisse n’utilise la même devise. Vérifiez la devise des comptes de trésorerie.</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">Montant ({source?.currency || 'XOF'})
              <Input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" />
            </label>
            <label className="space-y-1 text-sm font-medium">Date
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
          </div>
          <label className="block space-y-1 text-sm font-medium">Référence
            <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ex. TRANS-2026-001" maxLength={120} />
          </label>
          <label className="block space-y-1 text-sm font-medium">Notes (facultatif)
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
          </label>
          {source && <p className="text-xs text-muted-foreground">Solde disponible : {Number(source.balance ?? source.currentBalance).toLocaleString('fr-FR')} {source.currency}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="button" disabled={isSubmitting || !sourceId || !destinationId || Number(amount) <= 0 || !reference.trim()} onClick={submit}>Enregistrer le transfert</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
