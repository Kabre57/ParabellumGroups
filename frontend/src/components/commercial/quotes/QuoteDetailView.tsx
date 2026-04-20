'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, FileDown, FileText, RefreshCcw, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { billingService } from '@/shared/api/billing';
import { commercialService } from '@/shared/api/commercial';
import { useClients } from '@/hooks/useCrm';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import {
  canQuoteBeConverted,
  getQuoteStatusMeta,
  isQuoteReadyForClientApproval,
} from './quote-status';
import { CreateClientQuoteDialog } from './CreateClientQuoteDialog';
import QuotePrint from '@/components/printComponents/QuotePrint';
import InvoicePrint from '@/components/printComponents/InvoicePrint';

interface Props {
  quoteId: string;
}

type QuoteActionType = 'send' | 'approve' | 'request-change' | 'refuse' | null;

const formatCurrency = (amount: number) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0)} F CFA`;

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ACTION_COPY: Record<
  Exclude<QuoteActionType, null>,
  {
    title: string;
    description: string;
    label: string;
    placeholder: string;
    confirmLabel: string;
  }
> = {
  send: {
    title: 'Envoyer le devis au client',
    description:
      'Ajoutez si besoin un message commercial qui sera conservé dans l’historique avant l’envoi du devis au client.',
    label: 'Message commercial',
    placeholder: 'Contexte, délai, précision commerciale…',
    confirmLabel: 'Envoyer le devis',
  },
  approve: {
    title: 'Valider le devis côté client',
    description:
      'Enregistrez le commentaire client si nécessaire. La validation client transmettra automatiquement le devis à la facturation.',
    label: 'Commentaire de validation',
    placeholder: 'Validation client, remarques, référence d’accord…',
    confirmLabel: 'Valider le devis',
  },
  'request-change': {
    title: 'Demande de modification du client',
    description:
      'Décrivez précisément les ajustements demandés afin que le commercial puisse réviser le devis et renvoyer une nouvelle version.',
    label: 'Commentaire du client',
    placeholder: 'Prix à revoir, quantités, délai, ajustement du périmètre…',
    confirmLabel: 'Enregistrer la demande',
  },
  refuse: {
    title: 'Refus du devis',
    description:
      'Indiquez le motif du refus client pour garder une traçabilité claire dans le dossier commercial.',
    label: 'Motif du refus',
    placeholder: 'Budget, concurrence, délai, abandon du besoin…',
    confirmLabel: 'Enregistrer le refus',
  },
};

const EVENT_LABELS: Record<string, string> = {
  CREATED: 'Devis créé',
  UPDATED: 'Devis mis à jour',
  SENT_TO_CLIENT: 'Devis envoyé au client',
  CLIENT_APPROVED: 'Devis validé par le client',
  CLIENT_REFUSED: 'Refus client',
  MODIFICATION_REQUESTED: 'Modification demandée par le client',
  FORWARDED_TO_BILLING: 'Devis transmis à la facturation',
  CONVERTED_TO_INVOICE: 'Devis converti en facture',
};

const formatEventLabel = (type?: string) => {
  if (!type) return 'Événement';
  const label = EVENT_LABELS[type];
  if (label) return label;
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export function QuoteDetailView({ quoteId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('informations');
  const [actionType, setActionType] = useState<QuoteActionType>(null);
  const [actionComment, setActionComment] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [isPrintQuoteOpen, setIsPrintQuoteOpen] = useState(false);
  const [isPrintInvoiceOpen, setIsPrintInvoiceOpen] = useState(false);
  const { canUpdate, canExport, canApprove } = getCrudVisibility(user, {
    read: ['quotes.read', 'quotes.read_all', 'quotes.read_own'],
    update: ['quotes.update', 'quotes.approve'],
    approve: ['quotes.approve', 'quotes.convert', 'invoices.create'],
    export: ['quotes.export', 'quotes.print'],
  });

  const quoteQuery = useQuery({
    queryKey: ['commercial-quote', quoteId],
    queryFn: () => billingService.getQuote(quoteId),
  });

  const { data: clients = [] } = useClients({ pageSize: 200 }, { enabled: !!quoteQuery.data?.data?.clientId });
  const { data: prospects = [] } = useQuery({
    queryKey: ['commercial-quote-prospects'],
    queryFn: () => commercialService.getProspects({ limit: 300 }),
    enabled: true,
    staleTime: 3 * 60 * 1000,
  });

  const clientMap = useMemo(() => {
    const entries = Array.isArray(clients) ? clients : [];
    return new Map(entries.map((client: any) => [client.id, client]));
  }, [clients]);

  const prospectMap = useMemo(() => {
    const list = Array.isArray(prospects) ? prospects : [];
    return new Map(list.map((prospect: any) => [prospect.id, prospect]));
  }, [prospects]);

  const quote = quoteQuery.data?.data;
  const client = quote?.clientId ? clientMap.get(quote.clientId) : null;
  const prospect = quote?.prospectId ? prospectMap.get(quote.prospectId) : null;
  const clientDisplayName =
    client?.nom ||
    client?.raisonSociale ||
    client?.reference ||
    prospect?.companyName ||
    prospect?.contactName ||
    quote?.clientId ||
    quote?.prospectId;
  const statusMeta = getQuoteStatusMeta(quote?.status);
  const actionConfig = actionType ? ACTION_COPY[actionType] : null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['commercial-quotes'] });
    queryClient.invalidateQueries({ queryKey: ['quotes'] });
    queryClient.invalidateQueries({ queryKey: ['commercial-quote', quoteId] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const sendMutation = useMutation({
    mutationFn: (message?: string) => billingService.sendQuote(quoteId, message),
    onSuccess: invalidate,
  });

  const approveMutation = useMutation({
    mutationFn: (comment?: string) => billingService.acceptQuote(quoteId, comment),
    onSuccess: invalidate,
  });

  const requestChangeMutation = useMutation({
    mutationFn: (comment?: string) => billingService.requestQuoteModification(quoteId, comment),
    onSuccess: invalidate,
  });

  const refuseMutation = useMutation({
    mutationFn: (comment?: string) => billingService.refuseQuote(quoteId, comment),
    onSuccess: invalidate,
  });

  const forwardMutation = useMutation({
    mutationFn: () => billingService.forwardQuoteToBilling(quoteId),
    onSuccess: invalidate,
  });

  const convertMutation = useMutation({
    mutationFn: () => billingService.convertQuoteToInvoice(quoteId),
    onSuccess: invalidate,
  });

  const closeActionDialog = () => {
    const isPending =
      sendMutation.isPending ||
      approveMutation.isPending ||
      requestChangeMutation.isPending ||
      refuseMutation.isPending;
    if (isPending) return;
    setActionType(null);
    setActionComment('');
  };

  const handleActionSubmit = async () => {
    if (!actionType) return;

    try {
      if (actionType === 'send') {
        const response = await sendMutation.mutateAsync(actionComment.trim() || undefined);
        const link = response.data?.approvalUrl;
        if (link && navigator?.clipboard) {
          await navigator.clipboard.writeText(link);
          toast.success('Devis envoyé. Le lien client a été copié.');
        } else {
          toast.success('Devis envoyé au client.');
        }
      }

      if (actionType === 'approve') {
        await approveMutation.mutateAsync(actionComment.trim() || undefined);
        toast.success('Le client a validé le devis. Il est transmis automatiquement à la facturation.');
      }

      if (actionType === 'request-change') {
        await requestChangeMutation.mutateAsync(actionComment.trim() || undefined);
        toast.success('La demande de modification a été enregistrée.');
      }

      if (actionType === 'refuse') {
        await refuseMutation.mutateAsync(actionComment.trim() || undefined);
        toast.success('Le refus client a été enregistré.');
      }

      closeActionDialog();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Action impossible pour le moment.');
    }
  };

  const handleForward = async () => {
    try {
      await forwardMutation.mutateAsync();
      toast.success('Le devis a été transmis à la facturation.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Transmission impossible.');
    }
  };

  const handleConvert = async () => {
    try {
      const response = await convertMutation.mutateAsync();
      toast.success(`Facture créée: ${response.data?.numeroFacture || response.data?.id}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Conversion en facture impossible.');
    }
  };

  const handlePrint = async () => {
    setIsPrintQuoteOpen(true);
  };

  const handlePrintInvoice = async () => {
    setIsPrintInvoiceOpen(true);
  };

  const actionPending =
    sendMutation.isPending ||
    approveMutation.isPending ||
    requestChangeMutation.isPending ||
    refuseMutation.isPending;

  if (quoteQuery.isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!quote) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Devis introuvable.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Link href="/dashboard/commercial/quotes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Retour aux devis
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-bold tracking-tight">{quote.numeroDevis}</h1>
              <QuoteStatusBadge status={quote.status} />
            </div>
            <p className="max-w-4xl text-muted-foreground">
              {quote.objet || 'Devis commercial client'}.
              {' '}Suivi complet du cycle commercial, du brouillon jusqu’à la facturation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canExport && (
              <Button variant="outline" onClick={() => void handlePrint()}>
                <FileDown className="mr-2 h-4 w-4" />
                Imprimer le devis
              </Button>
            )}
            {canUpdate && isQuoteReadyForClientApproval(quote.status) && (
              <Button variant="outline" onClick={() => setEditOpen(true)} disabled={actionPending}>
                <FileText className="mr-2 h-4 w-4" />
                Modifier le devis
              </Button>
            )}
            {canUpdate && isQuoteReadyForClientApproval(quote.status) && (
              <Button onClick={() => setActionType('send')} disabled={actionPending}>
                <Send className="mr-2 h-4 w-4" />
                Envoyer au client
              </Button>
            )}
            {canApprove && quote.status === 'ENVOYE' && (
              <>
                <Button variant="outline" onClick={() => setActionType('request-change')} disabled={actionPending}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Modification demandée
                </Button>
                <Button variant="outline" onClick={() => setActionType('refuse')} disabled={actionPending}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Refus client
                </Button>
                <Button onClick={() => setActionType('approve')} disabled={actionPending}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Valider client
                </Button>
              </>
            )}
            {canApprove && quote.status === 'ACCEPTE' && (
              <Button variant="outline" onClick={() => void handleForward()} disabled={forwardMutation.isPending}>
                <FileText className="mr-2 h-4 w-4" />
                Transmettre à la facturation
              </Button>
            )}
            {canApprove && canQuoteBeConverted(quote.status) && !quote.convertedInvoiceId && (
              <Button onClick={() => void handleConvert()} disabled={convertMutation.isPending}>
                <FileText className="mr-2 h-4 w-4" />
                Générer la facture
              </Button>
            )}
            {quote.convertedInvoiceId && (
              <>
                {canExport && (
                  <Button variant="outline" onClick={() => void handlePrintInvoice()}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Imprimer la facture
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link href={`/dashboard/facturation/factures/${quote.convertedInvoiceId}`}>
                    Voir la facture
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Client</div>
              <div className="mt-2 text-xl font-semibold">{clientDisplayName}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Montant TTC</div>
              <div className="mt-2 text-xl font-semibold">{formatCurrency(quote.montantTTC)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Révision</div>
              <div className="mt-2 text-xl font-semibold">V{quote.revisionNumber || 1}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Étape métier</div>
              <div className="mt-2 text-base font-semibold">{statusMeta.description}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="informations">Informations</TabsTrigger>
            <TabsTrigger value="lignes">Lignes</TabsTrigger>
            <TabsTrigger value="historique">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="informations">
            <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Informations générales</CardTitle>
                  <CardDescription>Client, service associé, validité et commentaires.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 md:grid-cols-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Objet</div>
                    <div className="mt-1 font-medium">{quote.objet || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Service associé</div>
                    <div className="mt-1 font-medium">{quote.serviceName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Client</div>
                    <div className="mt-1 font-medium">{clientDisplayName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Date de validité</div>
                    <div className="mt-1 font-medium">{formatDate(quote.dateValidite)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Dernier envoi client</div>
                    <div className="mt-1 font-medium">{formatDate(quote.sentAt)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Retour client</div>
                    <div className="mt-1 font-medium">{formatDate(quote.clientRespondedAt)}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-muted-foreground">Notes commerciales</div>
                    <div className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-3 text-sm">
                      {quote.notes || '-'}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-muted-foreground">Commentaire client</div>
                    <div className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-3 text-sm">
                      {quote.clientComment || '-'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Passage à la facturation</CardTitle>
                  <CardDescription>Suivi du relais commercial vers facture et recette.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-border p-4">
                    <div className="text-sm text-muted-foreground">Transmission</div>
                    <div className="mt-1 font-medium">{formatDate(quote.forwardedToBillingAt)}</div>
                    <div className="text-sm text-muted-foreground">{quote.forwardedToBillingBy || 'Non transmis'}</div>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <div className="text-sm text-muted-foreground">Facture liée</div>
                    <div className="mt-1 font-medium">{quote.convertedInvoiceNumber || 'Aucune'}</div>
                  </div>
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                    Après validation client, le devis est transmis à la facturation puis converti en facture.
                    Les paiements de cette facture alimentent ensuite la comptabilité et la trésorerie.
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="lignes">
            <Card>
              <CardHeader>
                <CardTitle>Lignes du devis</CardTitle>
                <CardDescription>Détail des prestations et articles envoyés au client.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="min-w-[900px] w-full">
                  <thead className="bg-muted/40 text-left text-sm text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Qté</th>
                      <th className="px-4 py-3">P.U. HT</th>
                      <th className="px-4 py-3">TVA %</th>
                      <th className="px-4 py-3">Montant HT</th>
                      <th className="px-4 py-3">Montant TTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.lignes.map((line, index) => (
                      <tr key={`${quote.id}-line-${index}`} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{line.description}</td>
                        <td className="px-4 py-3">{line.quantity || line.quantite}</td>
                        <td className="px-4 py-3">{formatCurrency(line.unitPrice || line.prixUnitaire || 0)}</td>
                        <td className="px-4 py-3">{line.vatRate || line.tauxTVA || 0}%</td>
                        <td className="px-4 py-3">{formatCurrency(line.totalHT || line.montantHT || 0)}</td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(line.totalTTC || line.montantTTC || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historique">
            <Card>
              <CardHeader>
                <CardTitle>Historique métier</CardTitle>
                <CardDescription>Traçabilité complète du cycle de vie du devis client.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {quote.evenements?.length ? (
                  quote.evenements.map((event) => (
                    <div key={event.id} className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">{formatEventLabel(event.type)}</div>
                        <div className="text-sm text-muted-foreground">{formatDate(event.createdAt)}</div>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {event.actorEmail || event.actorRole || 'Système'}
                      </div>
                      {event.note && <div className="mt-2 text-sm">{event.note}</div>}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">Aucun événement enregistré.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={Boolean(actionType)} onOpenChange={(open) => !open && closeActionDialog()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{actionConfig?.title}</DialogTitle>
            <DialogDescription>{actionConfig?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">{actionConfig?.label}</label>
            <Textarea
              value={actionComment}
              onChange={(event) => setActionComment(event.target.value)}
              placeholder={actionConfig?.placeholder}
              className="min-h-[120px]"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeActionDialog} disabled={actionPending}>
              Annuler
            </Button>
            <Button onClick={() => void handleActionSubmit()} disabled={actionPending}>
              {actionPending ? 'Traitement...' : actionConfig?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateClientQuoteDialog
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        initialQuote={quote}
      />

      {isPrintQuoteOpen && (
        <QuotePrint quote={quote} onClose={() => setIsPrintQuoteOpen(false)} />
      )}

      {isPrintInvoiceOpen && quote.convertedInvoiceId && (
        <InvoicePrint
          invoice={{
            ...quote,
            id: quote.convertedInvoiceId,
            numeroFacture: quote.convertedInvoiceNumber,
            dateFacture: quote.updatedAt,
            dateEcheance: quote.dateValidite,
          }}
          onClose={() => setIsPrintInvoiceOpen(false)}
        />
      )}
    </>
  );
}
