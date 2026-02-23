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

const mapContractFromApi = (c: any): Contract => ({
  id: c.id,
  employeeId: c.employeId ?? c.employeeId,
  contractType: c.type ?? c.contractType,
  startDate: c.dateDebut ?? c.startDate,
  endDate: c.dateFin ?? c.endDate,
  salary: Number(c.salaireBase ?? c.salary ?? 0),
  currency: c.devise ?? c.currency ?? 'XOF',
  workHoursPerWeek: c.heuresHebdo ?? c.workHoursPerWeek ?? 40,
  position: c.poste ?? c.position ?? '',
  department: c.departement ?? c.department ?? '',
  status: c.statut ?? c.status ?? 'ACTIF',
  signedDate: c.dateDebut,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
  employee: c.employe
    ? {
        firstName: c.employe.prenom,
        lastName: c.employe.nom,
        matricule: c.employe.matricule,
      }
    : undefined,
});

const mapContractToApi = (c: CreateContractRequest | UpdateContractRequest) => ({
  employeId: (c as any).employeeId ?? c.employeeId,
  type: c.contractType,
  dateDebut: c.startDate,
  dateFin: c.endDate ?? null,
  salaireBase: c.salary,
  devise: c.currency ?? 'XOF',
  heuresHebdo: c.workHoursPerWeek ?? 40,
  poste: c.position,
  departement: c.department,
  statut: (c as any).status ?? 'ACTIF',
});

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
    const payload = response.data?.data ?? response.data;
    const list = payload?.data ?? payload ?? [];
    return {
      success: true,
      data: list.map(mapContractFromApi),
      meta: { pagination: payload?.meta?.pagination },
    };
  },

  async getContract(id: string): Promise<DetailResponse<Contract>> {
    const response = await apiClient.get(`/hr/contracts/${id}`);
    return { success: true, data: mapContractFromApi(response.data?.data || response.data) };
  },

  async getContractsByEmployee(employeeId: string): Promise<ListResponse<Contract>> {
    const response = await apiClient.get(`/hr/employees/${employeeId}/contracts`);
    const list = response.data?.data ?? response.data ?? [];
    return { success: true, data: list.map(mapContractFromApi) };
  },

  async createContract(data: CreateContractRequest): Promise<DetailResponse<Contract>> {
    const payload = mapContractToApi(data);
    const response = await apiClient.post('/hr/contracts', payload);
    return { success: true, data: mapContractFromApi(response.data?.data || response.data) };
  },

  async updateContract(id: string, data: UpdateContractRequest): Promise<DetailResponse<Contract>> {
    const payload = mapContractToApi(data);
    const response = await apiClient.patch(`/hr/contracts/${id}`, payload);
    return { success: true, data: mapContractFromApi(response.data?.data || response.data) };
  },

  async deleteContract(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/hr/contracts/${id}`);
    return response.data;
  },

  async terminateContract(id: string, endDate: string, reason?: string): Promise<DetailResponse<Contract>> {
    const response = await apiClient.patch(`/hr/contracts/${id}`, {
      statut: 'TERMINE',
      dateFin: endDate,
      terminationReason: reason,
    });
    return { success: true, data: mapContractFromApi(response.data?.data || response.data) };
  },

  async downloadContractPdf(id: string): Promise<Blob> {
    const response = await apiClient.get(`/hr/contracts/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
