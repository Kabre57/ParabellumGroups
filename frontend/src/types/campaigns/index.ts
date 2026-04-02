import type { CampagneStatus, CampagneDestinataire } from '@/shared/api/communication';

export interface CampaignFormValues {
  nom: string;
  templateId: string;
  objectif: string;
  segment: string;
  status: CampagneStatus;
  dateEnvoi?: string;
  destinatairesText: string;
}

export type SequenceChannel = 'EMAIL' | 'PHONE' | 'VISIT';

export interface SequenceStepForm {
  step: number;
  label: string;
  delayDays: string;
  templateId: string;
  channel: SequenceChannel;
  note?: string;
  status?: 'A_FAIRE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  report?: string;
  outcome?: 'JOINT' | 'MESSAGE' | 'A_RAPPELER' | 'INJOIGNABLE' | 'RDV_PLANIFIE';
}

export type CampaignStatusOption = { value: CampagneStatus; label: string };
export type CampaignObjectifOption = { value: string; label: string };
export type CampaignSegmentOption = { value: string; label: string };

export interface CampaignStatsSummary {
  total: number;
  sent: number;
  avgOpenRate: string;
  avgClickRate: string;
}

export interface SequenceStepPayload {
  step: number;
  templateId?: string;
  delayDays: number;
  channel: SequenceChannel;
  note?: string;
  status?: 'A_FAIRE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  report?: string;
  outcome?: 'JOINT' | 'MESSAGE' | 'A_RAPPELER' | 'INJOIGNABLE' | 'RDV_PLANIFIE';
}

export interface CampaignStopConditions {
  stopOnReply: boolean;
  stopOnSigned: boolean;
}

export interface CampaignDestinataireInput extends CampagneDestinataire {
  email: string;
}

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export const STATUS_OPTIONS: CampaignStatusOption[] = [
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'PROGRAMMEE', label: 'Programmée' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TERMINEE', label: 'Terminée' },
  { value: 'ANNULEE', label: 'Annulée' },
];

export const OBJECTIF_OPTIONS: CampaignObjectifOption[] = [
  { value: 'RELANCE_PROSPECT', label: 'Relance prospect' },
  { value: 'RELANCE_DEVIS', label: 'Relance devis' },
  { value: 'RELANCE_CLIENT', label: 'Relance client' },
  { value: 'NEWSLETTER', label: 'Newsletter' },
  { value: 'FIDELISATION', label: 'Fidélisation' },
];

export const SEGMENT_OPTIONS: CampaignSegmentOption[] = [
  { value: 'PROSPECTS', label: 'Prospects à relancer' },
  { value: 'DEVIS_ENVOYES', label: 'Devis envoyés' },
  { value: 'CLIENTS', label: 'Clients existants' },
  { value: 'PERSONNALISE', label: 'Liste manuelle' },
];

export const DEFAULT_SEQUENCE_STEPS: SequenceStepForm[] = [
  { step: 2, label: 'Relance 2', delayDays: '3', templateId: '', channel: 'EMAIL', note: '', status: 'A_FAIRE', report: '' },
  { step: 3, label: 'Relance 3', delayDays: '7', templateId: '', channel: 'EMAIL', note: '', status: 'A_FAIRE', report: '' },
  { step: 4, label: 'Relance 4', delayDays: '15', templateId: '', channel: 'EMAIL', note: '', status: 'A_FAIRE', report: '' },
];
