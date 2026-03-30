'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface RejectPurchaseRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
  requestNumber?: string;
  title?: string;
  description?: string;
  defaultReason?: string;
}

export function RejectPurchaseRequestDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
  requestNumber,
  title = 'Rejeter le devis interne',
  description = 'Precisez le motif pour que le demandeur puisse corriger et soumettre a nouveau.',
  defaultReason = 'Merci de completer le fournisseur, les lignes ou les montants avant nouvelle soumission.',
}: RejectPurchaseRequestDialogProps) {
  const [reason, setReason] = useState(defaultReason);

  useEffect(() => {
    if (open) {
      setReason(defaultReason);
    }
  }, [defaultReason, open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleConfirm = () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) return;
    onConfirm(trimmedReason);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {requestNumber ? `Document ${requestNumber}. ` : ''}
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="purchase-reject-reason">
            Motif du rejet
          </label>
          <Textarea
            id="purchase-reject-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Expliquez ce qui doit etre corrige"
            rows={4}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || !reason.trim()}
          >
            {isPending ? 'Rejet...' : 'Confirmer le rejet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
