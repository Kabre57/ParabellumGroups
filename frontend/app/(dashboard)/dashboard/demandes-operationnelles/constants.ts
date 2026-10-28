import type {
  OperationalRequestStatus,
  OperationalRequestType,
} from '@/shared/api/operationalRequests.service';
import type { FormValues } from './types';

export const emptyForm = (): FormValues => ({
  type: 'OTHER',
  beneficiaryName: '',
  reason: '',
  amountRequested: '',
  desiredDate: '',
  details: {},
});

export const typeLabels: Record<OperationalRequestType, string> = {
  FUEL: 'Carburant',
  TRANSPORT: 'Transport',
  MISSION: 'Mission / planning',
  OTHER: 'Autre dépense',
};

export const statusLabels: Record<OperationalRequestStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'À valider',
  NEEDS_INFO: 'À compléter',
  APPROVED: 'Approuvée',
  REJECTED: 'Rejetée',
  IN_FINANCIAL_PROCESS: 'Traitement financier',
  CASH_VOUCHER_CREATED: 'Bon de caisse créé',
  DISBURSED: 'Décaissée',
  CLOSED: 'Clôturée',
};

export const statusColors: Record<OperationalRequestStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-100 text-amber-800',
  NEEDS_INFO: 'bg-orange-100 text-orange-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-800',
  IN_FINANCIAL_PROCESS: 'bg-blue-100 text-blue-800',
  CASH_VOUCHER_CREATED: 'bg-indigo-100 text-indigo-800',
  DISBURSED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-200 text-gray-700',
};

export const typeDetails: Record<OperationalRequestType, Array<{ key: string; label: string }>> = {
  FUEL: [
    { key: 'vehicle', label: 'Véhicule' },
    { key: 'quantity', label: 'Quantité estimée (litres)' },
    { key: 'route', label: 'Trajet ou mission liée' },
  ],
  TRANSPORT: [
    { key: 'passenger', label: 'Personne transportée' },
    { key: 'origin', label: 'Départ' },
    { key: 'destination', label: 'Destination' },
  ],
  MISSION: [
    { key: 'place', label: 'Lieu de mission' },
    { key: 'startDate', label: 'Date de début' },
    { key: 'endDate', label: 'Date de fin' },
    { key: 'participants', label: 'Participants' },
  ],
  OTHER: [{ key: 'category', label: 'Catégorie de dépense' }],
};

export const formatMoney = (value: string | number) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(value) || 0)} XOF`;

export const formatDate = (value?: string | null) => {
  if (!value) return '—';
  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(parsed);
  } catch {
    return '—';
  }
};

export const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object') {
    const value = error as { message?: string; response?: { data?: { message?: string } } };
    return value.response?.data?.message || value.message || 'Une erreur est survenue.';
  }
  return 'Une erreur est survenue.';
};
