export type OperationalRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'NEEDS_INFO'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_FINANCIAL_PROCESS'
  | 'CASH_VOUCHER_CREATED'
  | 'DISBURSED'
  | 'CLOSED';

export type Attachment = {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
  url?: string | null;
  downloadUrl?: string | null;
};

export type OperationalRequestLog = {
  id: string;
  action: string;
  fromStatus?: OperationalRequestStatus | null;
  toStatus: OperationalRequestStatus;
  actorId: string;
  actorName: string;
  comment?: string | null;
  createdAt: string;
};

export type OperationalRequest = {
  id: string;
  requestNumber: string;
  type: string;
  status: OperationalRequestStatus;
  enterpriseId: number;
  enterpriseName: string;
  serviceName?: string | null;
  serviceId?: string | null;
  requesterId: string;
  requesterName: string;
  beneficiaryName: string;
  reason: string;
  amountRequested: number | string;
  amountApproved?: number | string | null;
  currency: string;
  desiredDate?: string | null;
  details: Record<string, unknown>;
  decisionComment?: string | null;
  cashVoucherId?: string | null;
  cashVoucherNumber?: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  disbursedAt?: string | null;
  attachments?: Attachment[];
  approvalLogs?: OperationalRequestLog[];
};

export type OperationalRequestTypeConfig = {
  id: string;
  enterpriseId: number;
  code: string;
  label: string;
  description?: string | null;
  isActive: boolean;
};
