'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AccountingDateRangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRange?: {
    startDate?: string;
    endDate?: string;
  } | null;
  onApply: (payload: { startDate?: string; endDate?: string }) => void;
}

export function AccountingDateRangeDialog({
  open,
  onOpenChange,
  defaultRange,
  onApply,
}: AccountingDateRangeDialogProps) {
  const [startDate, setStartDate] = useState(defaultRange?.startDate || '');
  const [endDate, setEndDate] = useState(defaultRange?.endDate || '');

  useEffect(() => {
    if (open) {
      setStartDate(defaultRange?.startDate || '');
      setEndDate(defaultRange?.endDate || '');
    }
  }, [defaultRange?.endDate, defaultRange?.startDate, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Période personnalisée</DialogTitle>
          <DialogDescription>
            Choisissez une plage de dates précise pour filtrer la trésorerie ou les rapports.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="range-start">Date de début</Label>
            <Input id="range-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="range-end">Date de fin</Label>
            <Input id="range-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onApply({});
              onOpenChange(false);
            }}
          >
            Réinitialiser
          </Button>
          <Button
            onClick={() => {
              onApply({
                startDate: startDate || undefined,
                endDate: endDate || undefined,
              });
              onOpenChange(false);
            }}
          >
            Appliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
