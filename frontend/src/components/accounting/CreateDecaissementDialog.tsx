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
import billingService, { type Decaissement, type PurchaseCommitment } from '@/shared/api/billing';
import adminService from '@/shared/api/admin/admin.service';

interface CreateDecaissementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCommitment?: PurchaseCommitment | null;
  onSubmit: (payload: Partial<Decaissement>) => Promise<void> | void;
  isSubmitting?: boolean;
}

type FormState = {
  beneficiaryName: string;
  description: string;
  amountHT: string;
  amountTVA: string;
  amountTTC: string;
  paymentMethod: 'CHEQUE' | 'ESPECES' | 'VIREMENT' | 'CARTE';
  treasuryAccountId: string;
  serviceId: string;
  dateDecaissement: string;
  reference: string;
  notes: string;
  commitmentId: string;
};

const buildInitialState = (commitment?: PurchaseCommitment | null): FormState => ({
  beneficiaryName: commitment?.supplierName || '',
  description: commitment?.sourceNumber 
    ? `Règlement lié à ${commitment.sourceNumber}` 
    : 'Décaissement de fonds',
  amountHT: String(commitment?.amountHT ?? 0),
  amountTVA: String(commitment?.amountTVA ?? 0),
  amountTTC: String(commitment?.amountTTC ?? 0),
  paymentMethod: 'CHEQUE',
  treasuryAccountId: '',
  serviceId: commitment?.serviceId ? String(commitment.serviceId) : '',
  dateDecaissement: new Date().toISOString().slice(0, 10),
  reference: '',
  notes: '',
  commitmentId: commitment?.id || '',
});

export function CreateDecaissementDialog({
  open,
  onOpenChange,
  defaultCommitment,
  onSubmit,
  isSubmitting = false,
}: CreateDecaissementDialogProps) {
  const [form, setForm] = useState<FormState>(buildInitialState(defaultCommitment));
  const [accountingAccountId, setAccountingAccountId] = useState<string>('');

  const { data: treasuryAccountsResponse } = useQuery({
    queryKey: ['treasury-accounts'],
    queryFn: () => billingService.getTreasuryAccounts(),
  });

  const { data: accountingAccountsResponse } = useQuery({
    queryKey: ['accounting-accounts'],
    queryFn: () => billingService.getAccountingAccounts(),
  });

  const { data: servicesResponse } = useQuery({
    queryKey: ['admin-services'],
    queryFn: () => adminService.services.getServices(),
  });

  useEffect(() => {
    if (open) {
      setForm(buildInitialState(defaultCommitment));
    }
  }, [open, defaultCommitment]);

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
    const selectedService = servicesResponse?.data?.find(s => String(s.id) === form.serviceId);

    await onSubmit({
      beneficiaryName: form.beneficiaryName,
      description: form.description,
      amountHT: Number(form.amountHT),
      amountTVA: Number(form.amountTVA),
      amountTTC: Number(form.amountTTC),
      paymentMethod: form.paymentMethod,
      treasuryAccountId: form.treasuryAccountId || undefined,
      serviceId: form.serviceId ? Number(form.serviceId) : undefined,
      serviceName: selectedService?.name || undefined,
      dateDecaissement: new Date(form.dateDecaissement).toISOString(),
      reference: form.reference || undefined,
      notes: form.notes || undefined,
      commitmentId: form.commitmentId || undefined,
      accountingAccountId: accountingAccountId || undefined, // Nouveau champ
    });
  };

  const treasuryAccounts = treasuryAccountsResponse?.data ?? [];
  const accountingAccounts = (accountingAccountsResponse?.data ?? []).filter((acc: any) => 
    acc.type === 'EXPENSE' || acc.code.startsWith('6')
  );
  const filteredAccounts = treasuryAccounts.filter((acc) => 
    form.paymentMethod === 'ESPECES' ? acc.type === 'CASH' : acc.type === 'BANK'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border-rose-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-rose-700 font-serif">Nouveau Bon de Décaissement</DialogTitle>
          <DialogDescription>
            Enregistrez une sortie de fonds (Règlement fournisseur, Salaires, Menues dépenses, etc.)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bénéficiaire</Label>
              <Input 
                value={form.beneficiaryName} 
                onChange={(e) => updateField('beneficiaryName', e.target.value)}
                placeholder="Fournisseur ou personne"
              />
            </div>
            <div className="space-y-2">
              <Label>Service / Entité</Label>
              <Select value={form.serviceId} onValueChange={(v) => updateField('serviceId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner l'entité" />
                </SelectTrigger>
                <SelectContent>
                  {servicesResponse?.data?.map(service => (
                    <SelectItem key={service.id} value={String(service.id)}>{service.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de Paiement</Label>
              <Input 
                type="date" 
                value={form.dateDecaissement} 
                onChange={(e) => updateField('dateDecaissement', e.target.value)}
              />
            </div>
            <div className="space-y-2">
               <Label>N° Pièce / Référence</Label>
               <Input 
                 value={form.reference} 
                 onChange={(e) => updateField('reference', e.target.value)}
                 placeholder="Chèque n°, Virement n°"
               />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input 
              value={form.description} 
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Objet de la dépense"
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
                  <SelectItem value="CHEQUE">Chèque</SelectItem>
                  <SelectItem value="VIREMENT">Virement</SelectItem>
                  <SelectItem value="ESPECES">Espèces</SelectItem>
                  <SelectItem value="CARTE">Carte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Compte à Débiter</Label>
              <Select value={form.treasuryAccountId} onValueChange={(v) => updateField('treasuryAccountId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le compte source" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name} ({new Intl.NumberFormat('fr-FR').format(acc.currentBalance)} F)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 rounded-lg bg-rose-50 p-4 border border-rose-100 shadow-sm">
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
              <Label className="text-rose-700 font-bold">Total TTC</Label>
              <Input 
                type="number" 
                value={form.amountTTC} 
                readOnly
                className="bg-white border-rose-200 text-rose-900 font-bold text-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
               <Label>N° Pièce / Référence</Label>
               <Input 
                 value={form.reference} 
                 onChange={(e) => updateField('reference', e.target.value)}
                 placeholder="Chèque n°, Virement n°"
               />
            </div>
            <div className="space-y-2">
               <Label>ID Engagement (Facultatif)</Label>
               <Input 
                 value={form.commitmentId} 
                 readOnly
                 placeholder="Lié automatiquement via BC"
                 className="bg-slate-50 text-slate-500"
               />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imputation Comptable (Compte de Charge)</Label>
            <Select value={accountingAccountId} onValueChange={setAccountingAccountId}>
              <SelectTrigger className="border-rose-200 focus:ring-rose-500">
                <SelectValue placeholder="Sélectionner le compte de dépense" />
              </SelectTrigger>
              <SelectContent>
                {accountingAccounts.map((acc: any) => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes Comptables</Label>
            <Textarea 
              value={form.notes} 
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Justifications additionnelles..."
            />
          </div>
        </div>

        <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-4 rounded-b-lg border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Annuler</Button>
          <Button 
            className="bg-rose-600 hover:bg-rose-700 text-white"
            onClick={handleSubmit} 
            disabled={isSubmitting || !form.beneficiaryName || Number(form.amountTTC) <= 0 || !form.treasuryAccountId}
          >
            {isSubmitting ? 'Enregistrement...' : 'Confirmer le Décaissement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
