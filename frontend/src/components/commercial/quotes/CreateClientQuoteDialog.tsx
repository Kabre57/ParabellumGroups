'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { billingService } from '@/shared/api/billing';
import { useClients } from '@/hooks/useCrm';
import { useAuth } from '@/shared/hooks/useAuth';
import type { Client } from '@/shared/api/crm/types';

interface QuoteLineForm {
  description: string;
  categorie: string;
  quantite: string;
  prixUnitaire: string;
  tauxTVA: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY_LINE: QuoteLineForm = {
  description: '',
  categorie: '',
  quantite: '1',
  prixUnitaire: '0',
  tauxTVA: '18',
};

const buildDefaultValidityDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
};

export function CreateClientQuoteDialog({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState('');
  const [objet, setObjet] = useState('');
  const [dateValidite, setDateValidite] = useState(buildDefaultValidityDate());
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<QuoteLineForm[]>([{ ...EMPTY_LINE }]);

  const { data: clients = [] } = useClients({ pageSize: 200 }, { enabled: isOpen });

  const clientsArray: Client[] = Array.isArray(clients) ? clients : [];
  const serviceLabel = user?.service?.name || user?.department || '';

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof billingService.createQuote>[0]) => billingService.createQuote(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        const quantity = Number(line.quantite) || 0;
        const unitPrice = Number(line.prixUnitaire) || 0;
        const vatRate = Number(line.tauxTVA) || 0;
        const ht = quantity * unitPrice;
        const vat = ht * (vatRate / 100);
        acc.ht += ht;
        acc.tva += vat;
        acc.ttc += ht + vat;
        return acc;
      },
      { ht: 0, tva: 0, ttc: 0 }
    );
  }, [lines]);

  const formatCurrency = (amount: number) =>
    `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)} F CFA`;

  const updateLine = (index: number, patch: Partial<QuoteLineForm>) => {
    setLines((current) =>
      current.map((line, currentIndex) => (currentIndex === index ? { ...line, ...patch } : line))
    );
  };

  const resetForm = () => {
    setClientId('');
    setObjet('');
    setDateValidite(buildDefaultValidityDate());
    setNotes('');
    setLines([{ ...EMPTY_LINE }]);
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const lignes = lines
      .filter((line) => line.description.trim())
      .map((line) => ({
        description: line.description.trim(),
        quantity: Number(line.quantite) || 0,
        unitPrice: Number(line.prixUnitaire) || 0,
        vatRate: Number(line.tauxTVA) || 0,
      }))
      .filter((line) => line.description && line.quantity > 0);

    if (!clientId || !objet.trim() || !dateValidite || lignes.length === 0) {
      return;
    }

    await createMutation.mutateAsync({
      clientId,
      objet: objet.trim(),
      dateValidite,
      notes: notes.trim() || undefined,
      lignes,
    });

    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[92vh] max-w-7xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau devis client</DialogTitle>
          <DialogDescription>
            Le devis est créé par le service commercial, envoyé au client, puis transmis à la facturation après validation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {serviceLabel && (
            <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Ce devis sera émis au nom du service <strong>{serviceLabel}</strong>.
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client</label>
              <select
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sélectionner un client</option>
                {clientsArray.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium">Objet du devis</label>
              <Input value={objet} onChange={(event) => setObjet(event.target.value)} placeholder="Fourniture équipements / prestation / abonnement..." />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date de validité</label>
              <Input type="date" value={dateValidite} onChange={(event) => setDateValidite(event.target.value)} />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium">Notes internes / conditions commerciales</label>
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Remise, délai, conditions de règlement..." />
            </div>
          </div>

          <div className="rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-lg font-semibold">Lignes du devis</h3>
                <p className="text-sm text-muted-foreground">Saisissez librement les prestations, articles et libellés commerciaux destinés au client.</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une ligne
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full">
                <thead className="bg-muted/40">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="px-4 py-3">Ligne</th>
                    <th className="px-4 py-3">Désignation / prestation</th>
                    <th className="px-4 py-3">Catégorie</th>
                    <th className="px-4 py-3">Qté</th>
                    <th className="px-4 py-3">P.U. HT</th>
                    <th className="px-4 py-3">TVA %</th>
                    <th className="px-4 py-3">Total TTC</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => {
                    const quantity = Number(line.quantite) || 0;
                    const unitPrice = Number(line.prixUnitaire) || 0;
                    const vatRate = Number(line.tauxTVA) || 0;
                    const totalTtc = quantity * unitPrice * (1 + vatRate / 100);

                    return (
                      <tr key={`quote-line-${index}`} className="border-t border-border align-top">
                        <td className="px-4 py-3">
                          <div className="flex h-10 items-center text-sm font-medium text-muted-foreground">
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            value={line.description}
                            onChange={(event) => updateLine(index, { description: event.target.value })}
                            placeholder="Libellé libre pour le client"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            value={line.categorie}
                            onChange={(event) => updateLine(index, { categorie: event.target.value })}
                            placeholder="Produit, service, abonnement..."
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="1"
                            value={line.quantite}
                            onChange={(event) => updateLine(index, { quantite: event.target.value })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            value={line.prixUnitaire}
                            onChange={(event) => updateLine(index, { prixUnitaire: event.target.value })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            value={line.tauxTVA}
                            onChange={(event) => updateLine(index, { tauxTVA: event.target.value })}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(totalTtc)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setLines((current) => (current.length === 1 ? current : current.filter((_, currentIndex) => currentIndex !== index)))
                            }
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 border-t border-border bg-muted/20 px-4 py-4 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-background px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Total HT</div>
                <div className="mt-1 text-lg font-semibold">{formatCurrency(totals.ht)}</div>
              </div>
              <div className="rounded-lg border border-border bg-background px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">TVA</div>
                <div className="mt-1 text-lg font-semibold">{formatCurrency(totals.tva)}</div>
              </div>
              <div className="rounded-lg border border-border bg-background px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Total TTC</div>
                <div className="mt-1 text-lg font-semibold text-blue-700">{formatCurrency(totals.ttc)}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="text-sm text-muted-foreground">
              Le devis est enregistré en brouillon puis pourra être envoyé au client pour validation.
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={!clientId || !objet.trim() || createMutation.isPending}>
                {createMutation.isPending ? 'Enregistrement...' : 'Créer le devis'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
