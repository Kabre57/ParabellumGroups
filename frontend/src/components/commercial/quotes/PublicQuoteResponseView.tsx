'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, FileDown, RefreshCcw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { billingService, type Quote } from '@/shared/api/billing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { QuoteStatusBadge } from './QuoteStatusBadge';

interface Props {
  token: string;
}

const formatCurrency = (amount: number) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0)} F CFA`;

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export function PublicQuoteResponseView({ token }: Props) {
  const [comment, setComment] = useState('');
  const quoteQuery = useQuery({
    queryKey: ['public-quote-response', token],
    queryFn: () => billingService.getPublicQuoteResponse(token),
  });

  const responseMutation = useMutation({
    mutationFn: (payload: { action: 'ACCEPT' | 'REQUEST_MODIFICATION' | 'REFUSE'; comment?: string }) =>
      billingService.submitPublicQuoteResponse(token, payload),
    onSuccess: (response) => {
      quoteQuery.refetch();
      const status = response.data?.status;
      if (status === 'TRANSMIS_FACTURATION') {
        toast.success('Votre validation a bien été enregistrée.');
      } else if (status === 'MODIFICATION_DEMANDEE') {
        toast.success('Votre demande de modification a bien été envoyée.');
      } else if (status === 'REFUSE') {
        toast.success('Votre refus du devis a bien été enregistré.');
      }
      setComment('');
    },
  });

  const quote = quoteQuery.data?.data as Quote | undefined;
  const alreadyProcessed = useMemo(
    () => ['TRANSMIS_FACTURATION', 'FACTURE', 'MODIFICATION_DEMANDEE', 'REFUSE'].includes(String(quote?.status || '')),
    [quote?.status]
  );

  const handleAction = async (action: 'ACCEPT' | 'REQUEST_MODIFICATION' | 'REFUSE') => {
    try {
      await responseMutation.mutateAsync({
        action,
        comment: comment.trim() || undefined,
      });
    } catch (error: any) {
      toast.error(error?.message || 'Impossible d’enregistrer votre réponse.');
    }
  };

  const handlePrint = async () => {
    if (!quote?.id) return;
    const blob = await billingService.getQuotePDF(quote.id);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (quoteQuery.isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (quoteQuery.isError || !quote) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Card>
          <CardContent className="py-10 text-center">
            <div className="text-2xl font-semibold">Lien de devis indisponible</div>
            <p className="mt-3 text-muted-foreground">
              Ce lien client est invalide, expiré ou le devis n’est plus disponible.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Validation client</div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">{quote.numeroDevis}</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Consultez votre devis, imprimez-le si besoin, puis validez-le ou demandez une modification.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <QuoteStatusBadge status={quote.status} />
          <Button variant="outline" onClick={() => void handlePrint()}>
            <FileDown className="mr-2 h-4 w-4" />
            Imprimer le devis
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Objet</div>
            <div className="mt-2 font-semibold">{quote.objet || '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Service émetteur</div>
            <div className="mt-2 font-semibold">{quote.serviceName || '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Validité</div>
            <div className="mt-2 font-semibold">{formatDate(quote.dateValidite)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Montant TTC</div>
            <div className="mt-2 font-semibold">{formatCurrency(quote.montantTTC)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détail du devis</CardTitle>
          <CardDescription>Prestations, quantités, prix et TVA proposés.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-[860px] w-full">
            <thead className="bg-muted/40 text-left text-sm text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Désignation / prestation</th>
                <th className="px-4 py-3">Qté</th>
                <th className="px-4 py-3">P.U. HT</th>
                <th className="px-4 py-3">TVA %</th>
                <th className="px-4 py-3">Montant TTC</th>
              </tr>
            </thead>
            <tbody>
              {quote.lignes.map((line, index) => (
                <tr key={`${quote.id}-public-line-${index}`} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{line.description}</td>
                  <td className="px-4 py-3">{line.quantite || line.quantity}</td>
                  <td className="px-4 py-3">{formatCurrency(line.prixUnitaire || line.unitPrice || 0)}</td>
                  <td className="px-4 py-3">{line.tauxTVA || line.vatRate || 0}%</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(line.montantTTC || line.totalTTC || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Votre retour</CardTitle>
          <CardDescription>
            Vous pouvez valider le devis, demander une modification, ou refuser la proposition.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Commentaire / demande de modification</label>
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Précisez ici vos remarques, ajustements souhaités ou votre validation."
              className="min-h-[140px]"
              disabled={alreadyProcessed || responseMutation.isPending}
            />
          </div>

          {alreadyProcessed && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Une réponse a déjà été enregistrée pour ce devis. Si vous souhaitez revenir dessus, contactez directement le service commercial.
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => void handleAction('ACCEPT')}
              disabled={alreadyProcessed || responseMutation.isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Valider le devis
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleAction('REQUEST_MODIFICATION')}
              disabled={alreadyProcessed || responseMutation.isPending}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Demander une modification
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleAction('REFUSE')}
              disabled={alreadyProcessed || responseMutation.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Refuser le devis
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        Si vous avez besoin d’un accompagnement complémentaire, merci de contacter le service commercial.
      </div>
    </div>
  );
}
