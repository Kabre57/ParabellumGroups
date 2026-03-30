'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FileDown, FileText, Search, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { billingService, type Quote } from '@/shared/api/billing';
import { useClients } from '@/hooks/useCrm';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import { CreateClientQuoteDialog } from './CreateClientQuoteDialog';

interface Props {
  showBillingHint?: boolean;
}

const formatCurrency = (amount: number) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0)} F CFA`;

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export function QuotesWorkspace({ showBillingHint = false }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);

  const { canCreate, canDelete, canUpdate, canExport, canApprove } = getCrudVisibility(user, {
    read: ['quotes.read', 'quotes.read_all', 'quotes.read_own'],
    create: ['quotes.create'],
    update: ['quotes.update', 'quotes.approve'],
    approve: ['quotes.approve', 'quotes.convert', 'invoices.create'],
    remove: ['quotes.delete'],
    export: ['quotes.export', 'quotes.print'],
  });

  const quotesQuery = useQuery({
    queryKey: ['commercial-quotes'],
    queryFn: () => billingService.getQuotes({ limit: 300 }),
  });

  const { data: clients = [] } = useClients({ pageSize: 300 }, { enabled: true });

  const deleteMutation = useMutation({
    mutationFn: (quoteId: string) => billingService.deleteQuote(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: (quoteId: string) => billingService.sendQuote(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const clientMap = useMemo(() => {
    const list = Array.isArray(clients) ? clients : [];
    return new Map(list.map((client: any) => [client.id, client]));
  }, [clients]);

  const quotes = useMemo(() => {
    return (quotesQuery.data?.data || []).map((quote) => ({
      ...quote,
      clientDisplayName: clientMap.get(quote.clientId)?.nom || quote.clientId,
    }));
  }, [quotesQuery.data, clientMap]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((quote) => {
      const text = search.trim().toLowerCase();
      const matchText =
        !text ||
        quote.numeroDevis?.toLowerCase().includes(text) ||
        quote.objet?.toLowerCase().includes(text) ||
        quote.clientDisplayName?.toLowerCase().includes(text) ||
        quote.serviceName?.toLowerCase().includes(text);

      const matchStatus = statusFilter === 'all' || quote.status === statusFilter;
      return matchText && matchStatus;
    });
  }, [quotes, search, statusFilter]);

  const totalValue = filteredQuotes.reduce((sum, quote) => sum + (quote.montantTTC || 0), 0);
  const sentCount = filteredQuotes.filter((quote) => quote.status === 'ENVOYE').length;
  const approvedCount = filteredQuotes.filter((quote) =>
    ['ACCEPTE', 'TRANSMIS_FACTURATION', 'FACTURE'].includes(quote.status)
  ).length;
  const invoicedCount = filteredQuotes.filter((quote) => quote.status === 'FACTURE').length;

  const handleDelete = (quote: Quote) => {
    setQuoteToDelete(quote);
  };

  const handleSend = async (quote: Quote) => {
    const response = await sendMutation.mutateAsync(quote.id);
    const link = response.data?.approvalUrl;
    if (link && navigator?.clipboard) {
      await navigator.clipboard.writeText(link);
      toast.success('Devis envoyé au client. Le lien de validation a été copié.');
    } else {
      toast.success('Devis envoyé au client.');
    }
  };

  const confirmDelete = async () => {
    if (!quoteToDelete) return;
    try {
      await deleteMutation.mutateAsync(quoteToDelete.id);
      toast.success(`Devis ${quoteToDelete.numeroDevis} supprimé.`);
      setQuoteToDelete(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Suppression impossible.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Devis clients</h1>
          <p className="mt-2 text-muted-foreground">
            Gérez vos devis clients et leurs informations, de la préparation commerciale jusqu’à la facture.
          </p>
          {showBillingHint && (
            <p className="mt-2 text-sm text-blue-700">
              Cette vue sert de passerelle entre le service commercial, la facturation et la comptabilité.
            </p>
          )}
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Nouveau devis
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total devis</div>
            <div className="mt-2 text-3xl font-bold">{filteredQuotes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Envoyés client</div>
            <div className="mt-2 text-3xl font-bold">{sentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Validés client</div>
            <div className="mt-2 text-3xl font-bold">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Montant piloté</div>
            <div className="mt-2 text-3xl font-bold">{formatCurrency(totalValue)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{invoicedCount} devis déjà facturés</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des devis</CardTitle>
          <CardDescription>Rechercher, consulter, relancer et transmettre à la facturation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher par numéro, objet, client ou service..."
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="BROUILLON">Brouillon</option>
              <option value="ENVOYE">Envoyé client</option>
              <option value="MODIFICATION_DEMANDEE">Modification demandée</option>
              <option value="ACCEPTE">Validé client</option>
              <option value="REFUSE">Refusé</option>
              <option value="TRANSMIS_FACTURATION">Transmis facturation</option>
              <option value="FACTURE">Facturé</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            {quotesQuery.isLoading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <table className="w-full min-w-[1100px]">
                <thead className="bg-muted/40 text-left text-sm text-muted-foreground">
                  <tr>
                    <th className="px-5 py-4">Numéro</th>
                    <th className="px-5 py-4">Objet</th>
                    <th className="px-5 py-4">Client</th>
                    <th className="px-5 py-4">Service</th>
                    <th className="px-5 py-4">Montant TTC</th>
                    <th className="px-5 py-4">Statut</th>
                    <th className="px-5 py-4">Validité</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map((quote) => (
                    <tr key={quote.id} className="border-t border-border align-top">
                      <td className="px-5 py-4">
                        <div className="font-semibold">{quote.numeroDevis}</div>
                        <div className="text-sm text-muted-foreground">V{quote.revisionNumber || 1}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium">{quote.objet || 'Devis client'}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">{quote.notes || 'Sans note'}</div>
                      </td>
                      <td className="px-5 py-4">{quote.clientDisplayName}</td>
                      <td className="px-5 py-4">{quote.serviceName || '-'}</td>
                      <td className="px-5 py-4 font-semibold">{formatCurrency(quote.montantTTC)}</td>
                      <td className="px-5 py-4">
                        <QuoteStatusBadge status={quote.status} />
                      </td>
                      <td className="px-5 py-4">{formatDate(quote.dateValidite)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/commercial/quotes/${quote.id}`}>
                              Voir
                            </Link>
                          </Button>
                          {canUpdate && ['BROUILLON', 'MODIFICATION_DEMANDEE', 'REFUSE'].includes(quote.status) && (
                            <Button variant="outline" size="sm" onClick={() => void handleSend(quote)} disabled={sendMutation.isPending}>
                              <Send className="mr-1 h-4 w-4" />
                              Envoyer
                            </Button>
                          )}
                          {canExport && (
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/dashboard/commercial/quotes/${quote.id}`}>
                                <FileDown className="mr-1 h-4 w-4" />
                                Ouvrir
                              </Link>
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(quote)} disabled={deleteMutation.isPending}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      <CreateClientQuoteDialog isOpen={createOpen} onClose={() => setCreateOpen(false)} />

      <Dialog open={Boolean(quoteToDelete)} onOpenChange={(open) => !open && setQuoteToDelete(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Supprimer le devis</DialogTitle>
            <DialogDescription>
              {quoteToDelete
                ? `Le devis ${quoteToDelete.numeroDevis} sera supprimé définitivement.`
                : 'Confirmez la suppression du devis.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteToDelete(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
