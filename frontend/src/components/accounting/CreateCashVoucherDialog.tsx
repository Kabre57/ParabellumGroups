'use client';

import { useEffect, useState } from 'react';
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
import type { CashVoucher, PurchaseCommitment } from '@/shared/api/billing';

interface CreateCashVoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCommitment?: PurchaseCommitment | null;
  onSubmit: (payload: {
    sourceType?: string;
    sourceId?: string;
    sourceNumber?: string;
    expenseCategory?: string;
    serviceId?: number | null;
    serviceName?: string | null;
    supplierId?: string | null;
    supplierName?: string | null;
    beneficiaryName: string;
    beneficiaryPhone?: string;
    description: string;
    amountHT?: number;
    amountTVA?: number;
    amountTTC: number;
    paymentMethod: 'CHEQUE' | 'ESPECES';
    issueDate?: string;
    reference?: string;
    notes?: string;
    status?: CashVoucher['status'];
  }) => Promise<void> | void;
  isSubmitting?: boolean;
}

type FormState = {
  sourceType: string;
  sourceId: string;
  sourceNumber: string;
  expenseCategory: string;
  serviceId: string;
  serviceName: string;
  supplierId: string;
  supplierName: string;
  beneficiaryName: string;
  beneficiaryPhone: string;
  description: string;
  amountHT: string;
  amountTVA: string;
  amountTTC: string;
  paymentMethod: 'CHEQUE' | 'ESPECES';
  issueDate: string;
  reference: string;
  notes: string;
  status: CashVoucher['status'];
};

const buildInitialState = (commitment?: PurchaseCommitment | null): FormState => ({
  sourceType: commitment?.sourceType || 'OTHER',
  sourceId: commitment?.sourceId || '',
  sourceNumber: commitment?.sourceNumber || '',
  expenseCategory:
    commitment?.sourceType === 'PURCHASE_ORDER'
      ? 'Commande fournisseur'
      : commitment?.sourceType === 'PURCHASE_QUOTE'
      ? 'Demande d achat validée'
      : 'Dépense diverse',
  serviceId: commitment?.serviceId != null ? String(commitment.serviceId) : '',
  serviceName: commitment?.serviceName || '',
  supplierId: commitment?.supplierId || '',
  supplierName: commitment?.supplierName || '',
  beneficiaryName: commitment?.supplierName || '',
  beneficiaryPhone: '',
  description:
    commitment?.sourceNumber
      ? `Décaissement lié à ${commitment.sourceNumber}`
      : 'Décaissement de caisse',
  amountHT: String(commitment?.amountHT ?? 0),
  amountTVA: String(commitment?.amountTVA ?? 0),
  amountTTC: String(commitment?.amountTTC ?? 0),
  paymentMethod: 'CHEQUE',
  issueDate: new Date().toISOString().slice(0, 10),
  reference: '',
  notes: '',
  status: 'EN_ATTENTE',
});

export function CreateCashVoucherDialog({
  open,
  onOpenChange,
  defaultCommitment,
  onSubmit,
  isSubmitting = false,
}: CreateCashVoucherDialogProps) {
  const [form, setForm] = useState<FormState>(buildInitialState(defaultCommitment));

  useEffect(() => {
    if (open) {
      setForm(buildInitialState(defaultCommitment));
    }
  }, [defaultCommitment, open]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const amountHT = Number(form.amountHT || 0);
  const amountTVA = Number(form.amountTVA || 0);
  const amountTTC = Number(form.amountTTC || 0);

  const handleSubmit = async () => {
    await onSubmit({
      sourceType: form.sourceType || undefined,
      sourceId: form.sourceId || undefined,
      sourceNumber: form.sourceNumber || undefined,
      expenseCategory: form.expenseCategory || undefined,
      serviceId: form.serviceId ? Number(form.serviceId) : null,
      serviceName: form.serviceName || null,
      supplierId: form.supplierId || null,
      supplierName: form.supplierName || null,
      beneficiaryName: form.beneficiaryName,
      beneficiaryPhone: form.beneficiaryPhone || undefined,
      description: form.description,
      amountHT: Number(form.amountHT || 0),
      amountTVA: Number(form.amountTVA || 0),
      amountTTC: Number(form.amountTTC || 0),
      paymentMethod: form.paymentMethod,
      issueDate: form.issueDate || undefined,
      reference: form.reference || undefined,
      notes: form.notes || undefined,
      status: form.status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[92vh] w-[min(98vw,1600px)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Créer un bon de caisse</DialogTitle>
          <DialogDescription>
            Présentation compacte type ERP pour saisir un décaissement sans empiler un long formulaire.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto pr-2">
          <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Origine</Label>
                <Select value={form.sourceType} onValueChange={(value) => updateField('sourceType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir l'origine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PURCHASE_ORDER">Bon de commande</SelectItem>
                    <SelectItem value="PURCHASE_QUOTE">Devis interne validé</SelectItem>
                    <SelectItem value="SUPPLIER_INVOICE">Facture fournisseur</SelectItem>
                    <SelectItem value="EXPENSE">Dépense diverse</SelectItem>
                    <SelectItem value="OTHER">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mode de décaissement</Label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(value) => updateField('paymentMethod', value as FormState['paymentMethod'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHEQUE">Chèque</SelectItem>
                    <SelectItem value="ESPECES">Espèces</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Référence source</Label>
                <Input
                  value={form.sourceNumber}
                  onChange={(event) => updateField('sourceNumber', event.target.value)}
                  placeholder="BCA-202603-0001 / Facture..."
                />
              </div>
              <div className="space-y-2">
                <Label>Catégorie comptable</Label>
                <Input
                  value={form.expenseCategory}
                  onChange={(event) => updateField('expenseCategory', event.target.value)}
                  placeholder="Achats, frais généraux..."
                />
              </div>
              <div className="space-y-2">
                <Label>Bénéficiaire</Label>
                <Input
                  value={form.beneficiaryName}
                  onChange={(event) => updateField('beneficiaryName', event.target.value)}
                  placeholder="Fournisseur ou bénéficiaire"
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone bénéficiaire</Label>
                <Input
                  value={form.beneficiaryPhone}
                  onChange={(event) => updateField('beneficiaryPhone', event.target.value)}
                  placeholder="Numéro de téléphone"
                />
              </div>
              <div className="space-y-2">
                <Label>Service imputé</Label>
                <Input
                  value={form.serviceName}
                  onChange={(event) => updateField('serviceName', event.target.value)}
                  placeholder="Direction Technique, Achat..."
                />
              </div>
              <div className="space-y-2">
                <Label>Fournisseur</Label>
                <Input
                  value={form.supplierName}
                  onChange={(event) => updateField('supplierName', event.target.value)}
                  placeholder="Nom du fournisseur"
                />
              </div>
              <div className="space-y-2">
                <Label>Date d'émission</Label>
                <Input type="date" value={form.issueDate} onChange={(event) => updateField('issueDate', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Statut initial</Label>
                <Select value={form.status} onValueChange={(value) => updateField('status', value as CashVoucher['status'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BROUILLON">Brouillon</SelectItem>
                    <SelectItem value="EN_ATTENTE">En attente</SelectItem>
                    <SelectItem value="VALIDE">Validé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-4">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  placeholder="Objet du décaissement"
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Référence paiement</Label>
                <Input
                  value={form.reference}
                  onChange={(event) => updateField('reference', event.target.value)}
                  placeholder="Numéro de chèque, pièce..."
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label>Notes comptables</Label>
                <Textarea
                  value={form.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                  placeholder="Observations comptables, justification, pièces..."
                  className="min-h-[60px]"
                />
              </div>
          </div>

          <div className="mt-4 flex min-h-0 flex-col overflow-hidden rounded-xl border bg-background">
            <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-2 text-sm">
              <div className="font-medium">Lignes du décaissement</div>
              <div className="text-xs text-muted-foreground">Lecture immédiate sans zoom</div>
            </div>
            <div className="h-[320px] overflow-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                  <tr className="border-b">
                    <th className="w-20 px-3 py-3 font-semibold">Ligne</th>
                    <th className="min-w-[240px] px-3 py-3 font-semibold">Rubrique</th>
                    <th className="min-w-[360px] px-3 py-3 font-semibold">Description</th>
                    <th className="w-44 px-3 py-3 font-semibold text-right">Montant</th>
                    <th className="w-24 px-3 py-3 font-semibold">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-3 py-3 text-xs font-semibold text-muted-foreground">1</td>
                    <td className="px-3 py-3">{form.expenseCategory || 'Dépense'}</td>
                    <td className="px-3 py-3">{form.description || 'Sans description'}</td>
                    <td className="px-3 py-3 text-right">
                      <Input
                        type="number"
                        value={form.amountHT}
                        onChange={(event) => updateField('amountHT', event.target.value)}
                        className="h-11 text-base font-medium"
                      />
                    </td>
                    <td className="px-3 py-3">{form.paymentMethod}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-3 py-3 text-xs font-semibold text-muted-foreground">2</td>
                    <td className="px-3 py-3">TVA</td>
                    <td className="px-3 py-3">Taxe appliquée sur le décaissement</td>
                    <td className="px-3 py-3 text-right">
                      <Input
                        type="number"
                        value={form.amountTVA}
                        onChange={(event) => updateField('amountTVA', event.target.value)}
                        className="h-11 text-base font-medium"
                      />
                    </td>
                    <td className="px-3 py-3">-</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-3 text-xs font-semibold text-muted-foreground">3</td>
                    <td className="px-3 py-3 font-medium">Total TTC</td>
                    <td className="px-3 py-3">Montant total à décaisser</td>
                    <td className="px-3 py-3 text-right">
                      <Input
                        type="number"
                        value={form.amountTTC}
                        onChange={(event) => updateField('amountTTC', event.target.value)}
                        className="h-11 text-base font-medium"
                      />
                    </td>
                    <td className="px-3 py-3">{form.paymentMethod}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 border-t bg-slate-50 px-4 py-3 text-sm md:grid-cols-4">
              <div className="rounded-md border bg-white px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">HT</div>
                <div className="font-semibold">{new Intl.NumberFormat('fr-FR').format(amountHT)} F CFA</div>
              </div>
              <div className="rounded-md border bg-white px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">TVA</div>
                <div className="font-semibold">{new Intl.NumberFormat('fr-FR').format(amountTVA)} F CFA</div>
              </div>
              <div className="rounded-md border bg-blue-50 px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-blue-700">Total TTC</div>
                <div className="font-semibold text-blue-900">{new Intl.NumberFormat('fr-FR').format(amountTTC)} F CFA</div>
              </div>
              <div className="rounded-md border bg-white px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Décaissement</div>
                <div className="font-semibold">{form.paymentMethod === 'CHEQUE' ? 'Chèque' : 'Espèces'}</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t bg-background pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !form.beneficiaryName || !form.description || Number(form.amountTTC || 0) <= 0}>
            {isSubmitting ? 'Enregistrement...' : 'Créer le bon de caisse'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
