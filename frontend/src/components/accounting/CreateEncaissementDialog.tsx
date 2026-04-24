'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { enterpriseApi } from '@/lib/api';
import { useAuth } from '@/shared/hooks/useAuth';
import { hasAnyPermission, isAdminRole } from '@/shared/permissions';
import { getAccessibleEnterprises } from '@/shared/enterpriseScope';

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
  enterpriseId: string;
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
  enterpriseId: '',
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
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(initialState);
  const [accountingAccountId, setAccountingAccountId] = useState<string>('');
  const userEnterpriseId = String(user?.enterpriseId ?? user?.enterprise?.id ?? '');
  const canChooseEnterprise = isAdminRole(user) || hasAnyPermission(user, ['enterprises.read', 'enterprises.manage_logo']);

  const { data: treasuryAccountsResponse } = useQuery({
    queryKey: ['treasury-accounts'],
    queryFn: () => billingService.getTreasuryAccounts(),
  });

  const { data: accountingAccountsResponse } = useQuery({
    queryKey: ['accounting-accounts'],
    queryFn: () => billingService.getAccountingAccounts(),
  });

  const { data: enterprisesResponse } = useQuery({
    queryKey: ['accounting-enterprises'],
    queryFn: () => enterpriseApi.getAll({ limit: 100, isActive: true }),
    enabled: open && (canChooseEnterprise || !userEnterpriseId),
  });

  const enterprises = useMemo(
    () => getAccessibleEnterprises(enterprisesResponse?.data ?? [], user?.enterpriseId),
    [enterprisesResponse?.data, user?.enterpriseId]
  );

  const selectedEnterprise = useMemo(
    () => enterprises.find((enterprise: any) => String(enterprise.id) === form.enterpriseId),
    [enterprises, form.enterpriseId]
  );

  useEffect(() => {
    if (open) {
      setForm({
        ...initialState,
        enterpriseId: userEnterpriseId,
      });
      setAccountingAccountId('');
    }
  }, [open, userEnterpriseId]);

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
      clientName: form.clientName,
      description: form.description,
      amountHT: Number(form.amountHT),
      amountTVA: Number(form.amountTVA),
      amountTTC: Number(form.amountTTC),
      paymentMethod: form.paymentMethod,
      treasuryAccountId: form.treasuryAccountId || undefined,
      enterpriseId: form.enterpriseId ? Number(form.enterpriseId) : undefined,
      enterpriseName: selectedEnterprise?.name || user?.enterprise?.name || undefined,
      dateEncaissement: new Date(form.dateEncaissement).toISOString(),
      reference: form.reference || undefined,
      notes: form.notes || undefined,
      accountingAccountId: accountingAccountId || undefined,
    });
  };

  const treasuryAccounts = treasuryAccountsResponse?.data ?? [];
  const accountingAccounts = (accountingAccountsResponse?.data ?? []).filter((acc: any) => {
    const normalizedType = String(acc?.type || '').toLowerCase();
    const normalizedCode = String(acc?.code || '');
    return normalizedType === 'revenue' || normalizedCode.startsWith('7');
  });
  const filteredAccounts = treasuryAccounts.filter((acc) =>
    form.paymentMethod === 'ESPECES' ? acc.type === 'CASH' : acc.type === 'BANK'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-emerald-700">Nouveau Bon d&apos;Encaissement</DialogTitle>
          <DialogDescription>
            Enregistrez une entree de fonds dans la tresorerie.
          </DialogDescription>
        </DialogHeader>

        {(selectedEnterprise?.name || user?.enterprise?.name) && (
          <div className="rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Ce bon sera emis au nom de l&apos;entreprise <strong>{selectedEnterprise?.name || user?.enterprise?.name}</strong>.
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
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
              <Label>Entreprise / Entite</Label>
              {canChooseEnterprise || !userEnterpriseId ? (
                <Select value={form.enterpriseId} onValueChange={(v) => updateField('enterpriseId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner l'entreprise" />
                  </SelectTrigger>
                  <SelectContent>
                    {enterprises.map((enterprise: any) => (
                      <SelectItem key={enterprise.id} value={String(enterprise.id)}>
                        {enterprise.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={user?.enterprise?.name || ''} readOnly />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date d&apos;encaissement</Label>
              <Input
                type="date"
                value={form.dateEncaissement}
                onChange={(e) => updateField('dateEncaissement', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reference (N° cheque / virement)</Label>
              <Input
                value={form.reference}
                onChange={(e) => updateField('reference', e.target.value)}
                placeholder="Facultatif"
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
              <Label>Mode de reglement</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => updateField('paymentMethod', v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ESPECES">Especes</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="VIREMENT">Virement</SelectItem>
                  <SelectItem value="CARTE">Carte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Compte de tresorerie</Label>
              <Select value={form.treasuryAccountId} onValueChange={(v) => updateField('treasuryAccountId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un compte" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({new Intl.NumberFormat('fr-FR').format(acc.currentBalance)} F)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-2">
              <Label>Montant HT</Label>
              <Input type="number" value={form.amountHT} onChange={(e) => updateField('amountHT', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Montant TVA</Label>
              <Input type="number" value={form.amountTVA} onChange={(e) => updateField('amountTVA', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-emerald-700">Total TTC</Label>
              <Input
                type="number"
                value={form.amountTTC}
                readOnly
                className="border-emerald-200 bg-emerald-50 font-bold text-emerald-900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imputation comptable (compte de produit)</Label>
            <Select value={accountingAccountId} onValueChange={setAccountingAccountId}>
              <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
                <SelectValue placeholder="Selectionner le compte de produit" />
              </SelectTrigger>
              <SelectContent>
                {accountingAccounts.length === 0 ? (
                  <SelectItem value="__no-revenue-account__" disabled>
                    Aucun compte de produit disponible
                  </SelectItem>
                ) : (
                  accountingAccounts.map((acc: any) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.code} - {acc.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !form.clientName ||
              Number(form.amountTTC) <= 0 ||
              !form.treasuryAccountId ||
              !accountingAccountId ||
              !form.enterpriseId
            }
          >
            {isSubmitting ? 'Enregistrement...' : "Valider l'encaissement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
