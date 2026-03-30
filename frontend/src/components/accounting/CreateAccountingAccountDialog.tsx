'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

interface CreateAccountingAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: {
    code?: string;
    label?: string;
    type?: AccountType;
    description?: string | null;
    openingBalance?: number | null;
  };
  title?: string;
  submitLabel?: string;
  onSubmit: (payload: {
    code: string;
    label: string;
    type: AccountType;
    description?: string;
    openingBalance?: number;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
}

const initialState: {
  code: string;
  label: string;
  type: AccountType;
  description: string;
  openingBalance: string;
} = {
  code: '',
  label: '',
  type: 'ASSET',
  description: '',
  openingBalance: '0',
};

export function CreateAccountingAccountDialog({
  open,
  onOpenChange,
  initialValues,
  title = 'Nouveau compte comptable',
  submitLabel = 'Créer le compte',
  onSubmit,
  isSubmitting = false,
}: CreateAccountingAccountDialogProps) {
  const [form, setForm] = useState(initialState);

  useEffect(() => {
    if (open) {
      if (initialValues) {
        setForm({
          code: initialValues.code || '',
          label: initialValues.label || '',
          type: initialValues.type || 'ASSET',
          description: initialValues.description || '',
          openingBalance: String(initialValues.openingBalance ?? 0),
        });
      } else {
        setForm(initialState);
      }
    }
  }, [initialValues, open]);

  const handleSubmit = async () => {
    await onSubmit({
      code: form.code.trim(),
      label: form.label.trim(),
      type: form.type,
      description: form.description.trim() || undefined,
      openingBalance: Number(form.openingBalance || 0),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Créez un compte du plan comptable pour structurer vos écritures et votre grand livre.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="account-code">Code</Label>
            <Input
              id="account-code"
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="512, 6011, 707..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-type">Type</Label>
            <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as AccountType }))}>
              <SelectTrigger id="account-type">
                <SelectValue placeholder="Choisir le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASSET">Actif</SelectItem>
                <SelectItem value="LIABILITY">Passif</SelectItem>
                <SelectItem value="EQUITY">Capitaux propres</SelectItem>
                <SelectItem value="REVENUE">Produit</SelectItem>
                <SelectItem value="EXPENSE">Charge</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="account-label">Libellé</Label>
            <Input
              id="account-label"
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              placeholder="Banque principale, Charges diverses..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-opening">Solde initial</Label>
            <Input
              id="account-opening"
              type="number"
              value={form.openingBalance}
              onChange={(event) => setForm((current) => ({ ...current, openingBalance: event.target.value }))}
              placeholder="0"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="account-description">Description</Label>
            <Textarea
              id="account-description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Précision comptable, usage du compte, rattachement OHADA..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !form.code.trim() || !form.label.trim()}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
