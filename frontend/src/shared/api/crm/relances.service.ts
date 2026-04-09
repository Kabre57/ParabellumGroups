import axios from 'axios';
import { RelanceAutomatique, ListResponse, DetailResponse, EmptyResponse } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const relancesService = {
  getRelances: (params?: Record<string, any>) =>
    axios.get<ListResponse<RelanceAutomatique>>(`${API_URL}/api/crm/relances`, { params }).then(res => res.data),

  getRelance: (id: string) =>
    axios.get<DetailResponse<RelanceAutomatique>>(`${API_URL}/api/crm/relances/${id}`).then(res => res.data),

  createRelance: (data: Partial<RelanceAutomatique>) =>
    axios.post<DetailResponse<RelanceAutomatique>>(`${API_URL}/api/crm/relances`, data).then(res => res.data),

  updateRelance: (id: string, data: Partial<RelanceAutomatique>) =>
    axios.put<DetailResponse<RelanceAutomatique>>(`${API_URL}/api/crm/relances/${id}`, data).then(res => res.data),

  deleteRelance: (id: string) =>
    axios.delete<EmptyResponse>(`${API_URL}/api/crm/relances/${id}`).then(res => res.data),

  toggleRelance: (id: string) =>
    axios.post<DetailResponse<RelanceAutomatique>>(`${API_URL}/api/crm/relances/${id}/toggle`).then(res => res.data),

  getExecutions: (id: string, params?: Record<string, any>) =>
    axios.get<ListResponse<any>>(`${API_URL}/api/crm/relances/${id}/executions`, { params }).then(res => res.data),
};
