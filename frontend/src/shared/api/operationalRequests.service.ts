import { apiClient } from './shared/client';

export type OperationalRequestType = 'FUEL' | 'TRANSPORT' | 'MISSION' | 'OTHER';
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

export interface OperationalRequestLog {
  id: string;
  action: string;
  fromStatus?: OperationalRequestStatus | null;
  toStatus: OperationalRequestStatus;
  actorId: string;
  actorName: string;
  comment?: string | null;
  createdAt: string;
}

export interface OperationalRequestAttachment {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface OperationalRequest {
  id: string;
  requestNumber: string;
  type: OperationalRequestType;
  status: OperationalRequestStatus;
  enterpriseId: number;
  enterpriseName: string;
  serviceId?: number | null;
  serviceName?: string | null;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string | null;
  beneficiaryName: string;
  reason: string;
  amountRequested: string | number;
  amountApproved?: string | number | null;
  currency: string;
  desiredDate?: string | null;
  details: Record<string, unknown>;
  decisionComment?: string | null;
  cashVoucherId?: string | null;
  cashVoucherNumber?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  disbursedAt?: string | null;
  createdAt: string;
  approvalLogs: OperationalRequestLog[];
  attachments: OperationalRequestAttachment[];
}

type ApiResponse<T> = { success: boolean; data: T; message?: string };
type PaginatedResponse<T> = ApiResponse<T> & {
  meta?: { total: number; page: number; limit: number; totalPages: number };
};

export const operationalRequestsService = {
  async list(params?: { mine?: boolean; financeQueue?: boolean; status?: OperationalRequestStatus; search?: string; limit?: number; page?: number }) {
    const response = await apiClient.get<PaginatedResponse<OperationalRequest[]>>('/operational-requests', { params });
    return response.data;
  },
  async get(id: string) {
    const response = await apiClient.get<ApiResponse<OperationalRequest>>(`/operational-requests/${id}`);
    return response.data;
  },
  async create(data: Partial<OperationalRequest>) {
    const response = await apiClient.post<ApiResponse<OperationalRequest>>('/operational-requests', data);
    return response.data;
  },
  async update(id: string, data: Partial<OperationalRequest>) {
    const response = await apiClient.patch<ApiResponse<OperationalRequest>>(`/operational-requests/${id}`, data);
    return response.data;
  },
  async submit(id: string, comment?: string) {
    const response = await apiClient.post<ApiResponse<OperationalRequest>>(`/operational-requests/${id}/submit`, { comment });
    return response.data;
  },
  async decide(id: string, decision: 'approve' | 'reject' | 'return', comment?: string) {
    const response = await apiClient.post<ApiResponse<OperationalRequest>>(`/operational-requests/${id}/${decision}`, { comment });
    return response.data;
  },
  async startFinancialProcessing(id: string, comment?: string) {
    const response = await apiClient.post<ApiResponse<OperationalRequest>>(`/operational-requests/${id}/financial-processing`, { comment });
    return response.data;
  },
  async linkCashVoucher(id: string) {
    const response = await apiClient.post<ApiResponse<OperationalRequest>>(`/operational-requests/${id}/cash-voucher`);
    return response.data;
  },
  async syncCashVoucher(id: string) {
    const response = await apiClient.post<ApiResponse<OperationalRequest>>(`/operational-requests/${id}/sync-cash-voucher`);
    return response.data;
  },
  async close(id: string, comment?: string) {
    const response = await apiClient.post<ApiResponse<OperationalRequest>>(`/operational-requests/${id}/close`, { comment });
    return response.data;
  },
  async uploadAttachment(id: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post<ApiResponse<OperationalRequestAttachment>>(`/operational-requests/${id}/attachments`, form);
    return response.data;
  },
};
