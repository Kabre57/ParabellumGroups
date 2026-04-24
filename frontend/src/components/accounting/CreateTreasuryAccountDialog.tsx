'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TreasuryAccount } from '@/shared/api/billing';

interface CreateTreasuryAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    name: string;
    type: TreasuryAccount['type'];
    bankName?: string | null;
    accountNumber?: string | null;
    openingBalance?: number;
    currency?: string;
    isDefault?: boolean;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
}

type FormState = {
  name: string;
  type: TreasuryAccount['type'];
  bankName: string;
  accountNumber: string;
  openingBalance: string;
  currency: string;
  isDefault: boolean;
};

const defaultState: FormState = {
  name: '',
  type: 'BANK',
  bankName: '',
  accountNumber: '',
  openingBalance: '0',
  currency: 'XOF',
  isDefault: false,
};

export function CreateTreasuryAccountDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: CreateTreasuryAccountDialogProps) {
  const [form, setForm] = useState<FormState>(defaultState);

  useEffect(() => {
    if (open) {
      setForm(defaultState);
    }
  }, [open]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    await onSubmit({
      name: form.name.trim(),
      type: form.type,
      bankName: form.bankName.trim() || null,
      accountNumber: form.accountNumber.trim() || null,
      openingBalance: Number(form.openingBalance || 0),
      currency: form.currency.trim() || 'XOF',
      isDefault: form.isDefault,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nouveau compte de trésorerie</DialogTitle>
          <DialogDescription>
            Ajoutez une banque ou une sous-caisse pour suivre les soldes séparément.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Nom du compte</Label>
            <Input value={form.name} onChange={(event) => updateField('name', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(value) => updateField('type', value as FormState['type'])}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK">Banque</SelectItem>
                <SelectItem value="CASH">Caisse</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Monnaie</Label>
            <Input value={form.currency} onChange={(event) => updateField('currency', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Banque</Label>
            <Input
              value={form.bankName}
              onChange={(event) => updateField('bankName', event.target.value)}
              placeholder="ORABANK, SGCI..."
              disabled={form.type === 'CASH'}
            />
          </div>
          <div className="space-y-2">
            <Label>Numéro de compte</Label>
            <Input
              value={form.accountNumber}
              onChange={(event) => updateField('accountNumber', event.target.value)}
              placeholder="CI01 01002 ..."
              disabled={form.type === 'CASH'}
            />
          </div>
          <div className="space-y-2">
            <Label>Solde initial</Label>
            <Input
              type="number"
              value={form.openingBalance}
              onChange={(event) => updateField('openingBalance', event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              id="treasury-default"
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => updateField('isDefault', event.target.checked)}
            />
            <Label htmlFor="treasury-default">Compte par défaut pour ce type</Label>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !form.name.trim()}>
            Créer le compte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
