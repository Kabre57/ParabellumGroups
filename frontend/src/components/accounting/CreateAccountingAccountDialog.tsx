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
  mode?: 'create' | 'edit';
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
    type?: AccountType;
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
  { match: (code) => code.startsWith('40') || code.startsWith('48'), text: 'Les comptes 40x ou 48x peuvent correspondre aux fournisseurs et autres tiers créditeurs selon votre plan comptable.' },
  { match: (code) => code.startsWith('41'), text: 'Les comptes 41x correspondent généralement aux clients et autres tiers débiteurs.' },
  { match: (code) => code.startsWith('52') || code.startsWith('51'), text: 'Les comptes 51x ou 52x sont souvent utilisés pour les banques et assimilés selon votre plan comptable.' },
  { match: (code) => code.startsWith('57') || code.startsWith('53'), text: 'Les comptes 57x ou 53x sont souvent utilisés pour la caisse selon votre plan comptable.' },
  { match: (code) => code.startsWith('6'), text: 'Les comptes 6xx sont en principe des charges.' },
  { match: (code) => code.startsWith('7'), text: 'Les comptes 7xx sont en principe des produits.' },
];

const getTypeWarning = (code: string, type: AccountType) => {
  if (code.startsWith('6') && type !== 'EXPENSE') return 'Un compte 6xx est normalement une charge.';
  if (code.startsWith('7') && type !== 'REVENUE') return 'Un compte 7xx est normalement un produit.';
  if ((code.startsWith('52') || code.startsWith('51') || code.startsWith('57') || code.startsWith('53')) && type !== 'ASSET') {
    return 'Ce compte de trésorerie est normalement un compte d actif.';
  }
  if ((code.startsWith('40') || code.startsWith('48')) && type !== 'LIABILITY') return 'Ce compte fournisseur / tiers créditeur est normalement un passif.';
  if (code === '411' && type !== 'ASSET') return 'Le compte 411 est normalement un compte client.';
  return null;
};

export function CreateAccountingAccountDialog({
  open,
  onOpenChange,
  mode = 'create',
  initialValues,
  title = 'Nouveau compte comptable',
  submitLabel = 'Créer le compte',
  onSubmit,
  isSubmitting = false,
}: CreateAccountingAccountDialogProps) {
  const isEditing = mode === 'edit';
  const [form, setForm] = useState(initialState);
  const normalizedCode = form.code.trim();
  const codeGuide = isEditing ? codeGuides.find((guide) => guide.match(normalizedCode))?.text || null : null;
  const typeWarning = isEditing ? getTypeWarning(normalizedCode, form.type) : null;

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
      description: form.description.trim() || undefined,
      ...(isEditing ? {
        type: form.type,
        openingBalance: Number(form.openingBalance || 0),
      } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifiez les informations du compte comptable.'
              : 'Renseignez le code, le libellé et éventuellement une description.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className={isEditing ? 'space-y-2' : 'space-y-2 md:col-span-2'}>
            <Label htmlFor="account-code">Code</Label>
            <Input
              id="account-code"
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="571188, 6011, 707..."
            />
            {codeGuide && <p className="text-xs text-muted-foreground">{codeGuide}</p>}
            {typeWarning && <p className="text-xs text-amber-700">{typeWarning}</p>}
          </div>

          {isEditing && <div className="space-y-2">
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
          </div>}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="account-label">Libellé</Label>
            <Input
              id="account-label"
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              placeholder="Banque principale, Charges diverses..."
            />
          </div>

          {isEditing && <div className="space-y-2">
            <Label htmlFor="account-opening">Solde initial</Label>
            <Input
              id="account-opening"
              type="number"
              value={form.openingBalance}
              onChange={(event) => setForm((current) => ({ ...current, openingBalance: event.target.value }))}
              placeholder="0"
            />
          </div>}

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
          {isEditing
            ? 'Les informations historiques d’un compte déjà utilisé dans des écritures sont protégées.'
            : 'Le type est déterminé automatiquement. Le solde du nouveau compte est alimenté par les écritures comptables.'}
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
