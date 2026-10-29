import type {
  Attachment,
  OperationalRequest,
  OperationalRequestTypeConfig,
} from '../types/operationalRequest';
import { apiClient } from './client';

export type ListParams =
  | { mine: true; page?: number; limit?: number }
  | { status: 'SUBMITTED'; excludeMine?: boolean; page?: number; limit?: number }
  | { financeQueue: true; page?: number; limit?: number }
  | { page?: number; limit?: number };

export type CreatePayload = {
  type: string;
  beneficiaryName: string;
  reason: string;
  amountRequested: number;
  desiredDate?: string;
  details: Record<string, string>;
};

export type UpdatePayload = Partial<CreatePayload>;

type ApiResponse<T> = { success: true; data: T };

type AttachmentFile = { uri: string; name: string; type: string };
type NativeFormData = FormData & {
  append: (name: string, value: AttachmentFile) => void;
};

type RequestList = {
  data: OperationalRequest[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export const operationalRequestsService = {
  async list(params: ListParams): Promise<RequestList> {
    const response = await apiClient.get<{ success: true } & RequestList>(
      '/operational-requests',
      { params },
    );
    return { data: response.data.data, meta: response.data.meta };
  },

  async get(id: string): Promise<OperationalRequest> {
    const response = await apiClient.get<ApiResponse<OperationalRequest>>(
      `/operational-requests/${encodeURIComponent(id)}`,
    );
    return response.data.data;
  },

  async create(payload: CreatePayload): Promise<OperationalRequest> {
    const response = await apiClient.post<ApiResponse<OperationalRequest>>(
      '/operational-requests',
      payload,
    );
    return response.data.data;
  },

  async update(id: string, payload: UpdatePayload): Promise<OperationalRequest> {
    const response = await apiClient.patch<ApiResponse<OperationalRequest>>(
      `/operational-requests/${encodeURIComponent(id)}`,
      payload,
    );
    return response.data.data;
  },

  async submit(id: string, comment?: string): Promise<OperationalRequest> {
    const response = await apiClient.post<ApiResponse<OperationalRequest>>(
      `/operational-requests/${encodeURIComponent(id)}/submit`,
      { comment },
    );
    return response.data.data;
  },

  async decide(
    id: string,
    action: 'approve' | 'reject' | 'return',
    comment: string,
  ): Promise<OperationalRequest> {
    const response = await apiClient.post<ApiResponse<OperationalRequest>>(
      `/operational-requests/${encodeURIComponent(id)}/${action}`,
      { comment },
    );
    return response.data.data;
  },

  async beginFinancialProcessing(id: string, comment?: string): Promise<OperationalRequest> {
    const response = await apiClient.post<ApiResponse<OperationalRequest>>(
      `/operational-requests/${encodeURIComponent(id)}/financial-processing`,
      { comment },
    );
    return response.data.data;
  },

  async createCashVoucher(
    id: string,
    payload: { paymentMethod: string; treasuryAccountId: string },
  ): Promise<OperationalRequest> {
    const response = await apiClient.post<ApiResponse<OperationalRequest>>(
      `/operational-requests/${encodeURIComponent(id)}/create-cash-voucher`,
      payload,
    );
    return response.data.data;
  },

  async linkCashVoucher(id: string): Promise<OperationalRequest> {
    const response = await apiClient.post<ApiResponse<OperationalRequest>>(
      `/operational-requests/${encodeURIComponent(id)}/cash-voucher`,
    );
    return response.data.data;
  },

  async syncCashVoucher(id: string): Promise<OperationalRequest> {
    const response = await apiClient.post<ApiResponse<OperationalRequest>>(
      `/operational-requests/${encodeURIComponent(id)}/sync-cash-voucher`,
    );
    return response.data.data;
  },

  async close(id: string, comment?: string): Promise<OperationalRequest> {
    const response = await apiClient.post<ApiResponse<OperationalRequest>>(
      `/operational-requests/${encodeURIComponent(id)}/close`,
      { comment },
    );
    return response.data.data;
  },

  async uploadAttachment(
    id: string,
    file: AttachmentFile,
  ): Promise<Attachment> {
    // Le FormData natif accepte les fichiers URI, contrairement au type DOM.
    const body = new FormData() as NativeFormData;
    body.append('file', file);
    const response = await apiClient.post<ApiResponse<Attachment>>(
      `/operational-requests/${encodeURIComponent(id)}/attachments`,
      body,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  async listTypes(params?: { all?: boolean }): Promise<OperationalRequestTypeConfig[]> {
    const response = await apiClient.get<ApiResponse<OperationalRequestTypeConfig[]>>(
      '/operational-requests/types',
      { params },
    );
    return response.data.data;
  },
};
