'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type PurchaseCommitment, type FactureFournisseur } from '@/shared/api/billing';

interface CreateFactureFournisseurDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitment: PurchaseCommitment;
  onSubmit: (payload: Partial<FactureFournisseur>) => Promise<void> | void;
  isSubmitting?: boolean;
}

type FormState = {
  numeroFacture: string;
  fournisseurNom: string;
  dateFacture: string;
  dateEcheance: string;
  amountHT: string;
  amountTVA: string;
  amountTTC: string;
  notes: string;
};

export function CreateFactureFournisseurDialog({
  open,
  onOpenChange,
  commitment,
  onSubmit,
  isSubmitting = false,
}: CreateFactureFournisseurDialogProps) {
  const [form, setForm] = useState<FormState>({
    numeroFacture: '',
    fournisseurNom: commitment?.supplierName || '',
    dateFacture: new Date().toISOString().slice(0, 10),
    dateEcheance: '',
    amountHT: String(commitment?.amountHT ?? 0),
    amountTVA: String(commitment?.amountTVA ?? 0),
    amountTTC: String(commitment?.amountTTC ?? 0),
    notes: '',
  });

  useEffect(() => {
    if (open && commitment) {
      setForm({
        numeroFacture: '',
        fournisseurNom: commitment.supplierName || '',
        dateFacture: new Date().toISOString().slice(0, 10),
        dateEcheance: '',
        amountHT: String(commitment.amountHT ?? 0),
        amountTVA: String(commitment.amountTVA ?? 0),
        amountTTC: String(commitment.amountTTC ?? 0),
        notes: '',
      });
    }
  }, [open, commitment]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'amountHT' || key === 'amountTVA') {
        next.amountTTC = String(Number(next.amountHT || 0) + Number(next.amountTVA || 0));
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    await onSubmit({
      numeroFacture: form.numeroFacture,
      fournisseurNom: form.fournisseurNom,
      dateFacture: new Date(form.dateFacture).toISOString(),
      dateEcheance: form.dateEcheance ? new Date(form.dateEcheance).toISOString() : undefined,
      montantHT: Number(form.amountHT),
      montantTVA: Number(form.amountTVA),
      montantTTC: Number(form.amountTTC),
      commitmentId: commitment.id,
      notes: form.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border-blue-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-800">Liquidation de l'Engagement</DialogTitle>
          <DialogDescription>
            Enregistrez la facture réelle liée au Bon de Commande {commitment.sourceNumber}.
            Si le montant diffère de l'engagement, une écriture de régularisation sera générée.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Numéro de Facture Fournisseur</Label>
              <Input 
                value={form.numeroFacture} 
                onChange={(e) => updateField('numeroFacture', e.target.value)}
                placeholder="Ex: FA-2026-001"
                className="border-blue-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Fournisseur</Label>
              <Input 
                value={form.fournisseurNom} 
                readOnly
                className="bg-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de la Facture</Label>
              <Input 
                type="date" 
                value={form.dateFacture} 
                onChange={(e) => updateField('dateFacture', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date d'Échéance</Label>
              <Input 
                type="date" 
                value={form.dateEcheance} 
                onChange={(e) => updateField('dateEcheance', e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
            <div className="text-sm font-medium text-blue-700 mb-3 uppercase tracking-wider">Montants Facturés (Liquidation)</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Montant HT</Label>
                <Input 
                  type="number" 
                  value={form.amountHT} 
                  onChange={(e) => updateField('amountHT', e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Montant TVA</Label>
                <Input 
                  type="number" 
                  value={form.amountTVA} 
                  onChange={(e) => updateField('amountTVA', e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-blue-800 font-bold">Total TTC</Label>
                <Input 
                  type="number" 
                  value={form.amountTTC} 
                  readOnly
                  className="bg-blue-100 border-blue-200 text-blue-950 font-bold text-lg"
                />
              </div>
            </div>
            
            {Number(form.amountTTC) !== commitment.amountTTC && (
              <div className="mt-3 text-xs text-amber-600 font-medium flex items-center gap-1">
                ⚠️ Écart détecté par rapport à l'engagement ({new Intl.NumberFormat('fr-FR').format(commitment.amountTTC)} F). 
                Une régularisation comptable sera effectuée.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes / Justifications</Label>
            <Textarea 
              value={form.notes} 
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Expliquez l'éventuel écart ou ajoutez des détails sur la prestation..."
            />
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Annuler</Button>
          <Button 
            className="bg-blue-700 hover:bg-blue-800 text-white"
            onClick={handleSubmit} 
            disabled={isSubmitting || !form.numeroFacture || Number(form.amountTTC) <= 0}
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer la Facture (Liquider)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
