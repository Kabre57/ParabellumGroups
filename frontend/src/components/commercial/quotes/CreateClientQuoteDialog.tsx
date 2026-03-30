'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { billingService } from '@/shared/api/billing';
import { useClients } from '@/hooks/useCrm';
import { useAuth } from '@/shared/hooks/useAuth';
import { adminServicesService, type Service } from '@/shared/api/admin/admin.service';
import { hasAnyPermission, isAdminRole } from '@/shared/permissions';
import type { Client } from '@/shared/api/crm/types';

interface QuoteLineForm {
  description: string;
  categorie: string;
  quantite: string;
  prixUnitaire: string;
  tauxTVA: string;
  imageUrl: string;
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
  imageUrl: '',
};

const buildDefaultValidityDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
};

export function CreateClientQuoteDialog({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userServiceId = String(user?.serviceId ?? user?.service?.id ?? '');
  const canChooseService =
    isAdminRole(user) || hasAnyPermission(user, ['services.read_all', 'services.read']);
  const [clientId, setClientId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(userServiceId);
  const [objet, setObjet] = useState('');
  const [dateValidite, setDateValidite] = useState(buildDefaultValidityDate());
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<QuoteLineForm[]>([{ ...EMPTY_LINE }]);

  const { data: clients = [] } = useClients({ pageSize: 200 }, { enabled: isOpen });
  const { data: servicesResponse } = useQuery({
    queryKey: ['commercial-quote-service-options'],
    queryFn: () => adminServicesService.getServices(),
    enabled: isOpen && (canChooseService || !userServiceId),
    staleTime: 5 * 60 * 1000,
  });

  const clientsArray: Client[] = Array.isArray(clients) ? clients : [];
  const services = servicesResponse?.data ?? [];
  const selectedService = services.find((service: Service) => String(service.id) === String(selectedServiceId));
  const serviceLabel =
    selectedService?.name ||
    user?.service?.name ||
    user?.department ||
    'Service commercial';

  useEffect(() => {
    if (!selectedServiceId && userServiceId) {
      setSelectedServiceId(userServiceId);
    }
  }, [selectedServiceId, userServiceId]);

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
    setSelectedServiceId(userServiceId);
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
        imageUrl: line.imageUrl?.trim() || undefined,
        quantity: Number(line.quantite) || 0,
        unitPrice: Number(line.prixUnitaire) || 0,
        vatRate: Number(line.tauxTVA) || 0,
      }))
      .filter((line) => line.description && line.quantity > 0);

    if (!clientId || !objet.trim() || !dateValidite || lignes.length === 0 || !(selectedServiceId || userServiceId)) {
      return;
    }

    await createMutation.mutateAsync({
      clientId,
      serviceId: selectedServiceId || userServiceId || undefined,
      serviceName: serviceLabel,
      commercialId: user?.id || undefined,
      commercialName: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
      commercialEmail: user?.email || undefined,
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
              <label className="text-sm font-medium">Service émetteur</label>
              {canChooseService || !userServiceId ? (
                <select
                  value={selectedServiceId}
                  onChange={(event) => setSelectedServiceId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Sélectionner un service</option>
                  {services.map((service: Service) => (
                    <option key={service.id} value={String(service.id)}>
                      {service.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input value={serviceLabel} readOnly />
              )}
            </div>

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

          <div className="rounded-2xl border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-lg font-semibold">Lignes du devis</h3>
                <p className="text-sm text-muted-foreground">Saisissez librement les prestations, articles et libellés commerciaux destinés au client.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                  {lines.length} ligne{lines.length > 1 ? 's' : ''}
                </div>
                <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une ligne
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1180px] w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                  <tr className="border-b">
                    <th className="w-14 px-4 py-3 font-semibold">Ligne</th>
                    <th className="w-24 px-4 py-3 font-semibold">Image</th>
                    <th className="min-w-[260px] px-4 py-3 font-semibold">Désignation / prestation</th>
                    <th className="min-w-[180px] px-4 py-3 font-semibold">Catégorie</th>
                    <th className="w-24 px-4 py-3 font-semibold">Qté</th>
                    <th className="w-32 px-4 py-3 font-semibold">P.U. HT</th>
                    <th className="w-24 px-4 py-3 font-semibold">TVA %</th>
                    <th className="w-32 px-4 py-3 font-semibold">Total TTC</th>
                    <th className="w-20 px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => {
                    const quantity = Number(line.quantite) || 0;
                    const unitPrice = Number(line.prixUnitaire) || 0;
                    const vatRate = Number(line.tauxTVA) || 0;
                    const totalTtc = quantity * unitPrice * (1 + vatRate / 100);

                    return (
                      <tr key={`quote-line-${index}`} className="border-b align-top">
                        <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {line.imageUrl ? (
                              <img
                                src={line.imageUrl}
                                alt={line.description || `Ligne ${index + 1}`}
                                className="h-12 w-12 rounded-md border object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted text-[10px] text-muted-foreground">
                                Sans image
                              </div>
                            )}
                            <Input
                              value={line.imageUrl}
                              onChange={(event) => updateLine(index, { imageUrl: event.target.value })}
                              placeholder="URL image"
                              className="h-12 text-sm"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            value={line.description}
                            onChange={(event) => updateLine(index, { description: event.target.value })}
                            placeholder="Libellé libre pour le client"
                            className="h-12 text-base"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            value={line.categorie}
                            onChange={(event) => updateLine(index, { categorie: event.target.value })}
                            placeholder="Produit, service, abonnement..."
                            className="h-12 text-base"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="1"
                            value={line.quantite}
                            onChange={(event) => updateLine(index, { quantite: event.target.value })}
                            className="h-12 text-lg font-medium"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            value={line.prixUnitaire}
                            onChange={(event) => updateLine(index, { prixUnitaire: event.target.value })}
                            className="h-12 text-lg font-medium"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            value={line.tauxTVA}
                            onChange={(event) => updateLine(index, { tauxTVA: event.target.value })}
                            className="h-12 text-lg font-medium"
                          />
                        </td>
                        <td className="px-4 py-3 text-base font-semibold whitespace-nowrap">{formatCurrency(totalTtc)}</td>
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
              <Button
                type="submit"
                disabled={!clientId || !objet.trim() || !(selectedServiceId || userServiceId) || createMutation.isPending}
              >
                {createMutation.isPending ? 'Enregistrement...' : 'Créer le devis'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
