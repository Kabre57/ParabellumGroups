import type { OperationalRequestType } from '@/shared/api/operationalRequests.service';

export type FormValues = {
  type: OperationalRequestType;
  beneficiaryName: string;
  reason: string;
  amountRequested: string;
  desiredDate: string;
  details: Record<string, string>;
};

export type ViewFilter = 'mine' | 'all' | 'review' | 'finance';
