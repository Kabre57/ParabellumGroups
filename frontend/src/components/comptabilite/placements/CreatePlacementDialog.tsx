'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { validateCreatePlacement } from '@/utils/comptabilite/placements/validators';
import type { CreatePlacementPayload } from '@/types/comptabilite/placements';

interface CreatePlacementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePlacementPayload) => void;
  isPending: boolean;
}

const DEFAULT_FORM: CreatePlacementPayload = {
  name: '',
  issuer: '',
  type: 'ACTION',
  quantity: 1,
  purchasePrice: 0,
  purchaseDate: new Date().toISOString().split('T')[0],
  currency: 'XOF',
  notes: '',
};

export function CreatePlacementDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreatePlacementDialogProps) {
  const [form, setForm] = useState<CreatePlacementPayload>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof CreatePlacementPayload, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateCreatePlacement(form);
    if (err) { setError(err); return; }
    setError(null);
    onSubmit(form);
  };

  const handleClose = (v: boolean) => {
    if (!v) { setForm(DEFAULT_FORM); setError(null); }
    onOpenChange(v);
  };

  const totalCost = (form.quantity || 0) * (form.purchasePrice || 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enregistrer un nouveau placement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Désignation */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="cp-name">Désignation du placement</Label>
              <Input
                id="cp-name"
                placeholder="ex: Actions Sonatel, Titre Foncier..."
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
            </div>
            {/* Émetteur */}
            <div className="space-y-2">
              <Label htmlFor="cp-issuer">Émetteur / Institution</Label>
              <Input
                id="cp-issuer"
                placeholder="ex: BRVM, État du Sénégal"
                value={form.issuer}
                onChange={(e) => update('issuer', e.target.value)}
              />
            </div>
            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="cp-type">Type d&apos;actif</Label>
              <Select value={form.type} onValueChange={(v) => update('type', v)}>
                <SelectTrigger id="cp-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTION">Action</SelectItem>
                  <SelectItem value="OBLIGATION">Obligation</SelectItem>
                  <SelectItem value="TCN">TCN (Titres Créances Négociables)</SelectItem>
                  <SelectItem value="IMMOBILIER">Immobilier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Quantité */}
            <div className="space-y-2">
              <Label htmlFor="cp-quantity">Quantité / Parts</Label>
              <Input
                id="cp-quantity"
                type="number"
                step="any"
                min="0"
                placeholder="1"
                value={form.quantity || ''}
                onChange={(e) => update('quantity', parseFloat(e.target.value))}
                required
              />
            </div>
            {/* Prix */}
            <div className="space-y-2">
              <Label htmlFor="cp-price">Prix d&apos;acquisition (unitaire)</Label>
              <Input
                id="cp-price"
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={form.purchasePrice || ''}
                onChange={(e) => update('purchasePrice', parseFloat(e.target.value))}
                required
              />
            </div>
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="cp-date">Date d&apos;acquisition</Label>
              <Input
                id="cp-date"
                type="date"
                value={form.purchaseDate}
                onChange={(e) => update('purchaseDate', e.target.value)}
                required
              />
            </div>
            {/* Devise */}
            <div className="space-y-2">
              <Label htmlFor="cp-currency">Devise</Label>
              <Input
                id="cp-currency"
                value={form.currency}
                onChange={(e) => update('currency', e.target.value)}
                placeholder="XOF"
              />
            </div>
            {/* Notes */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="cp-notes">Notes &amp; observations</Label>
              <Input
                id="cp-notes"
                placeholder="Détails du placement..."
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
              />
            </div>
          </div>

          {/* Coût total calculé */}
          {totalCost > 0 && (
            <div className="rounded-md bg-muted/50 border px-4 py-2 text-sm text-muted-foreground flex justify-between">
              <span>Coût total estimé :</span>
              <span className="font-bold text-foreground">
                {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(totalCost)} {form.currency}
              </span>
            </div>
          )}

          {/* Erreur de validation */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Création en cours...' : 'Créer le placement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
