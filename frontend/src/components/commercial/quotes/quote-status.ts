import type { Quote } from '@/shared/api/billing';

export type QuoteWorkflowStatus = Quote['status'];

export const QUOTE_STATUS_META: Record<
  QuoteWorkflowStatus,
  { label: string; className: string; description: string }
> = {
  BROUILLON: {
    label: 'Brouillon',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Préparation commerciale interne',
  },
  ENVOYE: {
    label: 'Envoyé client',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    description: 'En attente de retour du client',
  },
  MODIFICATION_DEMANDEE: {
    label: 'Modification demandée',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    description: 'Le client demande une révision',
  },
  ACCEPTE: {
    label: 'Validé client',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    description: 'Prêt pour transmission à la facturation',
  },
  REFUSE: {
    label: 'Refusé',
    className: 'bg-rose-100 text-rose-700 border-rose-200',
    description: 'Refus client ou abandon commercial',
  },
  EXPIRE: {
    label: 'Expiré',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
    description: 'Date de validité dépassée',
  },
  TRANSMIS_FACTURATION: {
    label: 'Transmis facturation',
    className: 'bg-violet-100 text-violet-700 border-violet-200',
    description: 'Le service facturation peut convertir le devis',
  },
  FACTURE: {
    label: 'Facturé',
    className: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    description: 'Une facture a été générée',
  },
};

export const getQuoteStatusMeta = (status?: string) =>
  QUOTE_STATUS_META[(status || 'BROUILLON') as QuoteWorkflowStatus] || QUOTE_STATUS_META.BROUILLON;

export const isQuoteReadyForClientApproval = (status?: string) =>
  ['BROUILLON', 'MODIFICATION_DEMANDEE', 'REFUSE'].includes(String(status || 'BROUILLON'));

export const isQuoteClientApproved = (status?: string) => String(status) === 'ACCEPTE';

export const canQuoteBeConverted = (status?: string) =>
  ['ACCEPTE', 'TRANSMIS_FACTURATION'].includes(String(status));
