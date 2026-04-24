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

const codeGuides: Array<{ match: (code: string) => boolean; text: string }> = [
  { match: (code) => code.startsWith('40'), text: 'Les comptes 40x concernent généralement les fournisseurs et autres tiers créditeurs. Exemple: 401 = Fournisseurs.' },
  { match: (code) => code.startsWith('41'), text: 'Les comptes 41x concernent généralement les clients et autres tiers débiteurs. Exemple: 411 = Clients.' },
  { match: (code) => code === '512', text: '512 correspond habituellement à la banque.' },
  { match: (code) => code === '531', text: '531 correspond habituellement à la caisse.' },
  { match: (code) => code.startsWith('6'), text: 'Les comptes 6xx sont en principe des charges.' },
  { match: (code) => code.startsWith('7'), text: 'Les comptes 7xx sont en principe des produits.' },
];

const getTypeWarning = (code: string, type: AccountType) => {
  if (code.startsWith('6') && type !== 'EXPENSE') return 'Un compte 6xx est normalement une charge.';
  if (code.startsWith('7') && type !== 'REVENUE') return 'Un compte 7xx est normalement un produit.';
  if (code === '512' && type !== 'ASSET') return 'Le compte 512 est normalement un compte d actif.';
  if (code === '531' && type !== 'ASSET') return 'Le compte 531 est normalement un compte d actif.';
  if (code === '401' && type !== 'LIABILITY') return 'Le compte 401 est normalement un compte fournisseur.';
  if (code === '411' && type !== 'ASSET') return 'Le compte 411 est normalement un compte client.';
  return null;
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
  const normalizedCode = form.code.trim();
  const codeGuide = codeGuides.find((guide) => guide.match(normalizedCode))?.text || null;
  const typeWarning = getTypeWarning(normalizedCode, form.type);

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
            {codeGuide && <p className="text-xs text-muted-foreground">{codeGuide}</p>}
            {typeWarning && <p className="text-xs text-amber-700">{typeWarning}</p>}
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

        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Utilisez de préférence des comptes détaillés plutôt qu un compte générique.
          Exemples utiles: `401` fournisseurs, `411` clients, `512` banque, `531` caisse, `6xx` charges, `7xx` produits.
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
