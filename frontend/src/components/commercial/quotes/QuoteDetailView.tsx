'use client';

import { useQuoteDetailViewModel } from './QuoteDetailView.model';
import { formatCurrency, formatDate, formatEventLabel, type Props } from './QuoteDetailView.model';



import Link from 'next/link';
import { ArrowLeft, CheckCircle2, FileDown, FileText, RefreshCcw, Send, XCircle } from 'lucide-react';






import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import { canQuoteBeConverted, isQuoteReadyForClientApproval } from './quote-status';
import { CreateClientQuoteDialog } from './CreateClientQuoteDialog';
import QuotePrint from '@/components/printComponents/QuotePrint';
import InvoicePrint from '@/components/printComponents/InvoicePrint';















export function QuoteDetailView(props: Props) {

  const { quoteId } = props;
  const { user, queryClient, tab, setTab, actionType, setActionType, actionComment, setActionComment, editOpen, setEditOpen, isPrintQuoteOpen, setIsPrintQuoteOpen, isPrintInvoiceOpen, setIsPrintInvoiceOpen, canUpdate, canExport, canApprove, quoteQuery, clients, prospects, clientMap, prospectMap, quote, client, prospect, clientDisplayName, statusMeta, actionConfig, invalidate, sendMutation, approveMutation, requestChangeMutation, refuseMutation, forwardMutation, convertMutation, closeActionDialog, handleActionSubmit, handleForward, handleConvert, handlePrint, handlePrintInvoice, actionPending } = useQuoteDetailViewModel(props);

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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
              <div className="text-sm text-muted-foreground">Entreprise</div>
              <div className="mt-2 text-xl font-semibold">{quote.enterpriseName || '-'}</div>
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
                  <CardDescription>Entreprise, client, validité et commentaires.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 md:grid-cols-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Objet</div>
                    <div className="mt-1 font-medium">{quote.objet || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Entreprise</div>
                    <div className="mt-1 font-medium">{quote.enterpriseName || '-'}</div>
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
                    <div className="text-sm text-muted-foreground">Mode de livraison</div>
                    <div className="mt-1 font-medium">{quote.modeLivraison || '-'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-muted-foreground">Modalité de paiement</div>
                    <div className="mt-1 font-medium">{quote.modalitePaiement || '-'}</div>
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
