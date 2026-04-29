import { apiClient } from '../shared/client';
import type {
  AssetCourse,
  BudgetPerformanceResponse,
  DetailResponse,
  ListResponse,
  Placement,
  PlacementPerformancePoint,
  PlacementsResponse,
} from './types';
import { normalizeDetailResponse } from './utils';

export const placementsService = {
  async getPlacements(params?: {
    type?: string;
    status?: string;
    serviceId?: number;
  }): Promise<PlacementsResponse> {
    const response = await apiClient.get('/billing/placements', { params });
    return response.data;
  },

  async getPlacement(id: string): Promise<DetailResponse<Placement>> {
    const response = await apiClient.get(`/billing/placements/${id}`);
    return normalizeDetailResponse<Placement>(response.data);
  },

  async createPlacement(data: Partial<Placement>): Promise<DetailResponse<Placement>> {
    const response = await apiClient.post('/billing/placements', data);
    return normalizeDetailResponse<Placement>(response.data);
  },

  async addAssetCourse(id: string, data: { value: number; atDate?: string }): Promise<DetailResponse<AssetCourse>> {
    const response = await apiClient.post(`/billing/placements/${id}/courses`, data);
    return normalizeDetailResponse<AssetCourse>(response.data);
  },

  async updatePlacementStatus(id: string, status: string): Promise<DetailResponse<Placement>> {
    const response = await apiClient.patch(`/billing/placements/${id}/status`, { status });
    return normalizeDetailResponse<Placement>(response.data);
  },

  async getPlacementsPerformance(): Promise<ListResponse<PlacementPerformancePoint>> {
    const response = await apiClient.get('/billing/placements/stats/performance');
    return response.data;
  },

  async getBudgetPerformance(year?: number): Promise<BudgetPerformanceResponse> {
    const response = await apiClient.get('/billing/budgets/performance', { params: { year } });
    return response.data;
  },
};
