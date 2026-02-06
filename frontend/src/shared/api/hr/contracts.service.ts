import { apiClient } from '../shared/client';
import { Contract, CreateContractRequest } from './types';

export interface ListResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface DetailResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface UpdateContractRequest {
  contractType?: string;
  startDate?: string;
  endDate?: string;
  salary?: number;
  currency?: string;
  workHoursPerWeek?: number;
  position?: string;
  department?: string;
  status?: string;
}

export const contractsService = {
  async getContracts(params?: {
    page?: number;
    limit?: number;
    employeeId?: string;
    contractType?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Contract>> {
    const response = await apiClient.get('/hr/contracts', { params });
    return response.data;
  },

  async getContract(id: string): Promise<DetailResponse<Contract>> {
    const response = await apiClient.get(`/hr/contracts/${id}`);
    return response.data;
  },

  async getContractsByEmployee(employeeId: string): Promise<ListResponse<Contract>> {
    const response = await apiClient.get(`/hr/employees/${employeeId}/contracts`);
    return response.data;
  },

  async createContract(data: CreateContractRequest): Promise<DetailResponse<Contract>> {
    const response = await apiClient.post('/hr/contracts', data);
    return response.data;
  },

  async updateContract(id: string, data: UpdateContractRequest): Promise<DetailResponse<Contract>> {
    const response = await apiClient.patch(`/hr/contracts/${id}`, data);
    return response.data;
  },

  async deleteContract(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/hr/contracts/${id}`);
    return response.data;
  },

  async terminateContract(id: string, endDate: string, reason?: string): Promise<DetailResponse<Contract>> {
    const response = await apiClient.patch(`/hr/contracts/${id}`, {
      status: 'TERMINE',
      endDate,
      terminationReason: reason,
    });
    return response.data;
  },
};
