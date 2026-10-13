'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';


import { toast } from 'sonner';
import { billingService } from '@/shared/api/billing';
import { commercialService } from '@/shared/api/commercial';
import { useClients } from '@/hooks/useCrm';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';







import { getQuoteStatusMeta } from './quote-status';




export interface Props {
  quoteId: string;
}

export type QuoteActionType = 'send' | 'approve' | 'request-change' | 'refuse' | null;

export const formatCurrency = (amount: number) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0)} F CFA`;

export const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ACTION_COPY: Record<
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

export const EVENT_LABELS: Record<string, string> = {
  CREATED: 'Devis créé',
  UPDATED: 'Devis mis à jour',
  SENT_TO_CLIENT: 'Devis envoyé au client',
  CLIENT_APPROVED: 'Devis validé par le client',
  CLIENT_REFUSED: 'Refus client',
  MODIFICATION_REQUESTED: 'Modification demandée par le client',
  FORWARDED_TO_BILLING: 'Devis transmis à la facturation',
  CONVERTED_TO_INVOICE: 'Devis converti en facture',
};

export const formatEventLabel = (type?: string) => {
  if (!type) return 'Événement';
  const label = EVENT_LABELS[type];
  if (label) return label;
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};


export function useQuoteDetailViewModel(props: Props) {
  const { quoteId } = props;

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

  return {
    user,
    queryClient,
    tab,
    setTab,
    actionType,
    setActionType,
    actionComment,
    setActionComment,
    editOpen,
    setEditOpen,
    isPrintQuoteOpen,
    setIsPrintQuoteOpen,
    isPrintInvoiceOpen,
    setIsPrintInvoiceOpen,
    canUpdate,
    canExport,
    canApprove,
    quoteQuery,
    clients,
    prospects,
    clientMap,
    prospectMap,
    quote,
    client,
    prospect,
    clientDisplayName,
    statusMeta,
    actionConfig,
    invalidate,
    sendMutation,
    approveMutation,
    requestChangeMutation,
    refuseMutation,
    forwardMutation,
    convertMutation,
    closeActionDialog,
    handleActionSubmit,
    handleForward,
    handleConvert,
    handlePrint,
    handlePrintInvoice,
    actionPending,
  };
}
