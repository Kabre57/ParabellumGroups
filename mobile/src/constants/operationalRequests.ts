import type { OperationalRequestStatus } from '@/types/operationalRequest';

export type OperationalRequestView = 'mine' | 'review' | 'finance' | 'all';

export const requestStatusLabels: Record<OperationalRequestStatus, string> = {
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

export const requestTypeLabels: Record<string, string> = {
  FUEL: 'Carburant',
  TRANSPORT: 'Transport',
  MISSION: 'Mission / planning',
  OTHER: 'Autre dépense',
  PROCUREMENT: 'Achats / approvisionnement',
};

export const requestTypeDetails: Record<string, Array<{ key: string; label: string }>> = {
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

export const requestViews: Array<{ key: OperationalRequestView; label: string }> = [
  { key: 'mine', label: 'Mes demandes' },
  { key: 'review', label: 'À valider' },
  { key: 'finance', label: 'Traitement financier' },
  { key: 'all', label: 'Toutes du périmètre' },
];

export const attachmentStatuses: OperationalRequestStatus[] = [
  'DRAFT',
  'NEEDS_INFO',
  'APPROVED',
  'IN_FINANCIAL_PROCESS',
  'CASH_VOUCHER_CREATED',
  'DISBURSED',
];
