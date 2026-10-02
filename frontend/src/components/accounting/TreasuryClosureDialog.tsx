'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { TreasuryAccount, TreasuryClosure } from '@/shared/api/billing';

type PeriodType = 'MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM';

interface TreasuryClosureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: TreasuryAccount[];
  isSubmitting?: boolean;
  onSubmit: (payload: {
    treasuryAccountId?: string | null;
    periodType: PeriodType;
    periodLabel?: string;
    periodStart: string;
    periodEnd: string;
    countedCash?: number;
    countedCheque?: number;
    countedCard?: number;
    countedOther?: number;
    ticketZ?: number;
    notes?: string;
    status?: TreasuryClosure['status'];
  }) => void | Promise<void>;
}

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const computePeriod = (periodType: PeriodType) => {
  const now = new Date();
  if (periodType === 'MONTH') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end, label: start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) };
  }
  if (periodType === 'QUARTER') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), quarterStartMonth, 1);
    const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59);
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return { start, end, label: `T${quarter} ${now.getFullYear()}` };
  }
  if (periodType === 'YEAR') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    return { start, end, label: `${now.getFullYear()}` };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end, label: 'Période personnalisée' };
};

export function TreasuryClosureDialog({
  open,
  onOpenChange,
  accounts,
  isSubmitting,
  onSubmit,
}: TreasuryClosureDialogProps) {
  const [periodType, setPeriodType] = useState<PeriodType>('MONTH');
  const defaultPeriod = useMemo(() => computePeriod(periodType), [periodType]);
  const [periodStart, setPeriodStart] = useState(() => formatDateInput(defaultPeriod.start));
  const [periodEnd, setPeriodEnd] = useState(() => formatDateInput(defaultPeriod.end));
  const [treasuryAccountId, setTreasuryAccountId] = useState<string>('');
  const [countedCash, setCountedCash] = useState('');
  const [countedCheque, setCountedCheque] = useState('');
  const [countedCard, setCountedCard] = useState('');
  const [countedOther, setCountedOther] = useState('');
  const [ticketZ, setTicketZ] = useState('');
  const [notes, setNotes] = useState('');

  const cashAccounts = accounts.filter((account) => account.type === 'CASH');

  const resetDates = (nextType: PeriodType) => {
    const computed = computePeriod(nextType);
    setPeriodStart(formatDateInput(computed.start));
    setPeriodEnd(formatDateInput(computed.end));
  };

  const handleSubmit = async () => {
    if (!treasuryAccountId || !periodStart || !periodEnd || periodStart > periodEnd) return;
    await onSubmit({
      treasuryAccountId,
      periodType,
      periodLabel: periodType === 'CUSTOM' ? 'Période personnalisée' : undefined,
      periodStart,
      periodEnd,
      countedCash: Number(countedCash || 0),
      countedCheque: Number(countedCheque || 0),
      countedCard: Number(countedCard || 0),
      countedOther: Number(countedOther || 0),
      ticketZ: Number(ticketZ || 0),
      notes,
      status: 'CLOSED',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Clôture de caisse</DialogTitle>
          <DialogDescription>Comptez cette caisse. Après validation comptable, aucune nouvelle écriture ne pourra être passée sur cette caisse pour cette période.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium mb-1">Compte de trésorerie</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={treasuryAccountId}
                onChange={(event) => setTreasuryAccountId(event.target.value)}
              >
                <option value="">Choisir une caisse</option>
                {cashAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Période</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={periodType}
                onChange={(event) => {
                  const nextType = event.target.value as PeriodType;
                  setPeriodType(nextType);
                  resetDates(nextType);
                }}
              >
                <option value="MONTH">Ce mois</option>
                <option value="QUARTER">Ce trimestre</option>
                <option value="YEAR">Cette année</option>
                <option value="CUSTOM">Personnalisé</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium mb-1">Début période</label>
              <Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Fin période</label>
              <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium mb-1">Espèces comptées</label>
              <Input type="number" min="0" step="0.01" value={countedCash} onChange={(event) => setCountedCash(event.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Chèques comptés</label>
              <Input type="number" min="0" step="0.01" value={countedCheque} onChange={(event) => setCountedCheque(event.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Carte bancaire</label>
              <Input type="number" min="0" step="0.01" value={countedCard} onChange={(event) => setCountedCard(event.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Autres moyens</label>
              <Input type="number" min="0" step="0.01" value={countedOther} onChange={(event) => setCountedOther(event.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium mb-1">Ticket Z / Solde théorique</label>
              <Input type="number" min="0" step="0.01" value={ticketZ} onChange={(event) => setTicketZ(event.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Notes</label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observations..." />
              <p className="mt-1 text-xs text-muted-foreground">Expliquez tout écart entre le montant compté et le solde théorique avant de demander la validation.</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !treasuryAccountId || !periodStart || !periodEnd || periodStart > periodEnd}>
              Enregistrer la clôture
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
