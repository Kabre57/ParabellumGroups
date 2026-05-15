'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { List, Plus, Trash2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { billingService, type Quote } from '@/shared/api/billing';
import { commercialService } from '@/shared/api/commercial';
import { inventoryService } from '@/shared/api/inventory/inventory.service';
import type { InventoryArticle } from '@/shared/api/inventory/types';
import { useClients } from '@/hooks/useCrm';
import { useAuth } from '@/shared/hooks/useAuth';
import { enterpriseApi } from '@/lib/api';
import { getAccessibleEnterprises } from '@/shared/enterpriseScope';
import CustomerForm from '@/components/customers/CustomerForm';
import { ArticlePickerDialog } from '@/components/inventory/ArticlePickerDialog';
import { QuickCreateArticleDialog } from '@/components/inventory/QuickCreateArticleDialog';

interface QuoteLineForm {
  articleId?: string;
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
  initialQuote?: Quote | null;
}

interface PartyPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: any[];
  prospects: any[];
  onSelect: (value: string) => void;
}

const EMPTY_LINE: QuoteLineForm = {
  articleId: '',
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

const parseEnterpriseId = (value: string): number | undefined => {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

function PartyPickerDialog({ open, onOpenChange, clients, prospects, onSelect }: PartyPickerDialogProps) {
  const [search, setSearch] = useState('');
  const filteredClients = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return clients;
    return clients.filter((client) =>
      [client.nom, client.raisonSociale, client.reference, client.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [clients, search]);
  const filteredProspects = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return prospects;
    return prospects.filter((prospect) =>
      [prospect.companyName, prospect.contactName, prospect.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [prospects, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Choisir dans la liste complete</DialogTitle>
          <DialogDescription>Sélectionnez un client CRM ou un prospect commercial sans quitter le devis.</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un client ou un prospect..."
          />

          <div className="grid min-h-0 gap-4 lg:grid-cols-2">
            <div className="min-h-0 overflow-auto rounded-xl border">
              <div className="border-b px-4 py-3 text-sm font-semibold">Clients</div>
              <div className="divide-y">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
                    onClick={() => {
                      onSelect(`client:${client.id}`);
                      onOpenChange(false);
                    }}
                  >
                    <div>
                      <div className="font-medium">{client.nom || client.raisonSociale || 'Client'}</div>
                      <div className="text-xs text-muted-foreground">{client.email || client.reference || '-'}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">Client</span>
                  </button>
                ))}
                {filteredClients.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">Aucun client trouvé.</div>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 overflow-auto rounded-xl border">
              <div className="border-b px-4 py-3 text-sm font-semibold">Prospects</div>
              <div className="divide-y">
                {filteredProspects.map((prospect) => (
                  <button
                    key={prospect.id}
                    type="button"
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
                    onClick={() => {
                      onSelect(`prospect:${prospect.id}`);
                      onOpenChange(false);
                    }}
                  >
                    <div>
                      <div className="font-medium">{prospect.companyName || prospect.contactName || 'Prospect'}</div>
                      <div className="text-xs text-muted-foreground">{prospect.email || '-'}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">Prospect</span>
                  </button>
                ))}
                {filteredProspects.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">Aucun prospect trouvé.</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CreateClientQuoteDialog({ isOpen, onClose, initialQuote = null }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userEnterpriseId = String(user?.enterpriseId ?? user?.enterprise?.id ?? '');
  const [clientId, setClientId] = useState('');
  const [prospectId, setProspectId] = useState('');
  const [enterpriseId, setEnterpriseId] = useState(userEnterpriseId);
  const [objet, setObjet] = useState('');
  const [dateValidite, setDateValidite] = useState(buildDefaultValidityDate());
  const [notes, setNotes] = useState('');
  const [modeLivraison, setModeLivraison] = useState('');
  const [modalitePaiement, setModalitePaiement] = useState('');
  const [lines, setLines] = useState<QuoteLineForm[]>([{ ...EMPTY_LINE }]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [partyPickerOpen, setPartyPickerOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [articlePickerLineIndex, setArticlePickerLineIndex] = useState<number | null>(null);
  const [articleCreateLineIndex, setArticleCreateLineIndex] = useState<number | null>(null);

  const isEdit = Boolean(initialQuote?.id);

  const { data: clients = [] } = useClients({ pageSize: 200 }, { enabled: isOpen });
  const { data: prospects = [] } = useQuery({
    queryKey: ['commercial-quote-prospects'],
    queryFn: () => commercialService.getProspects({ limit: 200 }),
    enabled: isOpen,
    staleTime: 3 * 60 * 1000,
  });
  const { data: enterprisesResponse } = useQuery({
    queryKey: ['commercial-quote-enterprises'],
    queryFn: () => enterpriseApi.getAll({ limit: 200, isActive: true }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });
  const { data: articlesResponse } = useQuery({
    queryKey: ['inventory-articles-for-commercial-quotes'],
    queryFn: () => inventoryService.getArticles(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const clientsArray: any[] = Array.isArray(clients) ? clients : [];
  const prospectsArray: any[] = Array.isArray(prospects) ? prospects : [];
  const articles: InventoryArticle[] = Array.isArray((articlesResponse as any)?.data)
    ? (articlesResponse as any).data
    : Array.isArray(articlesResponse)
      ? (articlesResponse as InventoryArticle[])
      : [];
  const accessibleEnterprises = useMemo(
    () => getAccessibleEnterprises(enterprisesResponse?.data ?? [], user?.enterpriseId),
    [enterprisesResponse?.data, user?.enterpriseId]
  );

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof billingService.createQuote>[0]) => billingService.createQuote(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof billingService.updateQuote>[1]) =>
      billingService.updateQuote(initialQuote?.id || '', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      if (initialQuote?.id) {
        queryClient.invalidateQueries({ queryKey: ['commercial-quote', initialQuote.id] });
      }
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

  const applyArticleToLine = (index: number, article: InventoryArticle) => {
    updateLine(index, {
      articleId: article.id,
      description: article.nom || '',
      categorie: article.categorie || '',
      prixUnitaire: String(Number(article.prixVente ?? article.prixAchat ?? 0)),
      imageUrl: article.imageUrl || '',
    });
  };

  const resetForm = () => {
    setClientId('');
    setProspectId('');
    setEnterpriseId(userEnterpriseId);
    setObjet('');
    setDateValidite(buildDefaultValidityDate());
    setNotes('');
    setModeLivraison('');
    setModalitePaiement('');
    setLines([{ ...EMPTY_LINE }]);
    setPartyPickerOpen(false);
    setCreateClientOpen(false);
    setArticlePickerLineIndex(null);
    setArticleCreateLineIndex(null);
  };

  const handleClose = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    if (!initialQuote) {
      resetForm();
      return;
    }

    setClientId(initialQuote.clientId || '');
    setProspectId(initialQuote.prospectId || '');
    setEnterpriseId(initialQuote.enterpriseId ? String(initialQuote.enterpriseId) : userEnterpriseId);
    setObjet(initialQuote.objet || '');
    setDateValidite(initialQuote.dateValidite?.split('T')[0] || buildDefaultValidityDate());
    setNotes(initialQuote.notes || '');
    setModeLivraison(initialQuote.modeLivraison || '');
    setModalitePaiement(initialQuote.modalitePaiement || '');
    const mappedLines = (initialQuote.lignes || []).map((line) => ({
      articleId: '',
      description: line.description || '',
      categorie: '',
      quantite: String(line.quantity ?? line.quantite ?? 1),
      prixUnitaire: String(line.unitPrice ?? line.prixUnitaire ?? 0),
      tauxTVA: String(line.vatRate ?? line.tauxTVA ?? 0),
      imageUrl: line.imageUrl || '',
    }));
    setLines(mappedLines.length ? mappedLines : [{ ...EMPTY_LINE }]);
  }, [isOpen, initialQuote, userEnterpriseId]);

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

    const selectedProspect = prospectsArray.find((item) => item.id === prospectId);
    if (prospectId && !selectedProspect?.email) {
      toast.error('Le prospect doit avoir un email pour créer un devis.');
      return;
    }

    if ((!clientId && !prospectId) || !enterpriseId || !objet.trim() || !dateValidite || lignes.length === 0) {
      return;
    }

    const payload = {
      clientId: clientId || undefined,
      prospectId: prospectId || undefined,
      enterpriseId: parseEnterpriseId(enterpriseId),
      commercialId: user?.id || undefined,
      commercialName: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
      commercialEmail: user?.email || undefined,
      objet: objet.trim(),
      dateValidite,
      notes: notes.trim() || undefined,
      modeLivraison: modeLivraison.trim() || undefined,
      modalitePaiement: modalitePaiement.trim() || undefined,
      lignes,
    };

    if (isEdit && initialQuote?.id) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }

    handleClose();
  };

  const handlePartyChange = (value: string) => {
    if (!value) {
      setClientId('');
      setProspectId('');
      return;
    }
    if (value.startsWith('client:')) {
      setClientId(value.replace('client:', ''));
      setProspectId('');
      return;
    }
    if (value.startsWith('prospect:')) {
      setProspectId(value.replace('prospect:', ''));
      setClientId('');
    }
  };

  const selectedPartyValue = clientId ? `client:${clientId}` : prospectId ? `prospect:${prospectId}` : '';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-h-[92vh] max-w-7xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Modifier le devis client' : 'Nouveau devis client'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Révisez le devis suite aux échanges client puis enregistrez la nouvelle version.'
                : 'Le devis est créé par le service commercial, envoyé au client, puis transmis à la facturation après validation.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Entreprise</label>
                <select
                  value={enterpriseId}
                  onChange={(event) => setEnterpriseId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">
                    {accessibleEnterprises.length > 0
                      ? 'Sélectionner une entreprise'
                      : 'Aucune entreprise disponible'}
                  </option>
                  {accessibleEnterprises.map((enterprise) => (
                    <option key={String(enterprise.id)} value={String(enterprise.id)}>
                      {enterprise.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Client / prospect</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setPartyPickerOpen(true)}
                    title="Choisir dans la liste complète"
                    aria-label="Choisir dans la liste complète"
                    className="h-10 w-10 shrink-0"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCreateClientOpen(true)}
                    title="Créer un client"
                    aria-label="Créer un client"
                    className="h-10 w-10 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <select
                    value={selectedPartyValue}
                    onChange={(event) => handlePartyChange(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Sélectionner un client ou prospect</option>
                    <optgroup label="Clients">
                      {clientsArray.map((client) => (
                        <option key={client.id} value={`client:${client.id}`}>
                          {client.nom || client.raisonSociale || client.reference || 'Client'}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Prospects">
                      {prospectsArray.map((prospect) => (
                        <option key={prospect.id} value={`prospect:${prospect.id}`}>
                          {prospect.companyName || prospect.contactName || 'Prospect'}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">Objet du devis</label>
                <Input value={objet} onChange={(event) => setObjet(event.target.value)} placeholder="Fourniture équipements / prestation / abonnement..." />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date de validité</label>
                <Input type="date" value={dateValidite} onChange={(event) => setDateValidite(event.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mode de livraison</label>
                <Input
                  value={modeLivraison}
                  onChange={(event) => setModeLivraison(event.target.value)}
                  placeholder="Livraison sur site, retrait, transporteur..."
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">Modalité de paiement</label>
                <Input
                  value={modalitePaiement}
                  onChange={(event) => setModalitePaiement(event.target.value)}
                  placeholder="50% à la commande, 50% à la livraison"
                />
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
                      <th className="min-w-[320px] px-4 py-3 font-semibold">Désignation / prestation</th>
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
                            <label className="inline-flex items-center gap-3">
                              {line.imageUrl ? (
                                <img
                                  src={line.imageUrl?.replace('http://minio:9000', 'https://parabellum-erp.online/storage')}
                                  alt={line.description || `Ligne ${index + 1}`}
                                  className="h-12 w-12 rounded-md border object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted text-[10px] text-muted-foreground">
                                  <UploadCloud className="h-4 w-4" />
                                </div>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingIndex !== null}
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (!file) return;
                                  setUploadingIndex(index);
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    updateLine(index, { imageUrl: String(reader.result || '') });
                                    toast.success('Image téléchargée avec succès');
                                    setUploadingIndex(null);
                                    event.target.value = '';
                                  };
                                  reader.onerror = () => {
                                    toast.error('Erreur lors de la lecture de l\'image');
                                    setUploadingIndex(null);
                                    event.target.value = '';
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setArticlePickerLineIndex(index)}
                                title="Choisir dans la liste complète"
                                aria-label="Choisir dans la liste complète"
                                className="h-12 w-12 shrink-0"
                              >
                                <List className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setArticleCreateLineIndex(index)}
                                title="Nouveau produit"
                                aria-label="Nouveau produit"
                                className="h-12 w-12 shrink-0"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Input
                                value={line.description}
                                onChange={(event) => updateLine(index, { description: event.target.value })}
                                placeholder="Libellé libre pour le client"
                                className="h-12 text-base"
                              />
                            </div>
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
                  disabled={
                    (!clientId && !prospectId) ||
                    !enterpriseId ||
                    !objet.trim() ||
                    createMutation.isPending ||
                    updateMutation.isPending
                  }
                >
                  {isEdit
                    ? updateMutation.isPending
                      ? 'Enregistrement...'
                      : 'Mettre à jour'
                    : createMutation.isPending
                      ? 'Création...'
                      : 'Créer le devis'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PartyPickerDialog
        open={partyPickerOpen}
        onOpenChange={setPartyPickerOpen}
        clients={clientsArray}
        prospects={prospectsArray}
        onSelect={handlePartyChange}
      />

      <Dialog open={createClientOpen} onOpenChange={setCreateClientOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
            <DialogDescription>Créez le client puis sélectionnez-le dans le devis.</DialogDescription>
          </DialogHeader>
          <CustomerForm
            onSuccess={() => {
              setCreateClientOpen(false);
              queryClient.invalidateQueries({ queryKey: ['crm', 'clients'] });
            }}
            onCancel={() => setCreateClientOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ArticlePickerDialog
        open={articlePickerLineIndex !== null}
        onOpenChange={(open) => {
          if (!open) setArticlePickerLineIndex(null);
        }}
        articles={articles}
        onSelect={(article) => {
          if (articlePickerLineIndex === null) return;
          applyArticleToLine(articlePickerLineIndex, article);
          setArticlePickerLineIndex(null);
        }}
        title="Choisir dans la liste complete"
        description="Sélectionnez un produit du catalogue pour préremplir la ligne du devis client."
      />

      <QuickCreateArticleDialog
        open={articleCreateLineIndex !== null}
        onOpenChange={(open) => {
          if (!open) setArticleCreateLineIndex(null);
        }}
        onCreated={(article) => {
          if (articleCreateLineIndex === null) return;
          applyArticleToLine(articleCreateLineIndex, article);
          setArticleCreateLineIndex(null);
        }}
      />
    </>
  );
}

export default CreateClientQuoteDialog;
