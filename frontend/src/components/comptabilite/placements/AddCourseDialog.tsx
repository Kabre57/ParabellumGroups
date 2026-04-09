'use client';

import { useState } from 'react';
import { DollarSign, Calendar, AlertCircle } from 'lucide-react';
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
import { formatCurrency } from '@/utils/comptabilite/placements/formatters';
import type { Placement } from '@/shared/api/billing';

interface AddCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placement: Placement | null;
  onSubmit: (id: string, value: number, atDate: string) => void;
  isPending: boolean;
}

export function AddCourseDialog({
  open,
  onOpenChange,
  placement,
  onSubmit,
  isPending,
}: AddCourseDialogProps) {
  const [value, setValue] = useState('');
  const [atDate, setAtDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = () => {
    if (!placement || !value) return;
    onSubmit(placement.id, parseFloat(value), atDate);
    setValue('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setValue('');
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Saisie manuelle du cours — {placement?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="courseValue">
              Valeur du cours ({placement?.currency || 'XOF'})
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="courseValue"
                type="number"
                placeholder="0.00"
                className="pl-9"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="courseDate">Date du cours</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="courseDate"
                type="date"
                className="pl-9"
                value={atDate}
                onChange={(e) => setAtDate(e.target.value)}
              />
            </div>
          </div>
          {placement && (
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground flex gap-2 items-start">
              <AlertCircle className="h-4 w-4 text-blue-500 shrink-0" />
              <p>
                Prix d&apos;acquisition initial :{' '}
                <strong>{formatCurrency(placement.purchasePrice)}</strong>. La valorisation sera
                recalculée à la validation.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !value}>
            {isPending ? 'Enregistrement...' : 'Mettre à jour'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
