'use client';

import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  FileText,
  Search,
  Send,
  DollarSign,
  Calendar,
  AlertCircle,
  FileDown,
  Edit,
  Eye,
  Trash2,
} from 'lucide-react';
import { billingService } from '@/shared/api/billing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

type BackendQuoteStatus = 'BROUILLON' | 'ENVOYE' | 'ACCEPTE' | 'REFUSE' | 'EXPIRE' | 'CONVERTI';

interface Quote {
  id: string;
  number: string;
  title: string;
  company: string;
  contact: string;
  amount: number;
  status: QuoteStatus;
  validUntil: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  clientId?: string;
}

interface QuoteFormValues {
  status: QuoteStatus;
  dateValidite?: string;
  notes?: string;
}

const STATUS_MAP: Record<BackendQuoteStatus, QuoteStatus> = {
  BROUILLON: 'draft',
  ENVOYE: 'sent',
  ACCEPTE: 'accepted',
  REFUSE: 'rejected',
  EXPIRE: 'expired',
  CONVERTI: 'accepted',
};

const STATUS_TO_BACKEND: Record<QuoteStatus, BackendQuoteStatus> = {
  draft: 'BROUILLON',
  sent: 'ENVOYE',
  accepted: 'ACCEPTE',
  rejected: 'REFUSE',
  expired: 'EXPIRE',
};

const QUOTE_STATUSES = [
  { id: 'draft' as QuoteStatus, name: 'Brouillon', className: 'bg-gray-500' },
  { id: 'sent' as QuoteStatus, name: 'Envoye', className: 'bg-blue-500' },
  { id: 'accepted' as QuoteStatus, name: 'Accepte', className: 'bg-green-600' },
  { id: 'rejected' as QuoteStatus, name: 'Refuse', className: 'bg-red-500' },
  { id: 'expired' as QuoteStatus, name: 'Expire', className: 'bg-orange-500' },
];

const toInputDate = (value?: string) => {
  if (!value) return '';
  return value.length >= 16 ? value.slice(0, 16) : value;
};

const normalizeDate = (value?: string) => {
  if (!value) return undefined;
  return value.length === 16 ? `${value}:00` : value;
};

export default function QuotesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: quotesResponse, isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => billingService.getQuotes({ limit: 200 }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: QuoteFormValues }) =>
      billingService.updateQuote(id, {
        status: STATUS_TO_BACKEND[data.status],
        dateValidite: normalizeDate(data.dateValidite),
        notes: data.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => billingService.deleteQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const quotes: Quote[] = useMemo(() => {
    const list = quotesResponse?.data || [];
    return list.map((q) => ({
      id: q.id,
      number: q.numeroDevis || q.id,
      title: q.notes || 'Devis',
      company: q.client?.nom || q.clientId || 'Client',
      contact: (q.client as any)?.contact || '-',
      amount: q.montantTTC ?? q.montantHT ?? 0,
      status: STATUS_MAP[(q.status as BackendQuoteStatus) || 'BROUILLON'] || 'draft',
      validUntil: q.dateValidite || '',
      sentAt: q.dateDevis || '',
      createdAt: q.createdAt || '',
      updatedAt: q.updatedAt || q.dateDevis || '',
      notes: q.notes || '',
      clientId: q.clientId,
    }));
  }, [quotesResponse]);

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      quote.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.contact.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalValue = filteredQuotes.reduce((sum, q) => sum + q.amount, 0);
  const acceptedValue = filteredQuotes
    .filter((q) => q.status === 'accepted')
    .reduce((sum, q) => sum + q.amount, 0);
  const pendingValue = filteredQuotes
    .filter((q) => q.status === 'sent')
    .reduce((sum, q) => sum + q.amount, 0);
  const conversionRate = quotes.length > 0
    ? (quotes.filter((q) => q.status === 'accepted').length / quotes.length) * 100
    : 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const isExpiringSoon = (validUntil: string) => {
    if (!validUntil) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isExpired = (validUntil: string) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const getStatusBadge = (status: QuoteStatus) => {
    const statusConfig = QUOTE_STATUSES.find((s) => s.id === status);
    return statusConfig || QUOTE_STATUSES[0];
  };

  const form = useForm<QuoteFormValues>({
    defaultValues: {
      status: 'draft',
      dateValidite: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!editOpen || !selectedQuote) return;
    form.reset({
      status: selectedQuote.status,
      dateValidite: toInputDate(selectedQuote.validUntil),
      notes: selectedQuote.notes || '',
    });
  }, [editOpen, selectedQuote, form]);

  const openView = (quote: Quote) => {
    setSelectedQuote(quote);
    setViewOpen(true);
  };

  const openEdit = (quote: Quote) => {
    setSelectedQuote(quote);
    setEditOpen(true);
  };

  const handleDelete = (quote: Quote) => {
    if (confirm(`Supprimer le devis ${quote.number} ?`)) {
      deleteMutation.mutate(quote.id);
    }
  };

  const onSubmit = async (values: QuoteFormValues) => {
    if (!selectedQuote) return;
    await updateMutation.mutateAsync({ id: selectedQuote.id, data: values });
    setEditOpen(false);
    setSelectedQuote(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Devis et Propositions</h1>
          <p className="text-muted-foreground">Creation, suivi et gestion de vos devis</p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Nouveau devis
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur totale</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Devis filtres</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devis acceptes</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(acceptedValue)}</div>
            <p className="text-xs text-muted-foreground">Devis gagnes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingValue)}</div>
            <p className="text-xs text-muted-foreground">Envoyes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de conversion</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Sur tous les devis</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des devis</CardTitle>
          <CardDescription>Suivez l avancement de vos propositions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numero, titre, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | 'all')}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Tous les statuts</option>
                {QUOTE_STATUSES.map((status) => (
                  <option key={status.id} value={status.id}>{status.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Spinner />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Numero</th>
                    <th className="text-left p-4 font-medium">Titre</th>
                    <th className="text-left p-4 font-medium">Client</th>
                    <th className="text-left p-4 font-medium">Montant</th>
                    <th className="text-left p-4 font-medium">Statut</th>
                    <th className="text-left p-4 font-medium">Validite</th>
                    <th className="text-left p-4 font-medium">Cree le</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map((quote) => {
                    const statusBadge = getStatusBadge(quote.status);
                    return (
                      <tr key={quote.id} className="border-t hover:bg-muted/50">
                        <td className="p-4 font-mono text-sm">{quote.number}</td>
                        <td className="p-4 font-medium">{quote.title}</td>
                        <td className="p-4 text-sm text-muted-foreground">{quote.company}</td>
                        <td className="p-4 text-sm">{formatCurrency(quote.amount)}</td>
                        <td className="p-4">
                          <Badge className={statusBadge.className}>{statusBadge.name}</Badge>
                        </td>
                        <td className="p-4 text-sm">
                          <Calendar className="inline h-4 w-4 mr-1 text-muted-foreground" />
                          <span className={
                            isExpired(quote.validUntil)
                              ? 'text-red-600 font-semibold'
                              : isExpiringSoon(quote.validUntil)
                                ? 'text-orange-600 font-semibold'
                                : 'text-muted-foreground'
                          }>
                            {quote.validUntil ? formatDate(quote.validUntil) : '-'}
                          </span>
                          {(isExpiringSoon(quote.validUntil) || isExpired(quote.validUntil)) && (
                            <AlertCircle className="inline h-4 w-4 ml-1 text-orange-500" />
                          )}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {quote.createdAt ? formatDate(quote.createdAt) : '-'}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openView(quote)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Voir
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEdit(quote)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Modifier
                            </Button>
                            <Button variant="outline" size="sm">
                              <FileDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleDelete(quote)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {!isLoading && filteredQuotes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucun devis trouve
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detail devis</DialogTitle>
            <DialogDescription>Informations principales</DialogDescription>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-2 text-sm">
              <div><strong>Numero:</strong> {selectedQuote.number}</div>
              <div><strong>Client:</strong> {selectedQuote.company}</div>
              <div><strong>Montant:</strong> {formatCurrency(selectedQuote.amount)}</div>
              <div><strong>Statut:</strong> {selectedQuote.status}</div>
              <div><strong>Validite:</strong> {selectedQuote.validUntil ? formatDate(selectedQuote.validUntil) : '-'}</div>
              <div><strong>Notes:</strong> {selectedQuote.notes || '-'}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Modifier devis</DialogTitle>
            <DialogDescription>Mettre a jour le statut et la validite.</DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Statut</label>
              <select className="w-full px-3 py-2 border rounded-md" {...form.register('status')}>
                {QUOTE_STATUSES.map((status) => (
                  <option key={status.id} value={status.id}>{status.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date de validite</label>
              <Input type="datetime-local" {...form.register('dateValidite')} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea className="w-full px-3 py-2 border rounded-md" {...form.register('notes')} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                Mettre a jour
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
