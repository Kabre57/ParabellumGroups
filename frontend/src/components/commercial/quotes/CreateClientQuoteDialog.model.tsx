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

// État, chargement et actions du parcours d'interface.


export interface QuoteLineForm {
  articleId?: string;
  description: string;
  categorie: string;
  quantite: string;
  prixUnitaire: string;
  tauxTVA: string;
  imageUrl: string;
}



export interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialQuote?: Quote | null;
}



export interface PartyPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: any[];
  prospects: any[];
  onSelect: (value: string) => void;
}



export const EMPTY_LINE: QuoteLineForm = {
  articleId: '',
  description: '',
  categorie: '',
  quantite: '1',
  prixUnitaire: '0',
  tauxTVA: '18',
  imageUrl: '',
};



export const buildDefaultValidityDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
};



export const parseEnterpriseId = (value: string): number | undefined => {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};



export function PartyPickerDialog({ open, onOpenChange, clients, prospects, onSelect }: PartyPickerDialogProps) {
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

export function useCreateClientQuoteDialogModel(__componentProps1: Props) {
  const { isOpen, onClose, initialQuote = null } = __componentProps1;


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
  return {
    user,
    queryClient,
    userEnterpriseId,
    clientId,
    setClientId,
    prospectId,
    setProspectId,
    enterpriseId,
    setEnterpriseId,
    objet,
    setObjet,
    dateValidite,
    setDateValidite,
    notes,
    setNotes,
    modeLivraison,
    setModeLivraison,
    modalitePaiement,
    setModalitePaiement,
    lines,
    setLines,
    uploadingIndex,
    setUploadingIndex,
    partyPickerOpen,
    setPartyPickerOpen,
    createClientOpen,
    setCreateClientOpen,
    articlePickerLineIndex,
    setArticlePickerLineIndex,
    articleCreateLineIndex,
    setArticleCreateLineIndex,
    isEdit,
    clients,
    prospects,
    enterprisesResponse,
    articlesResponse,
    clientsArray,
    prospectsArray,
    articles,
    accessibleEnterprises,
    createMutation,
    updateMutation,
    totals,
    formatCurrency,
    updateLine,
    applyArticleToLine,
    resetForm,
    handleClose,
    handleSubmit,
    handlePartyChange,
    selectedPartyValue,
  };
}
