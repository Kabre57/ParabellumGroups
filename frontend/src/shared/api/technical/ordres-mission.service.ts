import { apiClient } from '../shared/client';
import { MissionOrder } from './types';

export interface MissionOrderListResponse {
  success: boolean;
  data: MissionOrder[];
  page?: number;
  limit?: number;
  total?: number;
  pages?: number;
}

export interface MissionOrderDetailResponse {
  success: boolean;
  data: MissionOrder;
  message?: string;
}

export interface CreateMissionOrderRequest {
  missionId: string;
  interventionId?: string;
  technicienId: string;
  pieceIdentite?: string;
  fonction?: string;
  qualite?: string;
  vehiculeType: 'VEHICULE_DE_SERVICE' | 'VEHICULE_DE_TRANSPORT';
  vehiculeLabel?: string;
  destination?: string;
  objetMission?: string;
  notes?: string;
}

export interface CreateMissionOrderBatchRequest {
  interventionId: string;
  technicienIds?: string[];
  vehiculeType: 'VEHICULE_DE_SERVICE' | 'VEHICULE_DE_TRANSPORT';
  vehiculeLabel?: string;
  qualite?: string;
  destination?: string;
  objetMission?: string;
  notes?: string;
}

export interface UpdateMissionOrderRequest {
  pieceIdentite?: string;
  fonction?: string;
  qualite?: string;
  vehiculeType?: 'VEHICULE_DE_SERVICE' | 'VEHICULE_DE_TRANSPORT';
  vehiculeLabel?: string;
  destination?: string;
  objetMission?: string;
  dateDepart?: string;
  dateRetour?: string | null;
  notes?: string;
  status?: 'GENERE' | 'IMPRIME' | 'ARCHIVE';
}

export const ordresMissionService = {
  async getOrders(params?: {
    page?: number;
    limit?: number;
    missionId?: string;
    interventionId?: string;
    technicienId?: string;
    status?: string;
    search?: string;
  }): Promise<MissionOrderListResponse> {
    const response = await apiClient.get('/ordres-mission', { params });
    return response.data;
  },

  async getOrder(id: string): Promise<MissionOrderDetailResponse> {
    const response = await apiClient.get(`/ordres-mission/${id}`);
    return response.data;
  },

  async createOrder(data: CreateMissionOrderRequest): Promise<MissionOrderDetailResponse> {
    const response = await apiClient.post('/ordres-mission', data);
    return response.data;
  },

  async createOrdersBatch(data: CreateMissionOrderBatchRequest): Promise<{ success: boolean; data: MissionOrder[]; message?: string }> {
    const response = await apiClient.post('/ordres-mission/batch', data);
    return response.data;
  },

  async updateOrder(id: string, data: UpdateMissionOrderRequest): Promise<MissionOrderDetailResponse> {
    const response = await apiClient.patch(`/ordres-mission/${id}`, data);
    return response.data;
  },

  async markPrinted(id: string): Promise<MissionOrderDetailResponse> {
    const response = await apiClient.patch(`/ordres-mission/${id}/printed`);
    return response.data;
  },

  async downloadPdf(id: string): Promise<Blob> {
    const response = await apiClient.get(`/ordres-mission/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
