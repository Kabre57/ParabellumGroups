import axios from 'axios';
import { SegmentClient, ListResponse, DetailResponse, EmptyResponse } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const segmentsService = {
  getSegments: (params?: Record<string, any>) =>
    axios.get<ListResponse<SegmentClient>>(`${API_URL}/api/crm/segments`, { params }).then(res => res.data),

  getSegment: (id: string) =>
    axios.get<DetailResponse<SegmentClient>>(`${API_URL}/api/crm/segments/${id}`).then(res => res.data),

  createSegment: (data: Partial<SegmentClient>) =>
    axios.post<DetailResponse<SegmentClient>>(`${API_URL}/api/crm/segments`, data).then(res => res.data),

  updateSegment: (id: string, data: Partial<SegmentClient>) =>
    axios.put<DetailResponse<SegmentClient>>(`${API_URL}/api/crm/segments/${id}`, data).then(res => res.data),

  deleteSegment: (id: string) =>
    axios.delete<EmptyResponse>(`${API_URL}/api/crm/segments/${id}`).then(res => res.data),

  refreshSegment: (id: string) =>
    axios.post<DetailResponse<SegmentClient>>(`${API_URL}/api/crm/segments/${id}/refresh`).then(res => res.data),

  getSegmentMembres: (id: string, params?: Record<string, any>) =>
    axios.get<ListResponse<any>>(`${API_URL}/api/crm/segments/${id}/membres`, { params }).then(res => res.data),
};
