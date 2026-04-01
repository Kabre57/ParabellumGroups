import type {
  CampaignStatsSummary,
  SequenceStepForm,
  SequenceStepPayload,
  BadgeVariant,
} from '@/types/campaigns';
import type { CampagneDestinataire, CampagneMail, CampagneStatus } from '@/shared/api/communication';
import { DEFAULT_SEQUENCE_STEPS } from '@/types/campaigns';

export const toInputDateTime = (value?: string) => {
  if (!value) return '';
  return value.length >= 16 ? value.slice(0, 16) : value;
};

export const normalizeDate = (value?: string) => {
  if (!value) return undefined;
  return value.length === 16 ? `${value}:00` : value;
};

export const parseDestinataires = (value: string): CampagneDestinataire[] => {
  const emails = value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const unique = Array.from(new Set(emails));
  return unique.map((email) => ({ email }));
};

export const formatDestinataires = (destinataires?: CampagneDestinataire[]) => {
  if (!Array.isArray(destinataires)) return '';
  return destinataires.map((d) => d.email).filter(Boolean).join('\n');
};

export const calculateRate = (value: number, total: number) => {
  if (total === 0) return '0.0';
  return ((value / total) * 100).toFixed(1);
};

export const formatDate = (date?: string) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getStatusBadge = (
  status: CampagneStatus
): { label: string; variant: BadgeVariant } => {
  const labelMap: Record<CampagneStatus, string> = {
    BROUILLON: 'Brouillon',
    PROGRAMMEE: 'Programmée',
    EN_COURS: 'En cours',
    TERMINEE: 'Terminée',
    ANNULEE: 'Annulée',
  };
  const variant: BadgeVariant =
    status === 'EN_COURS' || status === 'PROGRAMMEE' ? 'default' : 'secondary';
  return { label: labelMap[status] || status, variant };
};

export const buildSequencePayload = (
  templateId: string,
  steps: SequenceStepForm[]
): SequenceStepPayload[] => {
  const mainId = templateId.trim();
  if (!mainId) return [];
  return [
    { step: 1, templateId: mainId, delayDays: 0 },
    ...steps
      .filter((step) => step.templateId)
      .map((step) => ({
        step: step.step,
        templateId: step.templateId,
        delayDays: Number(step.delayDays) || 0,
      })),
  ];
};

export const getDefaultSequenceSteps = (): SequenceStepForm[] =>
  DEFAULT_SEQUENCE_STEPS.map((step) => ({ ...step }));

export const mergeSequenceSteps = (savedSequence: any): SequenceStepForm[] => {
  const sequence = Array.isArray(savedSequence) ? savedSequence : [];
  return getDefaultSequenceSteps().map((step) => {
    const match = sequence.find((item: any) => item.step === step.step);
    return {
      ...step,
      delayDays: match?.delayDays?.toString?.() || step.delayDays,
      templateId: match?.templateId || '',
    };
  });
};

export const computeCampaignStats = (campaigns: CampagneMail[]): CampaignStatsSummary => {
  const completedCampaigns = campaigns.filter(
    (c) => c.status === 'TERMINEE' || c.status === 'EN_COURS'
  );
  const totalOpened = completedCampaigns.reduce((sum, c) => sum + (c.nbLus || 0), 0);
  const totalRecipients = completedCampaigns.reduce(
    (sum, c) => sum + (Array.isArray(c.destinataires) ? c.destinataires.length : 0),
    0
  );
  const totalClicked = 0;

  return {
    total: campaigns.length,
    sent: campaigns.filter((c) => c.status === 'EN_COURS' || c.status === 'TERMINEE').length,
    avgOpenRate: totalRecipients > 0 ? ((totalOpened / totalRecipients) * 100).toFixed(1) : '0.0',
    avgClickRate: totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : '0.0',
  };
};
