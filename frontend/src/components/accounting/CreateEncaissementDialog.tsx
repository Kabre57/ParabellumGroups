'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import billingService, { type Encaissement } from '@/shared/api/billing';

interface CreateEncaissementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: Partial<Encaissement>) => Promise<void> | void;
  isSubmitting?: boolean;
}

type FormState = {
  clientName: string;
  description: string;
  amountHT: string;
  amountTVA: string;
  amountTTC: string;
  paymentMethod: 'CHEQUE' | 'ESPECES' | 'VIREMENT' | 'CARTE';
  treasuryAccountId: string;
  dateEncaissement: string;
  reference: string;
  notes: string;
};

const initialState: FormState = {
  clientName: '',
  description: 'Encaissement de fonds',
  amountHT: '0',
  amountTVA: '0',
  amountTTC: '0',
  paymentMethod: 'ESPECES',
  treasuryAccountId: '',
  dateEncaissement: new Date().toISOString().slice(0, 10),
  reference: '',
  notes: '',
};

export function CreateEncaissementDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: CreateEncaissementDialogProps) {
  const [form, setForm] = useState<FormState>(initialState);

  const { data: treasuryAccountsResponse } = useQuery({
    queryKey: ['treasury-accounts'],
    queryFn: () => billingService.getTreasuryAccounts(),
  });

  useEffect(() => {
    if (open) {
      setForm(initialState);
    }
  }, [open]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      
      // Auto-calcul TTC si HT/TVA changent
      if (key === 'amountHT' || key === 'amountTVA') {
        next.amountTTC = String(Number(next.amountHT || 0) + Number(next.amountTVA || 0));
      }
      
      return next;
    });
  };

  const handleSubmit = async () => {
    await onSubmit({
      clientName: form.clientName,
      description: form.description,
      amountHT: Number(form.amountHT),
      amountTVA: Number(form.amountTVA),
      amountTTC: Number(form.amountTTC),
      paymentMethod: form.paymentMethod,
      treasuryAccountId: form.treasuryAccountId || undefined,
      dateEncaissement: new Date(form.dateEncaissement).toISOString(),
      reference: form.reference || undefined,
      notes: form.notes || undefined,
    });
  };

  const treasuryAccounts = treasuryAccountsResponse?.data ?? [];
  const filteredAccounts = treasuryAccounts.filter((acc) => 
    form.paymentMethod === 'ESPECES' ? acc.type === 'CASH' : acc.type === 'BANK'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-emerald-700">Nouveau Bon d'Encaissement</DialogTitle>
          <DialogDescription>
            Enregistrez une entrée de fonds dans la trésorerie (Recette, Virement Interne, etc.)
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source / Client</Label>
              <Input 
                value={form.clientName} 
                onChange={(e) => updateField('clientName', e.target.value)}
                placeholder="Nom du client ou source"
              />
            </div>
            <div className="space-y-2">
              <Label>Date d'Encaissement</Label>
              <Input 
                type="date" 
                value={form.dateEncaissement} 
                onChange={(e) => updateField('dateEncaissement', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input 
              value={form.description} 
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Objet de l'encaissement"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mode de Règlement</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => updateField('paymentMethod', v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ESPECES">Espèces</SelectItem>
                  <SelectItem value="CHEQUE">Chèque</SelectItem>
                  <SelectItem value="VIREMENT">Virement</SelectItem>
                  <SelectItem value="CARTE">Carte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Compte de Trésorerie</Label>
              <Select value={form.treasuryAccountId} onValueChange={(v) => updateField('treasuryAccountId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un compte" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name} ({new Intl.NumberFormat('fr-FR').format(acc.currentBalance)} F)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 rounded-lg bg-slate-50 p-4 border border-slate-200">
            <div className="space-y-2">
              <Label>Montant HT</Label>
              <Input 
                type="number" 
                value={form.amountHT} 
                onChange={(e) => updateField('amountHT', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Montant TVA</Label>
              <Input 
                type="number" 
                value={form.amountTVA} 
                onChange={(e) => updateField('amountTVA', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-emerald-700 font-bold">Total TTC</Label>
              <Input 
                type="number" 
                value={form.amountTTC} 
                readOnly
                className="bg-emerald-50 border-emerald-200 text-emerald-900 font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Référence (N° Chèque / Virement)</Label>
            <Input 
              value={form.reference} 
              onChange={(e) => updateField('reference', e.target.value)}
              placeholder="Facultatif"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea 
              value={form.notes} 
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Commentaires additionnels..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Annuler</Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSubmit} 
            disabled={isSubmitting || !form.clientName || Number(form.amountTTC) <= 0 || !form.treasuryAccountId}
          >
            {isSubmitting ? 'Enregistrement...' : 'Valider l\'Encaissement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
